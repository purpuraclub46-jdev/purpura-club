import { OrderDetailView } from "./view";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PedidoDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <OrderDetailView id={id} />;
}
