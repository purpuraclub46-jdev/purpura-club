import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { PageHeader } from "@/shared/ui/page-header";
import { OverviewCards } from "@/features/dashboard/components/overview-cards";
import { UpcomingRaffles } from "@/features/dashboard/components/upcoming-raffles";

export const metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Estado en tiempo real de sorteos, participaciones y pagos."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/sorteos">
                <Sparkles className="size-4" /> Ver sorteos
              </Link>
            </Button>
            <Button asChild>
              <Link href="/sorteos/nuevo">
                <Plus className="size-4" /> Nuevo sorteo
              </Link>
            </Button>
          </>
        }
      />

      <OverviewCards />
      <UpcomingRaffles />
    </>
  );
}
