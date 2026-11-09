import { Presentation } from "@/components/advanced/presentation";
import { getMethodsData } from "@/lib/analysis";

export default function AdvancedPage() {
  return <Presentation data={getMethodsData()} />;
}
