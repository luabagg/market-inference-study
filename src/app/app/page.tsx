import { Dashboard } from "@/components/app/dashboard";
import { getDashboardData } from "@/lib/analysis";

export default function DashboardPage() {
  return <Dashboard data={getDashboardData()} />;
}
