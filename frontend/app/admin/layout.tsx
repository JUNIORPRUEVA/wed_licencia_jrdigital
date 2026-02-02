import type { ReactNode } from "react";

export const metadata = {
  title: "FULLTECH | Admin",
  description: "Backoffice de licenciamiento",
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      {children}
    </div>
  );
}
