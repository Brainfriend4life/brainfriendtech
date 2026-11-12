import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveAccount } from "@/lib/paystack";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const accountNumber =
      typeof body?.accountNumber === "string" ? body.accountNumber.trim() : "";
    const bankCode =
      typeof body?.bankCode === "string" ? body.bankCode.trim() : "";

    if (!/^\d{10}$/.test(accountNumber) || !bankCode) {
      return NextResponse.json(
        { error: "Enter a valid bank and 10-digit account number." },
        { status: 400 },
      );
    }

    const result = await resolveAccount(accountNumber, bankCode);
    return NextResponse.json({
      success: true,
      accountName: result.account_name,
    });
  } catch (error) {
    console.error("RESOLVE ACCOUNT ERROR:", error);
    return NextResponse.json(
      {
        error:
          "Could not verify this account. Check the bank and account number.",
      },
      { status: 400 },
    );
  }
}
