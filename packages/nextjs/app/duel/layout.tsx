import React from "react";
import { MiniAppHeader } from "~~/components/MiniAppHeader";

export default function DuelsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-background text-white">
      <MiniAppHeader title="Arena de Duelos" />
      <main className="flex-grow">{children}</main>
    </div>
  );
}
