import PublicShell from "@/app/_components/public-shell";
import { fetchPublicProducts } from "@/lib/public-api";
import ProductsCatalogClient from "./products-catalog.client";

export const metadata = {
  title: "Productos | Jr Digital",
  description: "Catálogo público de software: ver detalles, manuales y descargas.",
};

export default async function ProductsPage() {
  const products = await fetchPublicProducts();

  return (
    <PublicShell active="products">
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <ProductsCatalogClient products={products} />
      </main>
    </PublicShell>
  );
}

