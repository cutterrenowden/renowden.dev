"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NAV = [{ href: "/photography", label: "Photography" }];

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  // The header is transparent over the top of the page and only earns a
  // hairline once content has passed beneath it.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 bg-paper/80 backdrop-blur-md transition-colors duration-500 ${
        scrolled ? "border-b border-rule" : "border-b border-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-[1800px] items-center justify-between px-6 py-6 md:px-10 md:py-7">
        <Link href="/" className="label link-rule text-ink">
          Cutter Renowden
        </Link>
        <ul className="flex items-center gap-8 md:gap-10">
          {NAV.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                data-active={pathname.startsWith(href)}
                className="label link-rule text-ink-muted transition-colors duration-300 hover:text-ink data-[active=true]:text-ink"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
