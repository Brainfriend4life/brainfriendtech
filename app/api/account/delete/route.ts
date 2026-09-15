
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: Request) {
  try {
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

    let body: { password?: unknown };

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid request.",
        },
        { status: 400 }
      );
    }

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

    // Admin accounts cannot be deleted from the dashboard.
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

    // Verify the password.
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
        { status: 400 }
      );
    }

    // Do not allow deletion while wallet still contains money.
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

    // Check pending wallet withdrawal.
    const pendingWithdrawal =
      await prisma.withdrawal.findFirst({
        where: {
          userId,
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

    // Check pending referral withdrawal.
    const pendingReferralWithdrawal =
      await prisma.referralWithdrawal.findFirst({
        where: {
          userId,
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

    // Delete account and clean up referral relationships.
    await prisma.$transaction(async (tx) => {
      // Detach users who were referred by this account.
      await tx.user.updateMany({
        where: {
          referredById: userId,
        },
        data: {
          referredById: null,
        },
      });

      // Remove password reset tokens.
      await tx.passwordResetToken.deleteMany({
        where: {
          email: user.email,
        },
      });

      // Delete the account.
      await tx.user.delete({
        where: {
          id: userId,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Your account has been permanently deleted.",
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

