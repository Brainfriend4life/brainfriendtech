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
    } = body;

    // -----------------------------
    // VALIDATION
    // -----------------------------

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

    const normalizedFullName =
      String(fullName).trim();

    const normalizedPhone =
      String(phone).trim();

    if (password.length < 6) {
      return NextResponse.json(
        {
          message:
            "Password must be at least 6 characters.",
        },
        { status: 400 }
      );
    }

    // -----------------------------
    // CHECK EXISTING USER
    // -----------------------------

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

    // -----------------------------
    // HASH PASSWORD
    // -----------------------------

    const hashedPassword =
      await bcrypt.hash(password, 10);

    // -----------------------------
    // OPTIONAL VERIFICATION TOKEN
    //
    // We keep generating these so the
    // verification system can be enabled
    // later without changing the database.
    // -----------------------------

    const verificationToken =
      crypto.randomBytes(32).toString("hex");

    const verificationExpires =
      new Date(
        Date.now() +
          30 * 60 * 1000
      );

    // -----------------------------
    // CREATE USER
    // -----------------------------

    const user =
      await prisma.user.create({
        data: {
          fullName:
            normalizedFullName,

          email:
            normalizedEmail,

          phone:
            normalizedPhone,

          password:
            hashedPassword,

          // Email verification is
          // temporarily disabled.
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
          emailVerified: true,
        },
      });

    // -----------------------------
    // SUCCESS
    // -----------------------------

    return NextResponse.json(
      {
        success: true,

        message:
          "Account created successfully. You can now log in.",

        email: user.email,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "REGISTER ERROR:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Something went wrong",
      },
      { status: 500 }
    );
  }
}