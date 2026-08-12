
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 403 }
      );
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      return NextResponse.json(
        {
          success: false,
          message: "PAYSTACK_SECRET_KEY is not configured.",
        },
        { status: 500 }
      );
    }

    const response = await fetch(
      "https://api.paystack.co/bank?country=nigeria&currency=NGN&perPage=100",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok || !data.status) {
      return NextResponse.json(
        {
          success: false,
          message:
            data.message ||
            "Unable to load Nigerian banks from Paystack.",
        },
        { status: 400 }
      );
    }

    const banks = Array.isArray(data.data)
      ? data.data
          .filter(
            (bank: any) =>
              bank.code &&
              bank.name
          )
          .map((bank: any) => ({
            name: bank.name,
            code: bank.code,
          }))
          .sort((a: any, b: any) =>
            a.name.localeCompare(b.name)
          )
      : [];

    return NextResponse.json({
      success: true,
      banks,
    });
  } catch (error) {
    console.error("PAYSTACK BANK LIST ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load banks.",
      },
      { status: 500 }
    );
  }
}

