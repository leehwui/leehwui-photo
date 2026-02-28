"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n, LanguageSwitcher } from "@/lib/i18n";

interface NavbarProps {
  siteTitle?: string;
}

export default function Navbar({ siteTitle = "TANGERINE" }: NavbarProps) {
  const { t } = useI18n();
  const pathname = usePathname();

  const links = [
    { href: "/", label: t("nav.gallery") },
    { href: "/about", label: t("nav.about") },
    { href: "/contact", label: t("nav.contact") },
  ];

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

        {/* Nav links + lang switcher */}
        <div className="flex items-center gap-8">
          {links.map((link) => {
            const isActive = link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-xs tracking-[0.15em] uppercase transition-colors ${
                  isActive
                    ? "text-neutral-800"
                    : "text-neutral-400 hover:text-neutral-700"
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          <div className="w-px h-4 bg-neutral-200" />
          <LanguageSwitcher />
        </div>
      </div>
    </nav>
  );
}
