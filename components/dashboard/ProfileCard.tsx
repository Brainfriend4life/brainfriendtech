"use client";

import { useSession } from "next-auth/react";

export default function ProfileCard() {
  const { data: session } = useSession();

  return (
    <div className="rounded-2xl border border-border bg-card p-6 text-card-foreground shadow">
      <h2 className="mb-6 text-2xl font-bold text-card-foreground">
        My Profile
      </h2>

      <div className="space-y-3">
        <p className="text-card-foreground">
          <strong className="font-semibold">Name:</strong>{" "}
          {session?.user?.name || "N/A"}
        </p>

        <p className="text-card-foreground">
          <strong className="font-semibold">Email:</strong>{" "}
          {session?.user?.email || "N/A"}
        </p>

        <p className="text-card-foreground">
          <strong className="font-semibold">Role:</strong>{" "}
          {session?.user?.role || "Customer"}
        </p>
      </div>
    </div>
  );
}