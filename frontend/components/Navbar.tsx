"use client";

import { useState, useEffect, startTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n, LanguageSwitcher } from "@/lib/i18n";

interface NavbarProps {
  siteTitle?: string;
}

export default function Navbar({ siteTitle = "TANGERINE" }: NavbarProps) {
  const { t } = useI18n();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close menu on route change
  useEffect(() => {
    startTransition(() => setMenuOpen(false));
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const links = [
    { href: "/", label: t("nav.gallery") },
    { href: "/about", label: t("nav.about") },
    { href: "/contact", label: t("nav.contact") },
  ];

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-neutral-100">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">

        {/* Site title */}
        <Link
          href="/"
          className="text-sm tracking-[0.3em] uppercase font-light text-neutral-800 hover:text-neutral-600 transition-colors"
        >
          {siteTitle}
        </Link>

        {/* ── Desktop nav (md+) ── */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-xs tracking-[0.15em] uppercase transition-colors ${
                isActive(link.href)
                  ? "text-neutral-800"
                  : "text-neutral-400 hover:text-neutral-700"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="w-px h-4 bg-neutral-200" />
          <LanguageSwitcher />
        </div>

        {/* ── Mobile right: lang switcher + hamburger ── */}
        <div className="flex md:hidden items-center gap-4">
          <LanguageSwitcher />
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="w-8 h-8 flex flex-col items-center justify-center gap-[5px] text-neutral-600 cursor-pointer"
          >
            {/* Three bars that animate to X */}
            <span
              className={`block w-5 h-px bg-current origin-center transition-all duration-300 ${
                menuOpen ? "translate-y-[6px] rotate-45" : ""
              }`}
            />
            <span
              className={`block w-5 h-px bg-current transition-all duration-300 ${
                menuOpen ? "opacity-0 scale-x-0" : ""
              }`}
            />
            <span
              className={`block w-5 h-px bg-current origin-center transition-all duration-300 ${
                menuOpen ? "-translate-y-[6px] -rotate-45" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* ── Mobile dropdown ── */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          menuOpen ? "max-h-64 border-b border-neutral-100" : "max-h-0"
        }`}
      >
        <div className="bg-white/95 backdrop-blur-sm px-6 pb-6 pt-2 flex flex-col gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`py-3 text-xs tracking-[0.2em] uppercase border-b border-neutral-50 last:border-0 transition-colors ${
                isActive(link.href)
                  ? "text-neutral-800"
                  : "text-neutral-400 active:text-neutral-800"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
