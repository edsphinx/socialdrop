"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

type BackButtonProps = {
  href?: string;
  className?: string;
};

export const BackButton = ({ href, className }: BackButtonProps = {}) => {
  const router = useRouter();

  const baseClasses = cn(
    "inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={baseClasses} aria-label="Go back">
        <ChevronLeftIcon className="h-5 w-5" />
      </Link>
    );
  }

  return (
    <button type="button" onClick={() => router.back()} className={baseClasses} aria-label="Go back">
      <ChevronLeftIcon className="h-5 w-5" />
    </button>
  );
};
