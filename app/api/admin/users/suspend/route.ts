import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "You must be logged in." },
        { status: 401 }
      );
    }

    const admin = await prisma.user.findUnique({
      where: {
        email: session.user.email,
      },
    });

    if (!admin) {
      return NextResponse.json(
        { error: "Admin account not found." },
        { status: 404 }
      );
    }

    if (admin.role !== "ADMIN") {
      return NextResponse.json(
        { error: "You are not authorized to perform this action." },
        { status: 403 }
      );
    }

    const body = await req.json();

    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json(
        { error: "User ID and role are required." },
        { status: 400 }
      );
    }

    if (role !== "ADMIN" && role !== "USER") {
      return NextResponse.json(
        { error: "Invalid role." },
        { status: 400 }
      );
    }

    // Prevent an admin from changing their own role
    if (userId === admin.id) {
      return NextResponse.json(
        { error: "You cannot change your own admin role." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        role,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `User role changed to ${updatedUser.role}.`,
      user: updatedUser,
    });
  } catch (error) {
    console.error("CHANGE ROLE ERROR:", error);

    return NextResponse.json(
      {
        error: "Unable to change user role.",
      },
      {
        status: 500,
      }
    );
  }
}