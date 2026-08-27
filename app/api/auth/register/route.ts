
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

    // ==========================================
    // BASIC VALIDATION
    // ==========================================

    if (
      typeof fullName !== "string" ||
      typeof email !== "string" ||
      typeof phone !== "string" ||
      typeof password !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Please provide all required fields.",
        },
        { status: 400 }
      );
    }

    const normalizedFullName = fullName.trim();

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    const normalizedPhone = phone
      .trim()
      .replace(/\s+/g, "");

    const normalizedReferralCode =
      typeof referralCode === "string" &&
      referralCode.trim()
        ? referralCode.trim().toUpperCase()
        : null;

    // ==========================================
    // NAME VALIDATION
    // ==========================================

    if (
      normalizedFullName.length < 2 ||
      normalizedFullName.length > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid full name.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // EMAIL VALIDATION
    // ==========================================

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid email address.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // PHONE VALIDATION
    // ==========================================

    // Accept:
    // 08012345678
    // +2348012345678
    // 2348012345678

    let finalPhone = normalizedPhone;

    if (finalPhone.startsWith("+234")) {
      finalPhone = "0" + finalPhone.slice(4);
    } else if (finalPhone.startsWith("234")) {
      finalPhone = "0" + finalPhone.slice(3);
    }

    if (!/^0\d{10}$/.test(finalPhone)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter a valid Nigerian phone number.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // STRONG PASSWORD VALIDATION
    // ==========================================

    const passwordRequirements = {
      length: password.length >= 6,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    };

    const strongPassword =
      passwordRequirements.length &&
      passwordRequirements.uppercase &&
      passwordRequirements.lowercase &&
      passwordRequirements.number &&
      passwordRequirements.special;

    if (!strongPassword) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Password must be at least 6 characters and contain an uppercase letter, lowercase letter, number and special character.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // CHECK EXISTING USER
    // ==========================================

    const existingUser =
      await prisma.user.findFirst({
        where: {
          OR: [
            {
              email: normalizedEmail,
            },
            {
              phone: finalPhone,
            },
          ],
        },
        select: {
          id: true,
          email: true,
          phone: true,
        },
      });

    if (existingUser) {
      if (existingUser.email === normalizedEmail) {
        return NextResponse.json(
          {
            success: false,
            message:
              "An account with this email already exists.",
          },
          { status: 409 }
        );
      }

      if (existingUser.phone === finalPhone) {
        return NextResponse.json(
          {
            success: false,
            message:
              "An account with this phone number already exists.",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message:
            "An account with these details already exists.",
        },
        { status: 409 }
      );
    }

    // ==========================================
    // FIND REFERRER
    // ==========================================

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
            success: false,
            message: "Invalid referral code.",
          },
          { status: 400 }
        );
      }

      referrerId = referrer.id;
    }

    // ==========================================
    // HASH PASSWORD
    // ==========================================

    const hashedPassword =
      await bcrypt.hash(password, 12);

    // ==========================================
    // EMAIL VERIFICATION TOKEN
    // ==========================================

    const verificationToken =
      crypto.randomBytes(32).toString("hex");

    const verificationExpires = new Date(
      Date.now() + 30 * 60 * 1000
    );

    // ==========================================
    // GENERATE UNIQUE REFERRAL CODE
    // ==========================================

    let generatedReferralCode = "";

    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = `BF${crypto
        .randomBytes(5)
        .toString("hex")
        .toUpperCase()}`;

      const existingReferral =
        await prisma.user.findUnique({
          where: {
            referralCode: candidate,
          },
          select: {
            id: true,
          },
        });

      if (!existingReferral) {
        generatedReferralCode = candidate;
        break;
      }
    }

    if (!generatedReferralCode) {
      console.error(
        "REFERRAL CODE GENERATION FAILED"
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Unable to create your account right now. Please try again.",
        },
        { status: 500 }
      );
    }

    // ==========================================
    // CREATE USER
    // ==========================================

    const user = await prisma.user.create({
      data: {
        fullName: normalizedFullName,
        email: normalizedEmail,
        phone: finalPhone,
        password: hashedPassword,

        walletBalance: 0,
        referralBalance: 0,

        referralCode: generatedReferralCode,
        referredById: referrerId,

        // Keeping your current behavior:
        // users can log in immediately after registration.
        emailVerified: true,

        emailVerificationToken:
          verificationToken,

        emailVerificationExpires:
          verificationExpires,
      },

      select: {
        id: true,
        email: true,
        referralCode: true,
      },
    });

    // ==========================================
    // SUCCESS
    // ==========================================

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
  } catch (error: unknown) {
    console.error("REGISTER ERROR:", error);

    // ==========================================
    // PRISMA UNIQUE CONSTRAINT ERROR
    // ==========================================

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "An account with these details already exists.",
        },
        { status: 409 }
      );
    }

    // ==========================================
    // GENERAL ERROR
    // ==========================================

    return NextResponse.json(
      {
        success: false,
        message:
          "Something went wrong while creating your account. Please try again.",
      },
      { status: 500 }
    );
  }
}

