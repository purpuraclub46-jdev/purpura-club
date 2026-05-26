import { PosShell } from "@/features/pos/components/pos-shell";
import { ReturnsView } from "@/features/pos-returns/components/returns-view";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function PosReturnsPage({ params }: PageProps) {
  const { slug } = await params;
  return (
    <PosShell slug={slug}>
      <ReturnsView slug={slug} />
    </PosShell>
  );
}
