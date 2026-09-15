
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: Request) {
  try {
    // ---------------------------------------------------------
    // 1. Check logged-in user
    // ---------------------------------------------------------
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "You must be logged in to delete your account.",
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // ---------------------------------------------------------
    // 2. Get password from request
    // ---------------------------------------------------------
    const body = await req.json();

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    if (!password) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter your password.",
        },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------
    // 3. Get user
    // ---------------------------------------------------------
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
        password: true,
        walletBalance: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Account not found.",
        },
        { status: 404 }
      );
    }

    // ---------------------------------------------------------
    // 4. Do not allow ADMIN accounts to self-delete
    // ---------------------------------------------------------
    if (user.role === "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Admin accounts cannot be deleted from the user dashboard.",
        },
        { status: 403 }
      );
    }

    // ---------------------------------------------------------
    // 5. Verify password
    // ---------------------------------------------------------
    const passwordValid = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordValid) {
      return NextResponse.json(
        {
          success: false,
          message: "Incorrect password.",
        },
        { status: 403 }
      );
    }

    // ---------------------------------------------------------
    // 6. Prevent deletion when wallet still has money
    // ---------------------------------------------------------
    if (
      Number.isFinite(user.walletBalance) &&
      user.walletBalance > 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You cannot delete your account while you have money in your wallet. Please withdraw or use your wallet balance first.",
        },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------
    // 7. Check pending withdrawals
    // ---------------------------------------------------------
    const pendingWithdrawal =
      await prisma.withdrawal.findFirst({
        where: {
          userId: userId,
          status: "PENDING",
        },
        select: {
          id: true,
        },
      });

    if (pendingWithdrawal) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You cannot delete your account while you have a pending withdrawal. Please wait until it has been processed.",
        },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------
    // 8. Check pending referral withdrawals
    // ---------------------------------------------------------
    const pendingReferralWithdrawal =
      await prisma.referralWithdrawal.findFirst({
        where: {
          userId: userId,
          status: "PENDING",
        },
        select: {
          id: true,
        },
      });

    if (pendingReferralWithdrawal) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You cannot delete your account while you have a pending referral withdrawal.",
        },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------
    // 9. Delete account safely
    // ---------------------------------------------------------
    await prisma.$transaction(async (tx) => {
      // Users referred by this account should not keep a
      // broken referredById reference.
      await tx.user.updateMany({
        where: {
          referredById: userId,
        },
        data: {
          referredById: null,
        },
      });

      // Password reset tokens are not connected through a
      // Prisma relation, so remove them manually.
      await tx.passwordResetToken.deleteMany({
        where: {
          email: user.email,
        },
      });

      // Delete the user.
      //
      // Your schema already has onDelete: Cascade on:
      // - Reviews
      // - ReferralEarning
      // - ReferralWithdrawal
      // - Transactions
      // - Withdrawals
      // - ExamPins
      // - CbtAttempts
      // - NinVerifications
      //
      // CbtAnswers are also removed through CbtAttempt cascade.
      await tx.user.delete({
        where: {
          id: userId,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message:
        "Your account has been permanently deleted.",
    });
  } catch (error) {
    console.error("DELETE ACCOUNT ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to delete your account right now. Please try again.",
      },
      { status: 500 }
    );
  }
}

