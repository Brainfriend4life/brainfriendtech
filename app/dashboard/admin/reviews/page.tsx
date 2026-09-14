import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // adjust to your actual NextAuth config path
import { Role } from "@prisma/client";
import ReviewQueueClient from "./ReviewQueueClient";

// File location: app/admin/reviews/page.tsx
//
// Server component: gates access before anything renders, so a
// non-admin never even receives the client bundle for this page.

export default async function AdminReviewsPage() {
  const session = await getServerSession(authOptions);
  const isAdmin =
    !!session?.user && (session.user as { role?: Role }).role === Role.ADMIN;

  if (!isAdmin) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50 transition-colors dark:bg-gray-950">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
          Review Queue
        </h1>
        <ReviewQueueClient />
      </div>
    </div>
  );
}