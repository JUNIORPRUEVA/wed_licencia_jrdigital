import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import PublicShell from "@/app/_components/public-shell";
import { fetchPublicProduct, type PublicProduct } from "@/lib/public-api";

function formatBytes(size?: number | null) {
  if (!size || size <= 0) return null;
  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function isExternalUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

function videoEmbed(url: string) {
  const u = url.trim();
  if (!u) return null;

  if (/youtube\.com|youtu\.be/i.test(u)) {
    const id = u.includes("youtu.be/")
      ? u.split("youtu.be/")[1]?.split(/[?&#]/)[0]
      : (() => {
          try {
            return new URL(u).searchParams.get("v") ?? "";
          } catch {
            return "";
          }
        })();
    if (!id) return null;
    return `https://www.youtube.com/embed/${id}`;
  }

  if (/vimeo\.com/i.test(u)) {
    const m = u.match(/vimeo\.com\/(\d+)/i);
    if (!m?.[1]) return null;
    return `https://player.vimeo.com/video/${m[1]}`;
  }

  return null;
}

function money(priceCents: number | undefined, currency: string | undefined) {
  if (!priceCents) return "Precio a medida";
  return `${(priceCents / 100).toFixed(2)} ${currency ?? "USD"}`;
}

function heroImage(product: PublicProduct) {
  return product.images?.[0] ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchPublicProduct(slug);
  if (!product) return { title: "Producto no encontrado | Jr Digital" };
  return { title: `${product.name} | Jr Digital`, description: product.shortDescription };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await fetchPublicProduct(slug);
  if (!product) notFound();

  const downloads = (product.assets ?? []).filter((a) => a?.url);
  const hasDownloads = downloads.length > 0;
  const gallery = (product.images ?? []).slice(1);
  const hasGallery = gallery.length > 0;

  const embed = product.promoVideoUrl ? videoEmbed(product.promoVideoUrl) : null;
  const hasVideo = Boolean(embed) || Boolean(product.promoVideoUrl);
  const hasManual = Boolean(product.manualFileUrl);

  const faqItems = Array.isArray(product.faq) ? product.faq.filter((x) => x?.q && x?.a) : [];
  const hasFaq = faqItems.length > 0;

  const whatsapp = `https://wa.me/18295344286?text=${encodeURIComponent(
    `Estoy interesado en ${product.name}. Quiero información de licencias y una demo.`
  )}`;

  return (
    <PublicShell active="products">
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-xl sm:p-8">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#111827]/60">Producto</p>
              <h1 className="mt-3 text-3xl font-bold leading-tight text-[#111827] sm:text-4xl">{product.name}</h1>
              <p className="mt-3 text-base text-[#111827]/75">{product.shortDescription}</p>

              <div className="mt-6 flex flex-wrap items-center gap-2 text-sm text-[#111827]/70">
                <span className="rounded-full bg-black/5 px-3 py-1 font-semibold">v{product.currentVersion ?? "1.0.0"}</span>
                <span className="rounded-full bg-black/5 px-3 py-1 font-semibold">{money(product.priceCents, product.currency)}</span>
                {product.demoAvailable ? (
                  <span className="rounded-full bg-[#F39C12]/15 px-3 py-1 font-semibold text-[#B45309] ring-1 ring-[#F39C12]/25">Demo</span>
                ) : null}
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                {hasDownloads ? (
                  <a href="#downloads" className="inline-flex h-11 items-center justify-center rounded-full bg-[#1E88E5] px-6 text-sm font-semibold text-white transition hover:bg-[#1976D2]">
                    Descargar
                  </a>
                ) : product.demoAvailable ? (
                  <a
                    href={`/demo-download?product=${encodeURIComponent(product.slug)}`}
                    className="inline-flex h-11 items-center justify-center rounded-full bg-[#F39C12] px-6 text-sm font-semibold text-white transition hover:bg-[#F1C40F]"
                  >
                    Descargar demo
                  </a>
                ) : (
                  <a
                    href={whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-11 items-center justify-center rounded-full bg-[#F39C12] px-6 text-sm font-semibold text-white transition hover:bg-[#F1C40F]"
                  >
                    Solicitar demo
                  </a>
                )}

                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 px-6 text-sm font-semibold text-[#111827] transition hover:border-black/30"
                >
                  Hablar por WhatsApp
                </a>
              </div>

              {product.features?.length ? (
                <section className="mt-8">
                  <h2 className="text-lg font-semibold text-[#111827]">Características</h2>
                  <ul className="mt-3 grid gap-2 text-sm text-[#111827]/75 sm:grid-cols-2">
                    {product.features.slice(0, 12).map((f, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#1E88E5]" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>

            <div>
              {heroImage(product) ? (
                <div className="overflow-hidden rounded-3xl border border-black/10 bg-[#F7F7F7]">
                  <Image src={heroImage(product)!} alt={product.name} width={960} height={720} className="h-full w-full object-cover" priority />
                </div>
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center rounded-3xl border border-black/10 bg-[#F7F7F7] text-sm text-[#111827]/60">
                  Sin imágenes
                </div>
              )}
            </div>
          </div>

          {product.longDescription ? (
            <section className="mt-10">
              <h2 className="text-xl font-semibold text-[#111827]">Descripción</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#111827]/75">{product.longDescription}</p>
            </section>
          ) : null}

          {hasGallery ? (
            <section className="mt-10">
              <h2 className="text-xl font-semibold text-[#111827]">Galería</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {gallery.map((src, i) => (
                  <div key={`${src}-${i}`} className="overflow-hidden rounded-3xl border border-black/10 bg-[#F7F7F7]">
                    <Image src={src} alt={`${product.name} imagen ${i + 1}`} width={900} height={650} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {hasVideo ? (
            <section className="mt-10">
              <h2 className="text-xl font-semibold text-[#111827]">Video</h2>
              <div className="mt-4 overflow-hidden rounded-3xl border border-black/10 bg-black">
                {embed ? (
                  <iframe
                    className="aspect-video w-full"
                    src={embed}
                    title={`${product.name} video`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                ) : product.promoVideoUrl ? (
                  <video className="w-full" controls src={product.promoVideoUrl} />
                ) : null}
              </div>
            </section>
          ) : null}

          <section id="downloads" className="mt-10 scroll-mt-24">
            <h2 className="text-xl font-semibold text-[#111827]">Descargas</h2>

            {!hasDownloads ? (
              <div className="mt-4 rounded-3xl border border-black/10 bg-[#F7F7F7] p-6 text-sm text-[#111827]/70">Descargas disponibles próximamente.</div>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {downloads.map((a) => {
                  const size = formatBytes(a.fileSize ?? null);
                  const external = isExternalUrl(a.url);
                  return (
                    <div key={a.id} className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#111827]">{a.platform}</p>
                          <p className="mt-1 text-xs text-[#111827]/70">
                            Versión {a.version}
                            {size ? ` • ${size}` : ""}
                            {a.isDemo ? " • Demo" : ""}
                          </p>
                        </div>
                        <a
                          href={a.url}
                          target={external ? "_blank" : undefined}
                          rel={external ? "noopener noreferrer" : undefined}
                          className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-[#1E88E5] px-4 text-sm font-semibold text-white transition hover:bg-[#1976D2]"
                        >
                          Descargar
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {hasManual ? (
            <section className="mt-10">
              <h2 className="text-xl font-semibold text-[#111827]">Manual de usuario</h2>
              <div className="mt-4 rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-[#111827]/75">Descarga el manual en PDF.</p>
                  <a
                    href={product.manualFileUrl!}
                    target={isExternalUrl(product.manualFileUrl!) ? "_blank" : undefined}
                    rel={isExternalUrl(product.manualFileUrl!) ? "noopener noreferrer" : undefined}
                    className="inline-flex h-10 items-center justify-center rounded-full bg-[#111827] px-4 text-sm font-semibold text-white transition hover:bg-black"
                  >
                    Descargar PDF
                  </a>
                </div>
              </div>
            </section>
          ) : null}

          {hasFaq ? (
            <section className="mt-10">
              <h2 className="text-xl font-semibold text-[#111827]">FAQ</h2>
              <div className="mt-4 space-y-3">
                {faqItems.map((item, i) => (
                  <details key={i} className="group rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
                    <summary className="cursor-pointer list-none text-sm font-semibold text-[#111827]">
                      <span className="mr-2 inline-block transition group-open:rotate-90">›</span>
                      {item.q}
                    </summary>
                    <p className="mt-3 text-sm leading-6 text-[#111827]/75">{item.a}</p>
                  </details>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <section className="mt-8 rounded-3xl bg-gradient-to-r from-[#1E88E5] via-[#2E2E2E] to-[#2E2E2E] px-6 py-10 text-center text-white shadow-2xl sm:px-10">
          <h2 className="text-2xl font-semibold">¿Quieres una demo guiada o una cotización?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-white/80">Te ayudamos con instalación, licencias y configuración inicial.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-full bg-[#F39C12] px-7 text-sm font-semibold text-white transition hover:bg-[#F1C40F]"
            >
              Hablar por WhatsApp
            </a>
            <Link href="/#contacto" className="inline-flex h-11 items-center justify-center rounded-full border border-white/30 px-7 text-sm font-semibold text-white transition hover:border-white/60">
              Ver contacto
            </Link>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
