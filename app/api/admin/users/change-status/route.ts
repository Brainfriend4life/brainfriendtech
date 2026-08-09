import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }


    // Check admin
    const admin = await prisma.user.findUnique({
      where: {
        email: session.user.email,
      },
    });


    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json(
        {
          error: "Admin access required",
        },
        {
          status: 403,
        }
      );
    }



    const body = await req.json();

    const {
      userId,
      status,
    } = body;



    if (!userId || !status) {
      return NextResponse.json(
        {
          error: "Missing data",
        },
        {
          status: 400,
        }
      );
    }



    if (
      status !== "ACTIVE" &&
      status !== "SUSPENDED"
    ) {
      return NextResponse.json(
        {
          error: "Invalid status",
        },
        {
          status: 400,
        }
      );
    }



    const updatedUser =
      await prisma.user.update({
        where: {
          id: userId,
        },

        data: {
          status,
        },
      });



    return NextResponse.json({
      success: true,
      user: updatedUser,
    });



  } catch (error) {

    console.error(
      "CHANGE STATUS ERROR:",
      error
    );


    return NextResponse.json(
      {
        error:
          "Failed to update user status",
      },
      {
        status: 500,
      }
    );
  }
}