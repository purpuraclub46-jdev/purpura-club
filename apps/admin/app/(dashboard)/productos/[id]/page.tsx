import { ProductDetailView } from "./view";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductoDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <ProductDetailView id={id} />;
}
