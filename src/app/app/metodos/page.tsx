import { MethodsView } from "@/components/app/methods-view";
import { getMethodsData } from "@/lib/analysis";

export default function MethodsPage() {
  return <MethodsView data={getMethodsData()} />;
}
