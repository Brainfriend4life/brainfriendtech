"use client";

import { useEffect, useState } from "react";
import Link from "next/link";


export default function WalletPage() {

  const [balance, setBalance] = useState(0);


  async function fetchWallet() {

    try {

      const res = await fetch(
        "/api/wallet"
      );


      const data = await res.json();


      setBalance(
        data.walletBalance || 0
      );


    } catch (error) {

      console.log(
        "Wallet fetch error:",
        error
      );

    }

  }



  useEffect(() => {

    fetchWallet();


    window.addEventListener(
      "walletUpdated",
      fetchWallet
    );


    return () => {

      window.removeEventListener(
        "walletUpdated",
        fetchWallet
      );

    };


  }, []);




  return (

    <div className="space-y-6">


      <h1 className="text-3xl font-bold">
        Wallet
      </h1>



      <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white shadow-lg">


        <p className="text-lg">
          Available Balance
        </p>



        <h2 className="mt-2 text-5xl font-bold">

          ₦
          {balance.toLocaleString(
            "en-NG",
            {
              minimumFractionDigits: 2,
            }
          )}

        </h2>




        <Link href="/dashboard/wallet/fund">

          <button className="mt-8 rounded-lg bg-white px-6 py-3 font-semibold text-indigo-700 transition hover:bg-gray-100">

            Fund Wallet

          </button>

        </Link>



      </div>


    </div>

  );

}