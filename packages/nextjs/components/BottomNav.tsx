"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BoltIcon, GiftIcon, HomeIcon, UserIcon } from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  Icon: typeof HomeIcon;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", Icon: HomeIcon },
  { href: "/claims", label: "Drops", Icon: GiftIcon },
  { href: "/duel", label: "Arena", Icon: BoltIcon },
  { href: "/profile", label: "Profile", Icon: UserIcon },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname() ?? "/";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card">
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2 pt-2.5 pb-4">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1.5 py-1 text-[10px] font-medium tracking-wide transition-colors",
                  active ? "text-foreground" : "text-foreground/50",
                )}
              >
                {/* Square Base motif: active tab is filled Base Blue, inactive is a muted square */}
                <span
                  className={cn(
                    "flex size-[18px] items-center justify-center rounded-[3px]",
                    active ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground",
                  )}
                >
                  <Icon className="size-[14px]" />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default BottomNav;
