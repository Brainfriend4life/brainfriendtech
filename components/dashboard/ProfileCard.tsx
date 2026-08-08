"use client";

import { useSession } from "next-auth/react";

export default function ProfileCard() {

  const { data: session } = useSession();


  return (

    <div className="rounded-2xl bg-white p-6 shadow">


      <h2 className="mb-6 text-2xl font-bold">

        My Profile

      </h2>



      <div className="space-y-3">


        <p>

          <strong>Name:</strong>{" "}

          {session?.user?.name || "N/A"}

        </p>



        <p>

          <strong>Email:</strong>{" "}

          {session?.user?.email || "N/A"}

        </p>




        <p>

          <strong>Role:</strong>{" "}

          {session?.user?.role || "Customer"}

        </p>



      </div>


    </div>

  );

}