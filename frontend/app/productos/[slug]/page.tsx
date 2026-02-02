import { redirect } from "next/navigation";

export default async function ProductoRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/products/${encodeURIComponent(slug)}`);
}
