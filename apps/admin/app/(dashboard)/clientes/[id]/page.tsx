import { CustomerDetailView } from "@/features/customers/components/customer-detail-view";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClienteDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <CustomerDetailView id={id} />;
}
