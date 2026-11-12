import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Resend } from "resend";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "Brainfriend Global Tech <hello@brainfriendglobaltech.com>";
const REPLY_TO = "brainfriendglobaltech@gmail.com";
const CHUNK = 100;

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function render(message: string, name?: string | null): string {
  const body = esc(message)
    .replace(/\{name\}/g, esc(name || "there"))
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");

  return `
  <div style="background:#f4f6f8;padding:24px 0;font-family:Arial,Helvetica,sans-serif">
    <div style="max-width:580px;margin:auto;background:#fff;border-radius:10px;padding:28px;color:#222;line-height:1.6;font-size:15px">
      ${body}
      <p style="margin:24px 0 0;color:#666">Brainfriend Global Tech</p>
    </div>
    <p style="text-align:center;color:#999;font-size:12px;margin-top:14px">
      You are receiving this because you have an account with Brainfriend Global Tech.
    </p>
  </div>`;
}

type BroadcastBody = {
  subject?: string;
  message?: string;
  mode?: "test" | "batch";
  testEmail?: string;
  offset?: number;
};

export async function POST(request: Request) {
  try {
    // Admin check (same as your other admin routes)
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 },
      );
    }

    const {
      subject,
      message,
      mode,
      testEmail,
      offset = 0,
    } = (await request.json()) as BroadcastBody;

    if (!subject?.trim() || !message?.trim()) {
      return NextResponse.json(
        { error: "Subject and message are required" },
        { status: 400 },
      );
    }

    // Send a test to one address
    if (mode === "test") {
      if (!testEmail) {
        return NextResponse.json(
          { error: "Test email required" },
          { status: 400 },
        );
      }

      const { error } = await resend.emails.send({
        from: FROM,
        replyTo: REPLY_TO,
        to: [testEmail],
        subject,
        html: render(message, "Test"),
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    // Send one chunk of real users (ACTIVE only, skips suspended accounts)
    const where = { status: "ACTIVE" as const };

    const total = await prisma.user.count({ where });
    const users = await prisma.user.findMany({
      where,
      select: { email: true, fullName: true },
      orderBy: { id: "asc" }, // stable order so chunks never overlap
      skip: offset,
      take: CHUNK,
    });

    if (users.length > 0) {
      const { error } = await resend.batch.send(
        users.map((u) => ({
          from: FROM,
          replyTo: REPLY_TO,
          to: [u.email],
          subject,
          html: render(message, u.fullName?.split(" ")[0]),
        })),
      );

      if (error) {
        return NextResponse.json(
          { error: error.message, offset },
          { status: 500 },
        );
      }
    }

    const nextOffset = offset + users.length;
    return NextResponse.json({
      sent: users.length,
      nextOffset,
      total,
      done: nextOffset >= total,
    });
  } catch (error) {
    console.error("ADMIN BROADCAST ERROR:", error);
    return NextResponse.json(
      { error: "Unable to send broadcast." },
      { status: 500 },
    );
  }
}
