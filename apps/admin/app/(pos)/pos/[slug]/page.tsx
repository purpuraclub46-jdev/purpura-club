import { PosShell } from "@/features/pos/components/pos-shell";
import { PosView } from "@/features/pos/components/pos-view";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function PosLocationPage({ params }: PageProps) {
  const { slug } = await params;
  return (
    <PosShell slug={slug}>
      <PosView slug={slug} />
    </PosShell>
  );
}
