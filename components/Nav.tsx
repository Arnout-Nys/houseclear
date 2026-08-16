"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", icon: "🏠", label: "Overzicht" },
  { href: "/add", icon: "📸", label: "Toevoegen" },
  { href: "/decide", icon: "⚠️", label: "Beslissen" }
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="nav" aria-label="Hoofdnavigatie">
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} className={active ? "active" : ""}>
            <span className="nav-icon" aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
