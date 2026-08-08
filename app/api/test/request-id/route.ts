import { NextResponse } from "next/server";
import { generateRequestId } from "@/lib/requestId";

export async function GET() {
  return NextResponse.json({
    requestId: generateRequestId(),
  });
}