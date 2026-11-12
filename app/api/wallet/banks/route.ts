import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listBanks } from "@/lib/paystack";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const banks = await listBanks();
    return NextResponse.json({ success: true, banks });
  } catch (error) {
    console.error("BANKS ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Unable to load banks." },
      { status: 500 },
    );
  }
}
