
import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    // Check API key
    if (!process.env.RESEND_API_KEY) {
      console.error("RESEND_API_KEY is missing");

      return NextResponse.json(
        {
          success: false,
          message: "Email service is not configured.",
        },
        { status: 500 }
      );
    }

    // Check email configuration
    if (!process.env.EMAIL_FROM || !process.env.EMAIL_TO) {
      console.error("EMAIL_FROM or EMAIL_TO is missing");

      return NextResponse.json(
        {
          success: false,
          message: "Email configuration is incomplete.",
        },
        { status: 500 }
      );
    }

    // Read request body
    const body = await request.json();

    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim();
    const subject = String(body?.subject || "").trim();
    const message = String(body?.message || "").trim();

    // Validate fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        {
          success: false,
          message: "Please fill in all required fields.",
        },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid email address.",
        },
        { status: 400 }
      );
    }

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_TO,
      replyTo: email,
      subject: `Contact Form: ${subject}`,

      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8" />
            <title>New Contact Message</title>
          </head>

          <body
            style="
              margin: 0;
              padding: 0;
              background: #f3f4f6;
              font-family: Arial, Helvetica, sans-serif;
            "
          >
            <div
              style="
                max-width: 650px;
                margin: 40px auto;
                background: #ffffff;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 4px 20px rgba(0,0,0,0.08);
              "
            >
              <div
                style="
                  background: #4f46e5;
                  padding: 30px;
                  color: #ffffff;
                "
              >
                <h1
                  style="
                    margin: 0;
                    font-size: 24px;
                  "
                >
                  Brainfriend Global Tech
                </h1>

                <p
                  style="
                    margin: 8px 0 0;
                    opacity: 0.9;
                  "
                >
                  New Contact Form Message
                </p>
              </div>

              <div style="padding: 30px;">
                <div style="margin-bottom: 20px;">
                  <strong>Name</strong>

                  <p
                    style="
                      margin: 6px 0 0;
                      color: #4b5563;
                    "
                  >
                    ${escapeHtml(name)}
                  </p>
                </div>

                <div style="margin-bottom: 20px;">
                  <strong>Email</strong>

                  <p
                    style="
                      margin: 6px 0 0;
                      color: #4b5563;
                    "
                  >
                    ${escapeHtml(email)}
                  </p>
                </div>

                <div style="margin-bottom: 20px;">
                  <strong>Subject</strong>

                  <p
                    style="
                      margin: 6px 0 0;
                      color: #4b5563;
                    "
                  >
                    ${escapeHtml(subject)}
                  </p>
                </div>

                <div>
                  <strong>Message</strong>

                  <div
                    style="
                      margin-top: 10px;
                      padding: 16px;
                      background: #f9fafb;
                      border-radius: 10px;
                      color: #374151;
                      line-height: 1.6;
                      white-space: pre-wrap;
                    "
                  >
                    ${escapeHtml(message)}
                  </div>
                </div>
              </div>

              <div
                style="
                  padding: 20px 30px;
                  background: #f9fafb;
                  color: #6b7280;
                  font-size: 13px;
                "
              >
                This message was sent from the Brainfriend Global Tech
                contact form.
              </div>
            </div>
          </body>
        </html>
      `,
    });

    // Resend returned an error
    if (error) {
      console.error("RESEND ERROR:", error);

      return NextResponse.json(
        {
          success: false,
          message: "Unable to send email right now.",
          error:
            process.env.NODE_ENV === "development"
              ? error.message
              : undefined,
        },
        { status: 500 }
      );
    }

    console.log("CONTACT EMAIL SENT:", data?.id);

    return NextResponse.json(
      {
        success: true,
        message: "Your message has been sent successfully.",
        id: data?.id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("CONTACT API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while sending your message.",
      },
      { status: 500 }
    );
  }
}

/**
 * Prevent HTML injection inside the email.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

