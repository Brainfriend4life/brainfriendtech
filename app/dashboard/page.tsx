import BalanceCard from "@/components/dashboard/BalanceCard";
import QuickActions from "@/components/dashboard/QuickActions";
import RecentTransactions from "@/components/dashboard/RecentTransactions";
import ProfileCard from "@/components/dashboard/ProfileCard";

export default function DashboardPage() {
  return (
    <div className="space-y-8">

      <BalanceCard />

      {/* WhatsApp Group Banner */}
      <a
        href="https://chat.whatsapp.com/HOEQ11RzvZ034U4FhX0GvU"
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full"
      >
        <div className="flex items-center justify-between rounded-2xl bg-green-600 px-5 py-4 text-white shadow-sm transition hover:bg-green-700">

          <div>
            <h3 className="text-lg font-bold sm:text-xl">
              Join Our WhatsApp Group
            </h3>

            <p className="mt-1 text-sm text-green-50 sm:text-base">
              Service updates & announcements
            </p>
          </div>

          <div className="flex items-center gap-3">

            <div className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-white sm:h-14 sm:w-14">
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-8 w-8 sm:h-9 sm:w-9"
              >
                <path d="M20.52 3.48A11.78 11.78 0 0 0 12.05 0C5.5 0 .17 5.32.17 11.88c0 2.09.55 4.13 1.59 5.93L.06 24l6.34-1.66a11.86 11.86 0 0 0 5.65 1.43h.01c6.55 0 11.88-5.33 11.88-11.89 0-3.17-1.24-6.15-3.42-8.4ZM12.06 21.8a9.88 9.88 0 0 1-5.04-1.38l-.36-.21-3.76.99 1-3.67-.23-.38a9.87 9.87 0 0 1-1.51-5.27C2.16 6.42 6.6 1.99 12.06 1.99c2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.9 6.99c0 5.46-4.44 9.92-9.89 9.92Zm5.43-7.43c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.2 5.08 4.49.71.31 1.27.49 1.7.63.72.23 1.38.2 1.9.12.58-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z" />
              </svg>
            </div>

            <span className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-green-600 shadow-sm sm:px-5 sm:text-base">
              Join Now
            </span>

          </div>
        </div>
      </a>

      <QuickActions />

      <RecentTransactions />

      <ProfileCard />

    </div>
  );
}