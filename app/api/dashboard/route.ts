import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";


export async function GET() {

  try {


    const session =
      await getServerSession(authOptions);



    if (!session?.user?.email) {

      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        {
          status: 401,
        }
      );

    }




    const user =
      await prisma.user.findUnique({

        where: {
          email: session.user.email,
        },

      });




    if (!user) {

      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        {
          status: 404,
        }
      );

    }





    const totalTransactions =
      await prisma.transaction.count({

        where: {
          userId: user.id,
        },

      });





    const successfulTransactions =
      await prisma.transaction.count({

        where: {

          userId: user.id,

          status: {
            in: [
              "SUCCESS",
              "success",
              "delivered",
            ],
          },

        },

      });






    const failedTransactions =
      await prisma.transaction.count({

        where: {

          userId: user.id,

          status: {
            in: [
              "FAILED",
              "failed",
            ],
          },

        },

      });





    return NextResponse.json({

      success: true,

      walletBalance:
        user.walletBalance,


      totalTransactions,

      successfulTransactions,

      failedTransactions,

    });





  } catch (error) {


    console.log(error);


    return NextResponse.json(
      {
        success: false,
        message: "Server error",
      },
      {
        status: 500,
      }
    );

  }

}