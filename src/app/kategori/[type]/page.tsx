import { CategoryDetailClient } from "@/components/category/CategoryDetailClient";

type CategoryPageProps = {
  params: Promise<{
    type: string;
  }>;
};

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { type } = await params;

  return <CategoryDetailClient type={type} />;
}
