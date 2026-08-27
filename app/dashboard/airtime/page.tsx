"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import TransactionPinModal from "@/components/TransactionPinModal";


// Provider IDs confirmed against CheapDataHub's Mobile Networks table:
// 1 = MTN, 2 = Glo, 3 = Airtel, 4 = 9mobile.
const NETWORKS = [
  {
    id: "mtn",
    name: "MTN",
    providerId: 1,
    minimum: 100,
  },
  {
    id: "glo",
    name: "GLO",
    providerId: 2,
    minimum: 100,
  },
  {
    id: "airtel",
    name: "Airtel",
    providerId: 3,
    minimum: 100,
  },
  {
    id: "9mobile",
    name: "9mobile",
    providerId: 4,
    minimum: 100,
  },
];


// ==============================
// NETWORK PREFIX MAP
// ==============================
const NETWORK_PREFIXES: Record<string, string> = {

  // MTN
  "0803":"mtn","0806":"mtn","0813":"mtn","0814":"mtn","0816":"mtn",
  "0810":"mtn","0903":"mtn","0906":"mtn","0913":"mtn","0916":"mtn",
  "0704":"mtn","0706":"mtn",

  // Airtel
  "0802":"airtel","0808":"airtel","0812":"airtel","0701":"airtel",
  "0902":"airtel","0901":"airtel","0904":"airtel","0907":"airtel",
  "0912":"airtel","0911":"airtel",

  // Glo
  "0805":"glo","0807":"glo","0811":"glo","0815":"glo",
  "0905":"glo","0915":"glo","0705":"glo",

  // 9mobile
  "0809":"9mobile","0817":"9mobile","0818":"9mobile",
  "0908":"9mobile","0909":"9mobile",

};



function toLocalFormat(rawPhone: string) {

  const cleaned =
    rawPhone
    .replace(/\s+/g,"")
    .trim();

  if(cleaned.startsWith("+234")){
    return "0" + cleaned.slice(4);
  }

  if(cleaned.startsWith("234")){
    return "0" + cleaned.slice(3);
  }

  return cleaned;

}



function detectNetworkFromPhone(rawPhone: string) {

  const local = toLocalFormat(rawPhone);

  if(!/^0\d{10}$/.test(local)){
    return null;
  }

  const prefix = local.slice(0,4);

  return NETWORK_PREFIXES[prefix] ?? null;

}



