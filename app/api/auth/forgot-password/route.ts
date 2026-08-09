import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          message: "Email address is required.",
        },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    /*
     * Don't reveal whether an email exists.
     */
    if (!user) {
      return NextResponse.json({
        success: true,
        message:
          "If an account exists with this email, a password reset link will be sent.",
      });
    }

    /*
     * Generate secure reset token
     */
    const resetToken = crypto.randomBytes(32).toString("hex");

    /*
     * Token expires in 30 minutes
     */
    const resetExpires = new Date(
      Date.now() + 30 * 60 * 1000
    );

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetExpires,
      },
    });

    /*
     * Create reset URL
     */
    const resetUrl =
      `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`;

    /*
     * Send reset email
     */
    const { error } = await resend.emails.send({
      from:
        process.env.EMAIL_FROM ||
        "onboarding@resend.dev",

      to: normalizedEmail,

      subject: "Reset Your Brainfriend VTU Password",

      html: `
        <div style="font-family: Arial, sans-serif; background:#f5f7ff; padding:40px 20px;">
          <div style="max-width:600px; margin:auto; background:white; border-radius:16px; padding:35px;">

            <h1 style="color:#4f46e5; margin-bottom:10px;">
              Brainfriend VTU
            </h1>

            <h2 style="color:#111827;">
              Password Reset Request
            </h2>

            <p style="color:#4b5563; font-size:15px; line-height:1.6;">
              Hello ${user.fullName},
            </p>

            <p style="color:#4b5563; font-size:15px; line-height:1.6;">
              We received a request to reset the password
              for your Brainfriend VTU account.
            </p>

            <p style="color:#4b5563; font-size:15px; line-height:1.6;">
              Click the button below to create a new password.
              This link will expire in 30 minutes.
            </p>

            <div style="margin:30px 0;">
              <a
                href="${resetUrl}"
                style="
                  display:inline-block;
                  background:#4f46e5;
                  color:white;
                  padding:14px 24px;
                  border-radius:8px;
                  text-decoration:none;
                  font-weight:bold;
                "
              >
                Reset My Password
              </a>
            </div>

            <p style="color:#6b7280; font-size:13px; line-height:1.6;">
              If you did not request a password reset, you can safely
              ignore this email.
            </p>

            <p style="color:#6b7280; font-size:13px;">
              For your security, never share this reset link with anyone.
            </p>

            <hr style="border:none; border-top:1px solid #e5e7eb; margin:30px 0;" />

            <p style="color:#9ca3af; font-size:12px;">
              © ${new Date().getFullYear()} Brainfriend VTU.
              All rights reserved.
            </p>

          </div>
        </div>
      `,
    });

    if (error) {
      console.error("RESEND EMAIL ERROR:", error);

      return NextResponse.json(
        {
          success: false,
          message: "Unable to send password reset email.",
        },
        { status: 500 }
      );
    }

    console.log("PASSWORD RESET EMAIL SENT TO:", normalizedEmail);

    return NextResponse.json({
      success: true,
      message:
        "If an account exists with this email, a password reset link will be sent.",
    });
  } catch (error) {
    console.error("FORGOT PASSWORD ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to process password reset request.",
      },
      { status: 500 }
    );
  }
}