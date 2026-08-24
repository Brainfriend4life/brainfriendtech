"use client";

import {
  Users,
  Search,
  Gift,
  Wallet,
  UserPlus,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type ReferralUser = {
  id: string;
  fullName: string | null;
  email: string;
  phone: string | null;
  referralCode: string | null;
  referralBalance: number;
  walletBalance: number;
  referredUsers: number;
  earningsCount: number;
  createdAt: string;
};

function formatMoney(value: number) {
  return `₦${value.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function ReferralUsersPage() {
  const [users, setUsers] = useState<ReferralUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function loadUsers() {
    try {
      setLoading(true);

      const response = await fetch(
        "/api/admin/referral/users",
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Unable to load referral users."
        );
      }

      setUsers(data.users || []);
    } catch (error) {
      console.error(
        "LOAD REFERRAL USERS ERROR:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return users;

    return users.filter((user) =>
      [
        user.fullName,
        user.email,
        user.phone,
        user.referralCode,
      ]
        .filter(Boolean)
        .some((item) =>
          String(item)
            .toLowerCase()
            .includes(value)
        )
    );
  }, [users, search]);

  const totalReferrers = users.length;

  const totalReferred = users.reduce(
    (sum, user) => sum + user.referredUsers,
    0
  );

  const totalReferralBalance = users.reduce(
    (sum, user) =>
      sum + user.referralBalance,
    0
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div className="pl-14 lg:pl-0">
        <p className="text-sm font-semibold text-indigo-600">
          Referral System
        </p>

        <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">
          Referral Users
        </h1>

        <p className="mt-2 text-sm text-gray-500 sm:text-base">
          Monitor users participating in the
          Brainfriend referral program.
        </p>
      </div>

      {/* STATISTICS */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100">
            <Users className="h-5 w-5 text-indigo-600" />
          </div>

          <p className="mt-4 text-sm text-gray-500">
            Referral Users
          </p>

          <p className="mt-1 text-2xl font-bold text-gray-900">
            {totalReferrers}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100">
            <UserPlus className="h-5 w-5 text-green-600" />
          </div>

          <p className="mt-4 text-sm text-gray-500">
            Referred Users
          </p>

          <p className="mt-1 text-2xl font-bold text-gray-900">
            {totalReferred}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100">
            <Gift className="h-5 w-5 text-purple-600" />
          </div>

          <p className="mt-4 text-sm text-gray-500">
            Available Referral Earnings
          </p>

          <p className="mt-1 text-2xl font-bold text-gray-900">
            {formatMoney(totalReferralBalance)}
          </p>
        </div>
      </div>

      {/* SEARCH */}

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search by name, email, phone or referral code..."
            className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
          />
        </div>
      </div>

      {/* TABLE */}

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-500">
            Loading referral users...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-10 text-center">
            <Gift className="mx-auto h-10 w-10 text-gray-300" />

            <p className="mt-3 font-semibold text-gray-900">
              No referral users found
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Referral users will appear here when
              users invite others.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[950px] w-full">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr className="text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                  <th className="px-5 py-4">
                    User
                  </th>

                  <th className="px-5 py-4">
                    Referral Code
                  </th>

                  <th className="px-5 py-4">
                    Referrals
                  </th>

                  <th className="px-5 py-4">
                    Referral Balance
                  </th>

                  <th className="px-5 py-4">
                    Wallet
                  </th>

                  <th className="px-5 py-4">
                    Joined
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="transition hover:bg-gray-50"
                  >
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {user.fullName ||
                            "Unnamed User"}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {user.email}
                        </p>

                        {user.phone && (
                          <p className="mt-0.5 text-xs text-gray-400">
                            {user.phone}
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700">
                        {user.referralCode ||
                          "N/A"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span className="font-bold text-gray-900">
                        {user.referredUsers}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span className="font-bold text-green-600">
                        {formatMoney(
                          user.referralBalance
                        )}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-gray-400" />

                        <span className="font-semibold text-gray-700">
                          {formatMoney(
                            user.walletBalance
                          )}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm text-gray-500">
                      {new Date(
                        user.createdAt
                      ).toLocaleDateString(
                        "en-NG"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}