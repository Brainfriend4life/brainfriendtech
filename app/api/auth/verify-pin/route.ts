import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";


export async function POST(
  request: Request
) {
  try {

    const session =
      await getServerSession(authOptions);


    if (!session?.user?.email) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized"
        },
        {
          status: 401
        }
      );
    }


    const { pin } =
      await request.json();


    if (
      !pin ||
      typeof pin !== "string" ||
      pin.length !== 4
    ) {
      return NextResponse.json(
        {
          success:false,
          error:
          "Invalid transaction PIN format"
        },
        {
          status:400
        }
      );
    }



    const user =
      await prisma.user.findUnique({
        where:{
          email:
          session.user.email
        }
      });



    if (!user) {
      return NextResponse.json(
        {
          success:false,
          error:"User not found"
        },
        {
          status:404
        }
      );
    }



    // CHECK IF PIN IS ENABLED

    if (
      !user.transactionPinEnabled ||
      !user.transactionPinHash
    ) {
      return NextResponse.json(
        {
          success:false,
          error:
          "Transaction PIN is not set"
        },
        {
          status:400
        }
      );
    }



    // CHECK LOCK

    if (
      user.transactionPinLockedUntil &&
      user.transactionPinLockedUntil >
      new Date()
    ) {

      return NextResponse.json(
        {
          success:false,
          error:
          "Transaction PIN temporarily locked. Try again later."
        },
        {
          status:403
        }
      );

    }



    const correct =
      await bcrypt.compare(
        pin,
        user.transactionPinHash
      );



    if (!correct) {


      const attempts =
        user.transactionPinAttempts + 1;


      let lockedUntil = null;


      if (attempts >= 5) {

        lockedUntil =
          new Date(
            Date.now() +
            15 * 60 * 1000
          );

      }



      await prisma.user.update({

        where:{
          id:user.id
        },

        data:{
          transactionPinAttempts:
            attempts,

          transactionPinLockedUntil:
            lockedUntil
        }

      });



      return NextResponse.json(
        {
          success:false,
          error:
          "Incorrect transaction PIN"
        },
        {
          status:401
        }
      );

    }




    // SUCCESS RESET ATTEMPTS


    await prisma.user.update({

      where:{
        id:user.id
      },

      data:{

        transactionPinAttempts:0,

        transactionPinLockedUntil:null,

        lastTransactionPinCheck:
        new Date()

      }

    });



    return NextResponse.json({

      success:true,

      message:
      "Transaction PIN verified"

    });



  } catch(error){

    console.error(
      "VERIFY PIN ERROR:",
      error
    );


    return NextResponse.json(
      {
        success:false,
        error:
        "Something went wrong"
      },
      {
        status:500
      }
    );

  }
}