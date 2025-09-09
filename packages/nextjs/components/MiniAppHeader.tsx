"use client";

import { BackButton } from "./BackButton";

export const MiniAppHeader = ({ title }: { title: string }) => {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between p-4 bg-base-200 border-b border-base-300 h-16">
      <div className="w-1/6 flex justify-start">
        <BackButton />
      </div>

      <h1 className="text-xl font-bold text-center flex-grow truncate">{title}</h1>

      <div className="w-1/6"></div>
    </header>
  );
};
