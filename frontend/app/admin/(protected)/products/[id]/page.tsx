import ProductAssetsClient from "./product-assets.client";

export default async function ProductAssetsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductAssetsClient productId={id} />;
}

