import Link from "next/link";
import PublicShell from "@/app/_components/public-shell";

export default function ProductNotFound() {
  return (
    <PublicShell active="products">
      <main className="mx-auto flex max-w-3xl flex-1 items-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="w-full rounded-3xl border border-black/10 bg-white p-8 text-center shadow-xl">
          <h1 className="text-2xl font-semibold text-[#111827]">Producto no encontrado</h1>
          <p className="mt-3 text-sm text-[#111827]/70">
            El producto solicitado no existe o no está publicado.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/products"
              className="inline-flex h-11 items-center justify-center rounded-full bg-[#1E88E5] px-6 text-sm font-semibold text-white transition hover:bg-[#1976D2]"
            >
              Ver catálogo
            </Link>
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 px-6 text-sm font-semibold text-[#111827] transition hover:border-black/30"
            >
              Ir al inicio
            </Link>
          </div>
        </div>
      </main>
    </PublicShell>
  );
}

