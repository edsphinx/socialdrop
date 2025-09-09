import React from "react";
import { MiniAppHeader } from "~~/components/MiniAppHeader";

export default function MiniAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="bg-background min-h-screen">
      <div className="flex flex-col min-h-screen bg-background text-white">
        <MiniAppHeader title="Panel de Participante" />
        <main className="flex-grow">{children}</main>
      </div>
    </main>
  );
}
