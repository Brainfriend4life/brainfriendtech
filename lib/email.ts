import { Resend } from "resend";

const resend = new Resend(
  process.env.RESEND_API_KEY
);

type VerificationEmailProps = {
  email: string;
  fullName: string;
  token: string;
};

export async function sendVerificationEmail({
  email,
  fullName,
  token,
}: VerificationEmailProps) {
  const appUrl =
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";

  const verificationUrl =
    `${appUrl}/verify-email?token=${encodeURIComponent(
      token
    )}`;

  const { data, error } =
    await resend.emails.send({
      from:
        process.env.EMAIL_FROM ||
        "Brainfriend Tech <onboarding@resend.dev>",

      to: email,

      subject:
        "Verify your Brainfriend Tech account",

      html: `
        <div style="
          font-family: Arial, sans-serif;
          max-width: 600px;
          margin: 0 auto;
          padding: 30px;
          background: #f8fafc;
        ">

          <div style="
            background: #4f46e5;
            padding: 25px;
            border-radius: 15px 15px 0 0;
            text-align: center;
            color: white;
          ">

            <h1 style="margin: 0;">
              Brainfriend Tech
            </h1>

            <p style="margin: 8px 0 0;">
              Learn. Build. Grow.
            </p>

          </div>

          <div style="
            background: white;
            padding: 30px;
            border-radius: 0 0 15px 15px;
          ">

            <h2>
              Hello ${escapeHtml(fullName)} 👋
            </h2>

            <p>
              Thanks for creating your Brainfriend Tech account.
            </p>

            <p>
              Please verify your email address by
              clicking the button below.
            </p>

            <div style="
              text-align: center;
              margin: 30px 0;
            ">

              <a
                href="${verificationUrl}"
                style="
                  display: inline-block;
                  background: #4f46e5;
                  color: white;
                  padding: 14px 25px;
                  border-radius: 8px;
                  text-decoration: none;
                  font-weight: bold;
                "
              >
                Verify My Email
              </a>

            </div>

            <p style="
              color: #64748b;
              font-size: 14px;
            ">
              This verification link will expire
              in 30 minutes.
            </p>

            <p style="
              color: #64748b;
              font-size: 14px;
            ">
              If you did not create this account,
              you can safely ignore this email.
            </p>

          </div>

        </div>
      `,
    });

  if (error) {
    console.error(
      "VERIFICATION EMAIL ERROR:",
      error
    );

    throw new Error(
      "Failed to send verification email."
    );
  }

  return data;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}