import React from "react";
import { MiniAppHeader } from "~~/components/MiniAppHeader";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-background text-white">
      <MiniAppHeader title="Panel de Creador" />
      <main className="flex-grow">{children}</main>
    </div>
  );
}
