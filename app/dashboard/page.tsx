import BalanceCard from "@/components/dashboard/BalanceCard";
import QuickActions from "@/components/dashboard/QuickActions";
import RecentTransactions from "@/components/dashboard/RecentTransactions";
import ProfileCard from "@/components/dashboard/ProfileCard";


export default function DashboardPage() {

  return (

    <div className="space-y-8">


      <BalanceCard />


      <QuickActions />


      <RecentTransactions />



      <ProfileCard />


    </div>

  );

}