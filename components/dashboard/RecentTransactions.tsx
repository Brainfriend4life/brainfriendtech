"use client";

import { useEffect, useState } from "react";


interface Transaction {

  id: string;

  type: string;

  provider: string;

  amount: number;

  status: string;

  createdAt: string;

}




export default function RecentTransactions() {


  const [transactions, setTransactions] =
    useState<Transaction[]>([]);



  const [loading, setLoading] =
    useState(true);




  useEffect(() => {


    async function loadTransactions() {


      try {


        const res =
          await fetch("/api/transactions");


        const data =
          await res.json();



        setTransactions(
          data.slice(0, 5)
        );



      } catch (error) {


        console.error(error);


      } finally {


        setLoading(false);


      }


    }



    loadTransactions();



  }, []);






  return (

    <div className="rounded-2xl bg-white p-6 shadow">


      <h2 className="mb-6 text-2xl font-bold">

        Recent Transactions

      </h2>




      <div className="overflow-x-auto">


        <table className="w-full">


          <thead>


            <tr className="border-b">


              <th className="py-3 text-left">

                Service

              </th>


              <th className="py-3 text-left">

                Amount

              </th>


              <th className="py-3 text-left">

                Status

              </th>


              <th className="py-3 text-left">

                Date

              </th>


            </tr>


          </thead>





          <tbody>



            {loading && (

              <tr>

                <td
                  colSpan={4}
                  className="py-8 text-center"
                >

                  Loading transactions...

                </td>

              </tr>

            )}






            {!loading && transactions.length === 0 && (

              <tr>

                <td
                  colSpan={4}
                  className="py-8 text-center text-gray-500"
                >

                  No transactions yet.

                </td>

              </tr>

            )}







            {transactions.map((tx) => (

              <tr
                key={tx.id}
                className="border-b"
              >


                <td className="py-3">

                  {tx.provider || tx.type}

                </td>




                <td className="py-3">

                  ₦{tx.amount.toLocaleString()}

                </td>





                <td className="py-3">


                  <span
                    className={`
                      rounded-full px-3 py-1 text-sm
                      ${
                        tx.status.toLowerCase() === "failed"
                        ? "bg-red-100 text-red-700"
                        : "bg-green-100 text-green-700"
                      }
                    `}
                  >

                    {tx.status}

                  </span>


                </td>





                <td className="py-3">

                  {new Date(
                    tx.createdAt
                  ).toLocaleDateString()}

                </td>



              </tr>


            ))}




          </tbody>


        </table>


      </div>


    </div>

  );

}