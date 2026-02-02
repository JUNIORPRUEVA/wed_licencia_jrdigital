import type { ReactNode } from "react";
import PublicHeader from "./public-header";

export default function PublicShell({
  active,
  children,
}: {
  active?: "home" | "products";
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-[#F7F7F7] text-[#111827]">
      <PublicHeader active={active} />
      {children}
    </div>
  );
}

