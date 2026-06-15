"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

export const BackButton = () => {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  return (
    <button onClick={handleBack} className="btn btn-ghost btn-circle absolute top-4 left-4" aria-label="Go back">
      <ArrowLeftIcon className="h-6 w-6" />
    </button>
  );
};
