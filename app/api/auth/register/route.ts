
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      fullName,
      email,
      phone,
      password,
      referralCode,
    } = body;

    if (
      !fullName ||
      !email ||
      !phone ||
      !password
    ) {
      return NextResponse.json(
        {
          message: "All fields are required",
        },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email)
      .trim()
      .toLowerCase();

    const normalizedFullName = String(fullName).trim();

    const normalizedPhone = String(phone).trim();

    const normalizedReferralCode =
      referralCode
        ? String(referralCode).trim().toUpperCase()
        : null;

    if (password.length < 6) {
      return NextResponse.json(
        {
          message:
            "Password must be at least 6 characters.",
        },
        { status: 400 }
      );
    }

    const existingUser =
      await prisma.user.findFirst({
        where: {
          OR: [
            {
              email: normalizedEmail,
            },
            {
              phone: normalizedPhone,
            },
          ],
        },
      });

    if (existingUser) {
      return NextResponse.json(
        {
          message: "User already exists",
        },
        { status: 409 }
      );
    }

    // Find referrer if referral code was supplied
    let referrerId: string | null = null;

    if (normalizedReferralCode) {
      const referrer =
        await prisma.user.findUnique({
          where: {
            referralCode: normalizedReferralCode,
          },
          select: {
            id: true,
          },
        });

      if (!referrer) {
        return NextResponse.json(
          {
            message: "Invalid referral code.",
          },
          { status: 400 }
        );
      }

      referrerId = referrer.id;
    }

    const hashedPassword =
      await bcrypt.hash(password, 10);

    const verificationToken =
      crypto.randomBytes(32).toString("hex");

    const verificationExpires =
      new Date(
        Date.now() + 30 * 60 * 1000
      );

    // Generate unique referral code
    let generatedReferralCode = "";

    do {
      generatedReferralCode =
        `BF${crypto
          .randomBytes(5)
          .toString("hex")
          .toUpperCase()}`;
    } while (
      await prisma.user.findUnique({
        where: {
          referralCode: generatedReferralCode,
        },
        select: {
          id: true,
        },
      })
    );

    const user =
      await prisma.user.create({
        data: {
          fullName: normalizedFullName,
          email: normalizedEmail,
          phone: normalizedPhone,
          password: hashedPassword,

          walletBalance: 0,
          referralBalance: 0,

          referralCode:
            generatedReferralCode,

          referredById: referrerId,

          emailVerified: true,

          emailVerificationToken:
            verificationToken,

          emailVerificationExpires:
            verificationExpires,
        },

        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          referralCode: true,
          referredById: true,
          emailVerified: true,
        },
      });

    return NextResponse.json(
      {
        success: true,
        message:
          "Account created successfully. You can now log in.",
        email: user.email,
        referralCode: user.referralCode,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("REGISTER ERROR:", error);

    return NextResponse.json(
      {
        message: "Something went wrong",
      },
      { status: 500 }
    );
  }
}

