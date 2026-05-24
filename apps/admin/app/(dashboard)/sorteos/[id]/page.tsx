import { RaffleDetailView } from "./view";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SorteoDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <RaffleDetailView id={id} />;
}
