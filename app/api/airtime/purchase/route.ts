import { verifyTransactionPin } from "@/lib/security/verifyTransactionPin";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";


const CHEAPDATAHUB_API_URL =
  "https://www.cheapdatahub.ng/api/v1/resellers/airtime/purchase/";


const REFERRAL_COMMISSION_SETTING_KEY =
  "REFERRAL_COMMISSION_AIRTIME";


const DEFAULT_REFERRAL_COMMISSION_PERCENTAGE = 1;



function generateReference() {
  return `AIRTIME-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase()}`;
}



function normalizePhoneNumber(phone: string) {
  return String(phone)
    .trim()
    .replace(/\s+/g, "")
    .replace(/^\+234/, "0")
    .replace(/^234/, "0");
}



function isValidNigeriaPhone(phone: string) {
  return /^0\d{10}$/.test(phone);
}



export async function POST(request: NextRequest) {


  let transactionId: string | null = null;
  let userId: string | null = null;
  let chargedAmount = 0;


  try {


    // ==========================================
    // 1. AUTHENTICATION
    // ==========================================


    const session = await getServerSession(authOptions);


    if (!session?.user?.id) {

      return NextResponse.json(
        {
          success:false,
          error:"You must be logged in to purchase airtime."
        },
        {
          status:401
        }
      );

    }


    userId = session.user.id;



    // ==========================================
    // 2. REQUEST BODY
    // ==========================================


    const body = await request.json();



    const {
      providerId,
      phoneNumber,
      amount,
      transactionPin

    } = body;



    // ==========================================
    // 3. VALIDATION
    // ==========================================


    if (
      providerId === undefined ||
      providerId === null ||
      !phoneNumber ||
      amount === undefined ||
      amount === null
    ) {


      return NextResponse.json(
        {
          success:false,
          error:
          "providerId, phoneNumber and amount are required."
        },
        {
          status:400
        }
      );


    }



    const numericAmount = Number(amount);



    if (
      !Number.isFinite(numericAmount) ||
      numericAmount < 100
    ) {


      return NextResponse.json(
        {
          success:false,
          error:"Minimum airtime purchase is ₦100."
        },
        {
          status:400
        }
      );


    }



    if(numericAmount > 50000){


      return NextResponse.json(
        {
          success:false,
          error:"Maximum airtime purchase is ₦50,000."
        },
        {
          status:400
        }
      );


    }



    const airtimeAmount = Math.round(numericAmount);



    // ==========================================
    // 4. NORMALIZE PHONE
    // ==========================================


    const cleanedPhone =
      normalizePhoneNumber(phoneNumber);



    if(!isValidNigeriaPhone(cleanedPhone)){


      return NextResponse.json(
        {
          success:false,
          error:
          "Please enter a valid Nigerian phone number."
        },
        {
          status:400
        }
      );


    }




    // ==========================================
    // 5. FIND USER
    // ==========================================


    const user =
      await prisma.user.findUnique({

        where:{
          id:userId
        },


        include:{


          referredBy:{


            select:{


              id:true,
              fullName:true,
              referralCode:true,
              referralBalance:true


            }


          }


        }


      });



    if(!user){


      return NextResponse.json(
        {
          success:false,
          error:"User account could not be found."
        },
        {
          status:404
        }
      );


    }




    // ==========================================
    // 6. TRANSACTION PIN
    // ==========================================


    if(!transactionPin){


      return NextResponse.json(
        {
          success:false,
          error:"Transaction PIN is required."
        },
        {
          status:400
        }
      );


    }



    const pinResult =
      await verifyTransactionPin(
        user.id,
        transactionPin
      );



    if(!pinResult.success){


      return NextResponse.json(
        {
          success:false,
          error:pinResult.message
        },
        {
          status:403
        }
      );


    }



    // ==========================================
    // 7. USER STATUS
    // ==========================================


    if(user.status !== "ACTIVE"){


      return NextResponse.json(
        {
          success:false,
          error:"Your account is not active."
        },
        {
          status:403
        }
      );


    }




    // ==========================================
    // 8. API KEY
    // ==========================================


    const apiKey =
      process.env.CHEAPDATAHUB_API_KEY;



    if(!apiKey){


      console.error(
        "CHEAPDATAHUB_API_KEY missing"
      );


      return NextResponse.json(
        {
          success:false,
          error:"CheapDataHub API key is not configured."
        },
        {
          status:500
        }
      );


    }

    // ==========================================
    // 9. GET REFERRAL COMMISSION SETTING
    // ==========================================


    const referralSetting =
      await prisma.systemSetting.findUnique({

        where:{
          key: REFERRAL_COMMISSION_SETTING_KEY
        }

      });



    let referralPercentage =
      referralSetting?.value
        ? Number(referralSetting.value)
        : DEFAULT_REFERRAL_COMMISSION_PERCENTAGE;



    if(
      !Number.isFinite(referralPercentage) ||
      referralPercentage < 0
    ){

      referralPercentage =
        DEFAULT_REFERRAL_COMMISSION_PERCENTAGE;

    }



    if(referralPercentage > 100){

      referralPercentage = 100;

    }



    // ==========================================
    // 10. TOTAL CHARGE
    // ==========================================


    const totalAmount = airtimeAmount;

    chargedAmount = totalAmount;



    // ==========================================
    // 11. CREATE TRANSACTION
    // ==========================================


    const reference = generateReference();



    const transaction =
      await prisma.transaction.create({

        data:{

          userId:user.id,

          type:"AIRTIME",

          amount:totalAmount,

          description:
          `Airtime purchase of ₦${airtimeAmount} for ${cleanedPhone}`,

          status:"PENDING",

          reference,

          provider:"CheapDataHub",

          cost:airtimeAmount,

          profit:0

        }

      });



    transactionId = transaction.id;




    // ==========================================
    // 12. DEDUCT USER WALLET SAFELY
    // ==========================================


    const walletDebit =
      await prisma.user.updateMany({

        where:{

          id:user.id,

          status:"ACTIVE",

          walletBalance:{
            gte:totalAmount
          }

        },


        data:{

          walletBalance:{
            decrement:totalAmount
          }

        }


      });



    if(walletDebit.count !== 1){


      await prisma.transaction.update({

        where:{
          id:transaction.id
        },


        data:{
          status:"FAILED"
        }


      });



      return NextResponse.json({

        success:false,

        error:"Insufficient wallet balance."

      },
      {
        status:400
      });


    }




    // ==========================================
    // 13. CHEAPDATAHUB REQUEST
    // ==========================================



    const providerRequestBody = {


      provider_id:Number(providerId),


      phone_number:cleanedPhone,


      amount:airtimeAmount


    };



    console.log(
      "======================================"
    );


    console.log(
      "CHEAPDATAHUB AIRTIME REQUEST:",
      providerRequestBody
    );



    const providerResponse =
      await fetch(

        CHEAPDATAHUB_API_URL,


        {

          method:"POST",


          headers:{


            Authorization:
            `Bearer ${apiKey}`,

            "Content-Type":
            "application/json",

            Accept:
            "application/json"


          },


          body:
          JSON.stringify(providerRequestBody),


          cache:"no-store",


          signal:
          AbortSignal.timeout(30000)


        }

      );



    const responseText =
      await providerResponse.text();



    console.log(
      "CHEAPDATAHUB STATUS:",
      providerResponse.status
    );


    console.log(
      "CHEAPDATAHUB RESPONSE:",
      responseText
    );


    console.log(
      "======================================"
    );





    // ==========================================
    // 14. PARSE RESPONSE
    // ==========================================



    let providerResult:any = null;



    try{


      providerResult =
        responseText.trim()
        ? JSON.parse(responseText)
        : null;


    }catch{


      providerResult = null;


    }





    // ==========================================
    // 15. INVALID RESPONSE REFUND
    // ==========================================



    if(!providerResult){


      await prisma.$transaction([


        prisma.user.update({

          where:{
            id:user.id
          },


          data:{

            walletBalance:{
              increment:totalAmount
            }

          }


        }),



        prisma.transaction.update({

          where:{
            id:transaction.id
          },


          data:{

            status:"FAILED",

            cost:0,

            profit:0

          }


        })


      ]);



      return NextResponse.json({

        success:false,

        error:
        "CheapDataHub returned invalid response."

      },
      {
        status:502
      });



    }





    // ==========================================
    // 16. CHECK PROVIDER SUCCESS
    // ==========================================



    const providerStatus =
      providerResult.status;


    // FIX: the previous version had a stray semicolon here which
    // terminated the assignment early, so `providerSuccess` was ONLY
    // ever true when `status` was literally the string "true".
    // Every other success shape (boolean true, "success", "successful")
    // was silently ignored, causing every purchase to be treated as
    // failed and refunded even when CheapDataHub actually delivered it.
    const providerSuccess =
      providerStatus === true ||
      String(providerStatus).toLowerCase() === "true" ||
      String(providerStatus).toLowerCase() === "success" ||
      String(providerStatus).toLowerCase() === "successful";





    // ==========================================
    // 17. PROVIDER FAILED
    // ==========================================



    if(
      !providerResponse.ok ||
      !providerSuccess
    ){



      console.error(

        "CHEAPDATAHUB AIRTIME FAILED:",

        {

          httpStatus:
          providerResponse.status,

          response:
          providerResult,

          request:
          providerRequestBody

        }

      );



      await prisma.$transaction([


        prisma.user.update({

          where:{
            id:user.id
          },


          data:{

            walletBalance:{
              increment:totalAmount
            }

          }


        }),



        prisma.transaction.update({

          where:{
            id:transaction.id
          },


          data:{

            status:"FAILED",

            cost:0,

            profit:0

          }


        })


      ]);




      return NextResponse.json({

        success:false,

        error:

        providerResult?.message ||

        providerResult?.error ||

        "Airtime purchase failed.",


        providerResponse:providerResult,


      },
      {
        status:400
      });



    }

    // ==========================================
    // 18. SUCCESS PROFIT CALCULATION
    // ==========================================


    const actualCost = airtimeAmount;


    const grossProfit =
      Math.round(
        (totalAmount - actualCost) * 100
      ) / 100;



    let referralCommission = 0;



    if(
      user.referredBy &&
      referralPercentage > 0
    ){

      const calculatedCommission =
        Math.round(
          (
            airtimeAmount *
            (referralPercentage / 100)
          ) * 100
        ) / 100;


      referralCommission =
        Math.min(
          calculatedCommission,
          grossProfit
        );

    }



    const actualProfit =
      Math.round(
        (grossProfit - referralCommission) * 100
      ) / 100;



    console.log(
      "AIRTIME PROFIT:",
      {
        amount:totalAmount,
        cost:actualCost,
        grossProfit,
        referralCommission,
        businessProfit:actualProfit
      }
    );





    // ==========================================
    // 19. UPDATE BUSINESS RECORDS
    // ==========================================


    const result =
      await prisma.$transaction(
        async(tx)=>{


          let businessWallet =
            await tx.businessWallet.findUnique({

              where:{
                name:"Brainfriend Global Tech"
              }

            });



          if(!businessWallet){


            businessWallet =
              await tx.businessWallet.create({

                data:{

                  name:"Brainfriend Global Tech",

                  balance:0,

                  totalRevenue:0,

                  totalCost:0,

                  totalProfit:0,

                  withdrawnProfit:0,

                  availableProfit:0

                }

              });


          }



          const newBusinessBalance =
            Number(businessWallet.balance)
            +
            actualProfit;



          const newTotalRevenue =
            Number(businessWallet.totalRevenue)
            +
            totalAmount;



          const newTotalCost =
            Number(businessWallet.totalCost)
            +
            actualCost;



          const newTotalProfit =
            Number(businessWallet.totalProfit)
            +
            actualProfit;



          const newAvailableProfit =
            Number(businessWallet.availableProfit)
            +
            actualProfit;




          // update transaction

          await tx.transaction.update({

            where:{
              id:transaction.id
            },


            data:{


              status:"SUCCESS",


              cost:actualCost,


              profit:actualProfit,


              description:
              `Airtime purchase of ₦${airtimeAmount} for ${cleanedPhone}`


            }


          });





          // update business wallet

          await tx.businessWallet.update({

            where:{
              id:businessWallet.id
            },


            data:{


              balance:newBusinessBalance,


              totalRevenue:newTotalRevenue,


              totalCost:newTotalCost,


              totalProfit:newTotalProfit,


              availableProfit:newAvailableProfit


            }


          });





          // revenue history


          await tx.businessRevenue.create({

            data:{


              transactionId:transaction.id,


              type:"AIRTIME",


              provider:"CheapDataHub",


              amount:totalAmount,


              cost:actualCost,


              profit:actualProfit,


              reference,


              description:
              `Airtime ₦${airtimeAmount} for ${cleanedPhone}`,


              businessWalletId:
              businessWallet.id


            }

          });







          // referral earning


          if(
            user.referredBy &&
            referralCommission > 0
          ){


            await tx.user.update({

              where:{
                id:user.referredBy.id
              },


              data:{


                referralBalance:{
                  increment:referralCommission
                }


              }


            });



            await tx.referralEarning.create({

              data:{


                referrerId:
                user.referredBy.id,


                referredUserId:
                user.id,


                transactionId:
                transaction.id,


                amount:
                referralCommission,


                percentage:
                referralPercentage,


                transactionAmount:
                airtimeAmount,


                type:"AIRTIME",


                status:"SUCCESS",


                description:
                `Referral earning from ${user.fullName}'s airtime purchase`,


                reference:
                `REF-${reference}`


              }


            });


          }






          const updatedUser =
            await tx.user.findUnique({

              where:{
                id:user.id
              },


              select:{


                walletBalance:true,


                referralBalance:true


              }


            });




          return{


            walletBalance:
            Number(
              updatedUser?.walletBalance ?? 0
            ),


            referralBalance:
            Number(
              updatedUser?.referralBalance ?? 0
            ),


            businessBalance:
            newBusinessBalance


          };


        }

      );








    // ==========================================
    // 20. SUCCESS RESPONSE
    // ==========================================



    return NextResponse.json({


      success:true,


      message:
      providerResult.message ||
      "Airtime purchase successful.",


      reference,


      providerReference:
      providerResult.reference ||
      providerResult.transaction_id ||
      providerResult.transactionId ||
      null,


      phoneNumber:cleanedPhone,


      amount:airtimeAmount,


      totalAmount,


      profit:actualProfit,


      grossProfit,


      referralCommission,


      walletBalance:
      result.walletBalance,


      referralBalance:
      result.referralBalance



    });





  } catch(error:any){



    console.error(
      "AIRTIME PURCHASE ERROR:",
      error
    );



    // ==========================================
    // 21. ERROR RECOVERY
    // ==========================================


    if(transactionId){


      try{


        const transaction =
          await prisma.transaction.findUnique({

            where:{
              id:transactionId
            }

          });



        if(
          transaction &&
          transaction.status==="PENDING" &&
          userId &&
          chargedAmount>0
        ){


          await prisma.$transaction([


            prisma.user.update({

              where:{
                id:userId
              },


              data:{


                walletBalance:{
                  increment:chargedAmount
                }


              }


            }),



            prisma.transaction.update({

              where:{
                id:transactionId
              },


              data:{


                status:"FAILED",


                cost:0,


                profit:0


              }


            })


          ]);


        }



      }catch(recoveryError){


        console.error(
          "RECOVERY FAILED:",
          recoveryError
        );


      }


    }





    return NextResponse.json(

      {


        success:false,


        error:
        error?.message ||
        "Airtime purchase failed."


      },


      {
        status:500
      }

    );


  }


}