import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { vtpassConfig } from "@/lib/vtpass";


export async function GET(req: NextRequest) {

  try {

    const { searchParams } = new URL(req.url);

    const serviceID =
      searchParams.get("serviceID");


    if(!serviceID){

      return NextResponse.json(
        {
          message:"Service ID required"
        },
        {
          status:400
        }
      );

    }



    const response = await axios.get(

      `${vtpassConfig.baseUrl}/service-variations?serviceID=${serviceID}`,

      {

        headers:{

          "api-key":vtpassConfig.apiKey,

          "secret-key":vtpassConfig.secretKey,

          "Content-Type":"application/json"

        }

      }

    );



    console.log(
      "EXAM PLANS:",
      response.data
    );



    return NextResponse.json(
      response.data
    );



  } catch(error:any){

    console.log(
      error.response?.data ||
      error.message
    );


    return NextResponse.json(

      {
        message:"Failed to get exam plans"
      },

      {
        status:500
      }

    );

  }

}