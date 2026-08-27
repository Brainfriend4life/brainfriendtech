import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";


export async function verifyTransactionPin(
  userId: string,
  pin: string
) {

  if (!userId || !pin) {

    return {
      success: false,
      message: "User ID and transaction PIN are required.",
    };

  }


  const user = await prisma.user.findUnique({

    where: {
      id: userId,
    },

    select: {

      transactionPinHash: true,

    },

  });



  if (!user?.transactionPinHash) {

    return {
      success: false,
      message: "Transaction PIN has not been set.",
    };

  }



  const isValid = await bcrypt.compare(

    pin,

    user.transactionPinHash

  );



  if (!isValid) {

    return {
      success: false,
      message: "Invalid transaction PIN.",
    };

  }



  return {

    success: true,
    message: "Transaction PIN verified successfully.",

  };

}