import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import AdminSidebar from "@/components/admin/AdminSidebar";

type Props = {
  children: React.ReactNode;
};

export default async function AdminLayout({
  children,
}: Props) {
  const session = await getServerSession(authOptions);

  // Not logged in
  if (!session?.user?.email) {
    redirect("/login");
  }

  // Not an admin
  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50 lg:flex">
      {/* ADMIN SIDEBAR */}
      <AdminSidebar />

      {/* MAIN CONTENT */}
      <main className="min-w-0 flex-1 p-4 pt-20 sm:p-6 lg:p-8 lg:pt-8">
        {children}
      </main>
    </div>
  );
}