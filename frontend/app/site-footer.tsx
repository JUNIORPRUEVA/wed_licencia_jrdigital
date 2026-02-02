"use client";

import { usePathname } from "next/navigation";

export default function SiteFooter({
  whatsappDisplay,
  whatsappLink,
}: {
  whatsappDisplay: string;
  whatsappLink: string;
}) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");
  if (isAdmin) return null;

  return (
    <footer className="border-t border-black/10 bg-white px-6 py-8 text-sm text-zinc-700 dark:border-white/10 dark:bg-black dark:text-zinc-300">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="leading-6">
          <div className="font-medium text-zinc-950 dark:text-zinc-50">Solicitar la app</div>
          <div>
            Para solicitar la app debes escribir a WhatsApp:{" "}
            <span className="font-semibold text-zinc-950 dark:text-zinc-50">
              {whatsappDisplay}
            </span>
          </div>
        </div>

        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center justify-center rounded-full bg-foreground px-5 font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          Escribir por WhatsApp
        </a>
        <a
          href="/admin/login"
          className="text-xs text-zinc-500 opacity-30 transition hover:opacity-80"
        >
          Acceso administrativo
        </a>
      </div>
    </footer>
  );
}
