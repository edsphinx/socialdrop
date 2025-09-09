"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

export const BackButton = () => {
  const router = useRouter();

  const handleBack = () => {
    // router.back() navega a la página anterior en el historial de la aplicación
    router.back();
  };

  return (
    <button onClick={handleBack} className="btn btn-ghost btn-circle absolute top-4 left-4" aria-label="Volver atrás">
      <ArrowLeftIcon className="h-6 w-6" />
    </button>
  );
};
