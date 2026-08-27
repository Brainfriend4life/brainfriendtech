import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { Resend } from "resend";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const resend = new Resend(
  process.env.RESEND_API_KEY
);

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(
      authOptions
    );

    if (!session?.user?.email) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const email = session.user.email
      .trim()
      .toLowerCase();

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found.",
        },
        { status: 404 }
      );
    }

    /*
     * Generate a 6-digit OTP.
     */

    const otp = crypto
      .randomInt(100000, 1000000)
      .toString();

    /*
     * OTP expires after 10 minutes.
     */

    const otpExpires = new Date(
      Date.now() + 10 * 60 * 1000
    );

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        transactionPinResetOtp: otp,
        transactionPinResetOtpExpires:
          otpExpires,
        transactionPinResetAttempts: 0,
      },
    });

    const { error } =
      await resend.emails.send({
        from:
          process.env.EMAIL_FROM ||
          "onboarding@resend.dev",

        to: user.email,

        subject:
          "Brainfriend Transaction PIN Reset OTP",

        html: `
          <div style="
            font-family:Arial,sans-serif;
            background:#f5f7ff;
            padding:40px 20px;
          ">

            <div style="
              max-width:600px;
              margin:auto;
              background:white;
              border-radius:18px;
              padding:35px;
              box-shadow:0 10px 30px rgba(0,0,0,0.05);
            ">

              <h1 style="
                color:#4f46e5;
                margin:0 0 8px;
              ">
                Brainfriend
              </h1>

              <p style="
                color:#6b7280;
                margin-top:0;
              ">
                Global Tech
              </p>

              <h2 style="
                color:#111827;
                margin-top:30px;
              ">
                Transaction PIN Reset
              </h2>

              <p style="
                color:#4b5563;
                font-size:15px;
                line-height:1.7;
              ">
                Hello ${user.fullName},
              </p>

              <p style="
                color:#4b5563;
                font-size:15px;
                line-height:1.7;
              ">
                We received a request to reset the
                transaction PIN on your Brainfriend
                Global Tech account.
              </p>

              <p style="
                color:#4b5563;
                font-size:15px;
                line-height:1.7;
              ">
                Enter the verification code below
                on the Security page:
              </p>

              <div style="
                margin:30px 0;
                text-align:center;
              ">

                <div style="
                  display:inline-block;
                  background:#eef2ff;
                  color:#4f46e5;
                  padding:18px 30px;
                  border-radius:12px;
                  font-size:32px;
                  font-weight:bold;
                  letter-spacing:8px;
                ">
                  ${otp}
                </div>

              </div>

              <p style="
                color:#6b7280;
                font-size:13px;
                line-height:1.6;
              ">
                This OTP expires in 10 minutes.
              </p>

              <p style="
                color:#6b7280;
                font-size:13px;
                line-height:1.6;
              ">
                If you did not request this reset,
                please secure your account immediately.
              </p>

              <hr style="
                border:none;
                border-top:1px solid #e5e7eb;
                margin:30px 0;
              " />

              <p style="
                color:#9ca3af;
                font-size:12px;
              ">
                © ${new Date().getFullYear()}
                Brainfriend Global Tech.
                All rights reserved.
              </p>

            </div>

          </div>
        `,
      });

    if (error) {
      console.error(
        "TRANSACTION PIN OTP EMAIL ERROR:",
        error
      );

      /*
       * Remove OTP if email delivery failed.
       */

      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          transactionPinResetOtp: null,
          transactionPinResetOtpExpires: null,
          transactionPinResetAttempts: 0,
        },
      });

      return NextResponse.json(
        {
          success: false,
          message:
            "Unable to send verification code. Please try again.",
        },
        { status: 500 }
      );
    }

    console.log(
      "TRANSACTION PIN RESET OTP SENT TO:",
      user.email
    );

    return NextResponse.json({
      success: true,
      message:
        "A verification code has been sent to your registered email address.",
    });
  } catch (error) {
    console.error(
      "REQUEST TRANSACTION PIN RESET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to process PIN reset request.",
      },
      { status: 500 }
    );
  }
}