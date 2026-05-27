import { HomeStoreDetailView } from "./view";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function HomeStoreDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <HomeStoreDetailView id={id} />;
}
