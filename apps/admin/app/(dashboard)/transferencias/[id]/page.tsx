import { TransferDetailView } from "./view";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TransferenciaDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <TransferDetailView id={id} />;
}
