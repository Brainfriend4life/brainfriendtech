
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { serviceID, smartCard } = body;

    if (!serviceID || !smartCard) {
      return NextResponse.json(
        {
          success: false,
          message: "Cable provider and IUC number are required.",
        },
        { status: 400 }
      );
    }

    /*
      CheapDataHub's cable API documentation provided to us
      does NOT include a cable verification endpoint.

      Therefore, we cannot perform a real IUC verification here.

      The actual IUC/card number will be validated by the
      CheapDataHub cable purchase endpoint.
    */

    return NextResponse.json({
      success: true,
      verified: true,
      message:
        "IUC number accepted. The decoder will be validated when the subscription is processed.",
      data: {
        content: {
          Customer_Name: "Customer",
          cardnumber: smartCard,
        },
      },
    });
  } catch (error) {
    console.error("CABLE VERIFY ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to process IUC number.",
      },
      { status: 500 }
    );
  }
}