export default function AirtimePage() {


  const [serviceID,setServiceID] =
  useState("mtn");


  const [phone,setPhone] =
  useState("");


  const [amount,setAmount] =
  useState("");


  const [loading,setLoading] =
  useState(false);


  const [networkTouched,setNetworkTouched] =
  useState(false);



  const [showPinModal,setShowPinModal] =
  useState(false);



  const selectedNetwork =
  NETWORKS.find(
    (network)=>
    network.id === serviceID
  );


  const detectedNetworkId =
  detectNetworkFromPhone(phone);



  useEffect(()=>{

    if(networkTouched){
      return;
    }

    if(
      detectedNetworkId &&
      detectedNetworkId !== serviceID
    ){

      setServiceID(detectedNetworkId);

    }

  },[detectedNetworkId,networkTouched,serviceID]);



  const handleNetworkChange =
  (value:string) => {

    setNetworkTouched(true);

    setServiceID(value);

  };



  const handlePhoneChange =
  (value:string) => {

    setNetworkTouched(false);

    setPhone(value);

  };





  const validatePurchase = () => {


    const cleanPhone =
    toLocalFormat(phone);



    if(
      !/^0\d{10}$/
      .test(cleanPhone)
    ){

      toast.error(
        "Please enter a valid Nigerian phone number."
      );

      return false;
    }



    const numericAmount =
    Number(amount);



    if(
      !Number.isFinite(numericAmount) ||
      numericAmount <=0
    ){

      toast.error(
        "Please enter a valid amount."
      );

      return false;
    }




    const minimum =
    selectedNetwork?.minimum ?? 100;



    if(
      numericAmount < minimum
    ){

      toast.error(
        `Minimum amount is ₦${minimum}`
      );

      return false;
    }





    if(
      numericAmount > 50000
    ){

      toast.error(
        "Maximum airtime amount is ₦50,000"
      );

      return false;
    }




    if(
      !selectedNetwork?.providerId
    ){

      toast.error(
        "Invalid network selected"
      );

      return false;
    }



    if(
      detectedNetworkId &&
      detectedNetworkId !== serviceID
    ){

      const detectedName =
        NETWORKS.find(
          (network)=>
          network.id === detectedNetworkId
        )?.name ?? detectedNetworkId;

      toast.error(
        `This number looks like ${detectedName}, but ${selectedNetwork?.name} is selected. Please switch the network to ${detectedName}.`
      );

      return false;
    }



    return true;

  };






  const buyAirtime = () => {


    if(!validatePurchase()){
      return;
    }



    setShowPinModal(true);


  };







  const confirmPurchase = async(pin:string)=>{


    const cleanPhone =
    toLocalFormat(phone);



    const numericAmount =
    Number(amount);



    const providerId =
    selectedNetwork?.providerId;



    if(!providerId){
      toast.error(
        "Invalid network"
      );

      return;
    }



    setLoading(true);



    try{


      const response =
      await fetch(
        "/api/airtime/purchase",
        {

          method:"POST",

          headers:{
            "Content-Type":
            "application/json"
          },


       body: JSON.stringify({

  providerId,

  phoneNumber:
  cleanPhone,


  amount:
  Math.round(
    numericAmount
  ),


  transactionPin:
  pin

})

        }
      );



      const data =
      await response.json();




      console.log(
        "AIRTIME RESPONSE:",
        data
      );



      if(
        !response.ok ||
        !data.success
      ){

        toast.error(
          data.error ||
          data.message ||
          "Airtime purchase failed"
        );

        return;
      }






      toast.success(
        data.message ||
        "Airtime purchased successfully"
      );



      setPhone("");

      setAmount("");

      setNetworkTouched(false);



      window.dispatchEvent(
        new Event(
          "walletUpdated"
        )
      );




    }catch(error){


      console.error(
        error
      );


      toast.error(
        "Something went wrong"
      );



    }finally{


      setLoading(false);

    }


  };

  const closePinModal = () => {

    if(loading){
      return;
    }


    setShowPinModal(false);

  };



  const showMismatchWarning =
  Boolean(
    detectedNetworkId &&
    detectedNetworkId !== serviceID
  );



  return (

    <div>


      {/* HEADER */}

      <div className="mb-6">

        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          Buy Airtime
        </h1>


        <p className="mt-1 text-sm text-muted-foreground sm:text-base">
          Purchase airtime quickly and securely.
        </p>

      </div>





      {/* CARD */}


      <div className="w-full max-w-2xl rounded-2xl bg-card p-4 shadow-sm sm:p-6 lg:p-8">


        <div className="space-y-5">



          {/* NETWORK */}


          <div>

            <label className="mb-2 block text-sm font-medium text-foreground">
              Network
            </label>


            <select

              value={serviceID}

              onChange={(e)=>
                handleNetworkChange(
                  e.target.value
                )
              }

              disabled={loading}

              className="w-full rounded-xl border border-border bg-background p-3 text-foreground outline-none"

            >

              {
                NETWORKS.map(
                  (network)=>(

                    <option

                    key={network.id}

                    value={network.id}

                    >

                      {network.name}

                    </option>

                  )
                )
              }


            </select>


          </div>







          {/* PHONE */}


          <div>


            <label className="mb-2 block text-sm font-medium text-foreground">

              Phone Number

            </label>


            <input

              type="tel"

              inputMode="numeric"

              placeholder="08012345678"

              value={phone}

              onChange={(e)=>
                handlePhoneChange(
                  e.target.value
                )
              }

              maxLength={14}

              disabled={loading}

              className="w-full rounded-xl border border-border bg-background p-3 text-foreground outline-none"

            />


            {
              showMismatchWarning
              &&
              (
                <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-400">

                  This looks like a{" "}
                  {
                    NETWORKS.find(
                      (network)=>
                      network.id === detectedNetworkId
                    )?.name
                  }
                  {" "}number. Switch the network above to avoid a failed purchase.

                </p>
              )
            }


          </div>









          {/* AMOUNT */}


          <div>


            <label className="mb-2 block text-sm font-medium text-foreground">

              Amount

            </label>



            <input

              type="number"

              value={amount}

              min={
                selectedNetwork?.minimum ??
                100
              }

              max="50000"

              placeholder="Enter amount"

              onChange={(e)=>
                setAmount(
                  e.target.value
                )
              }


              disabled={loading}


              className="w-full rounded-xl border border-border bg-background p-3 text-foreground outline-none"

            />



            <p className="mt-2 text-xs text-muted-foreground">

              Minimum ₦
              {
                (
                  selectedNetwork?.minimum ??
                  100
                ).toLocaleString()
              }

              .
              Maximum ₦50,000.


            </p>


          </div>









          {/* BUTTON */}



          <button


            type="button"


            onClick={buyAirtime}


            disabled={loading}


            className="w-full rounded-xl bg-indigo-600 p-3.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"


          >

            {
              loading
              ?
              "Processing..."
              :
              "Buy Airtime"
            }


          </button>





        </div>


      </div>


      {/* TRANSACTION PIN MODAL */}

<TransactionPinModal

  open={showPinModal}

  onClose={closePinModal}

  onSuccess={(pin)=>{

    setShowPinModal(false);

    confirmPurchase(pin);

  }}

/>



    </div>

  );

}