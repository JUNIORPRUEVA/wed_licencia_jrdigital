import Link from "next/link";
import PublicShell from "@/app/_components/public-shell";
import { fetchPublicDemoDownloads } from "@/lib/public-api";

function isExternalUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

export default async function DemoDownloadPage({ searchParams }: { searchParams?: Promise<{ product?: string }> }) {
  const sp = (await searchParams) ?? {};
  const slug = sp.product?.trim() ?? "";
  const downloads = await fetchPublicDemoDownloads();
  const matches = slug ? downloads.filter((d) => d.product?.slug === slug) : [];

  const whatsapp = `https://wa.me/18295344286?text=${encodeURIComponent("Necesito ayuda con la descarga de la demo.")}`;

  return (
    <PublicShell active="products">
      <main className="mx-auto flex max-w-3xl flex-1 items-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="w-full rounded-3xl border border-black/10 bg-white p-8 shadow-xl">
          <h1 className="text-2xl font-semibold text-[#111827]">Descarga de demo</h1>
          <p className="mt-3 text-sm text-[#111827]/70">
            {slug ? (
              <>
                Producto: <span className="font-semibold text-[#111827]">{slug}</span>
              </>
            ) : (
              "Selecciona un producto para descargar su demo."
            )}
          </p>

          {slug && matches.length ? (
            <div className="mt-6 grid gap-3">
              {matches.map((d) => {
                const external = isExternalUrl(d.url);
                return (
                  <div key={d.id} className="flex items-center justify-between gap-3 rounded-2xl border border-black/10 bg-[#F7F7F7] p-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#111827]">{d.platform}</p>
                      <p className="text-xs text-[#111827]/70">Versión {d.version}</p>
                    </div>
                    <a
                      href={d.url}
                      target={external ? "_blank" : undefined}
                      rel={external ? "noopener noreferrer" : undefined}
                      className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-[#F39C12] px-5 text-sm font-semibold text-white transition hover:bg-[#F1C40F]"
                    >
                      Descargar
                    </a>
                  </div>
                );
              })}
            </div>
          ) : slug ? (
            <div className="mt-6 rounded-2xl border border-black/10 bg-[#F7F7F7] p-5 text-sm text-[#111827]/70">
              No hay demos disponibles para este producto todavía.
            </div>
          ) : null}

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/products"
              className="inline-flex h-11 items-center justify-center rounded-full bg-[#1E88E5] px-6 text-sm font-semibold text-white transition hover:bg-[#1976D2]"
            >
              Ver catálogo
            </Link>
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 px-6 text-sm font-semibold text-[#111827] transition hover:border-black/30"
            >
              Contactar soporte
            </a>
          </div>
        </div>
      </main>
    </PublicShell>
  );
}
