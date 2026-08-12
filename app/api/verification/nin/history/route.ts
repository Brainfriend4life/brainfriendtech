import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session =
      await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: "You must be logged in.",
        },
        { status: 401 }
      );
    }

    const records =
      await prisma.ninVerification.findMany({
        where: {
          userId: session.user.id,
        },

        orderBy: {
          createdAt: "desc",
        },

        take: 50,
      });

    return NextResponse.json({
      success: true,

      data: records,
    });
  } catch (error) {
    console.error(
      "NIN HISTORY ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to retrieve NIN verification history.",
      },
      { status: 500 }
    );
  }
}