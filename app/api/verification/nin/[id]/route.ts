import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
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

    const { id } =
      await context.params;

    const verification =
      await prisma.ninVerification.findFirst({
        where: {
          id,

          userId:
            session.user.id,
        },
      });

    if (!verification) {
      return NextResponse.json(
        {
          success: false,
          error:
            "NIN verification not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,

      data: verification,
    });
  } catch (error) {
    console.error(
      "NIN DETAILS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to retrieve NIN verification.",
      },
      { status: 500 }
    );
  }
}