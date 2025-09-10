"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Farcaster from "@farcaster/miniapp-sdk";
import { BeakerIcon, ChartBarIcon, GiftIcon, PlusCircleIcon } from "@heroicons/react/24/outline";

type FarcasterUser = Awaited<typeof Farcaster.context>["user"];

const fc = Farcaster;

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<FarcasterUser | null>(null);

  useEffect(() => {
    fc.actions.ready();
    fc.context
      .then(context => {
        if (context?.user) {
          setUser(context.user);
        }
      })
      .catch(err => console.error("Error getting user context:", err))
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return <div className="p-4 text-center text-white">Conectando con Farcaster...</div>;
  }

  if (!user) {
    return (
      <div className="p-8 text-center text-white">
        <h1 className="text-4xl font-bold">Bienvenido a SocialDrop</h1>
        <p className="mt-4">Para usar la app, por favor accede a través de un enlace de campaña en Farcaster.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen p-6 bg-base-300">
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold">SocialDrop</h1>
        {user && <p className="mt-2">Bienvenido, @{user.username}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4 flex-grow">
        <Link
          href="/claims"
          passHref
          className="card bg-base-100 shadow-xl hover:bg-primary transition-all duration-200"
        >
          <div className="card-body justify-center items-center">
            <GiftIcon className="h-12 w-12" />
            <h2 className="card-title text-center">Reclamar NFT</h2>
          </div>
        </Link>

        <Link
          href="/admin/create"
          passHref
          className="card bg-base-100 shadow-xl hover:bg-primary transition-all duration-200"
        >
          <div className="card-body justify-center items-center">
            <PlusCircleIcon className="h-12 w-12" />
            <h2 className="card-title text-center">Crear Campaña</h2>
          </div>
        </Link>

        <Link
          href="/admin"
          passHref
          className="card bg-base-100 shadow-xl hover:bg-primary transition-all duration-200"
        >
          <div className="card-body justify-center items-center">
            <ChartBarIcon className="h-12 w-12" />
            <h2 className="card-title text-center">Ver Campañas</h2>
          </div>
        </Link>

        <div className="card bg-base-100 shadow-xl opacity-50 cursor-not-allowed">
          <div className="card-body justify-center items-center">
            <BeakerIcon className="h-12 w-12" />
            <h2 className="card-title text-center">Duelos (Próximamente)</h2>
          </div>
        </div>
      </div>
    </div>
  );
}
