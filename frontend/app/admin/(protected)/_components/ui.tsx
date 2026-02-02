"use client";

import type { ReactNode } from "react";
import clsx from "clsx";

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-b border-zinc-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 sm:text-2xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-zinc-600">{subtitle}</p> : null}
      </div>
      {right ? <div className="flex items-center gap-2">{right}</div> : null}
    </div>
  );
}

export function Card({ title, subtitle, children }: { title?: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      {title ? (
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
          {subtitle ? <p className="mt-1 text-xs text-zinc-500">{subtitle}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="text-xs font-medium text-zinc-700">{children}</label>;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        "h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-900",
        props.className
      )}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={clsx(
        "w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-900",
        props.className
      )}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={clsx(
        "h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-900",
        props.className
      )}
    />
  );
}

export function Button({
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  const base = "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:opacity-60";
  const styles =
    variant === "primary"
      ? "bg-zinc-900 text-white hover:bg-zinc-800"
      : variant === "danger"
        ? "bg-red-600 text-white hover:bg-red-500"
        : variant === "ghost"
          ? "bg-transparent text-zinc-900 hover:bg-zinc-100"
          : "border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50";
  return <button {...props} className={clsx(base, styles, props.className)} />;
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "green" | "red" | "amber" | "blue" }) {
  const cls =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : tone === "red"
        ? "bg-red-50 text-red-700 ring-red-100"
        : tone === "amber"
          ? "bg-amber-50 text-amber-800 ring-amber-100"
          : tone === "blue"
            ? "bg-blue-50 text-blue-700 ring-blue-100"
            : "bg-zinc-50 text-zinc-700 ring-zinc-100";
  return <span className={clsx("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1", cls)}>{children}</span>;
}

