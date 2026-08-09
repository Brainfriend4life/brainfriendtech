
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    console.log("EXAM PINS SESSION:", session?.user?.email);

    if (!session?.user?.email) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        email: session.user.email,
      },
      select: {
        id: true,
        email: true,
      },
    });

    console.log("EXAM PINS USER:", user);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 }
      );
    }

    const pins = await prisma.examPin.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        provider: true,
        pin: true,
        serial: true,
        amount: true,
        reference: true,
        createdAt: true,
      },
    });

    console.log(
      "EXAM PINS FOUND:",
      pins
    );

    return NextResponse.json({
      success: true,
      pins,
    });
  } catch (error: any) {
    console.error(
      "EXAM PINS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to load exam PINs",
      },
      { status: 500 }
    );
  }
}

