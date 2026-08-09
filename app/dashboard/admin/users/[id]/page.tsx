import UserActions from "./UserActions";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminUserDetails({
  params,
}: Props) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: {
      id,
    },
    include: {
      transactions: true,
      cbtAttempts: true,
    },
  });

  if (!user) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          User Details
        </h1>

        <p className="text-sm text-gray-500">
          Manage user account information.
        </p>
      </div>

      {/* PROFILE CARD */}

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">
          {user.fullName}
        </h2>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <p className="text-sm text-gray-500">
              Email
            </p>

            <p className="font-medium">
              {user.email}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Phone
            </p>

            <p className="font-medium">
              {user.phone || "N/A"}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Wallet Balance
            </p>

            <p className="font-bold text-indigo-600">
              ₦
              {Number(user.walletBalance).toLocaleString(
                "en-NG"
              )}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Role
            </p>

            <p className="font-semibold">
              {user.role}
            </p>
          </div>

          {/* STATUS */}

          <div>
            <p className="text-sm text-gray-500">
              Status
            </p>

            <p
              className={`font-semibold ${
                user.status === "SUSPENDED"
                  ? "text-red-600"
                  : "text-green-600"
              }`}
            >
              {user.status}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Transactions
            </p>

            <p className="font-semibold">
              {user.transactions.length}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              CBT Attempts
            </p>

            <p className="font-semibold">
              {user.cbtAttempts.length}
            </p>
          </div>
        </div>
      </div>

      {/* ACTIONS */}

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-bold text-gray-900">
          Actions
        </h2>

        <UserActions
          userId={user.id}
          currentRole={user.role}
          currentStatus={user.status}
        />
      </div>
    </div>
  );
}