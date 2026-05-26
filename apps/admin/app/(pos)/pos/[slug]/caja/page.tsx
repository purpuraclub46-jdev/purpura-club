import { CashSessionView } from "@/features/pos/components/cash-session-view";
import { PosShell } from "@/features/pos/components/pos-shell";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function PosCashPage({ params }: PageProps) {
  const { slug } = await params;
  return (
    <PosShell slug={slug}>
      <CashSessionView slug={slug} />
    </PosShell>
  );
}
