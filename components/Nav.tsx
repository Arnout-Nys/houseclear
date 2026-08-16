"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", icon: "🏠", label: "Home" },
  { href: "/add", icon: "📸", label: "Add" },
  { href: "/decide", icon: "⚠️", label: "Decide" },
  { href: "/items?filter=my_work", icon: "👤", label: "Me" }
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="nav" aria-label="Main navigation">
      {items.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href.split("?")[0]);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={active ? "active" : ""}
          >
            <span className="nav-icon" aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
