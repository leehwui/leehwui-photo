"use client";

import { SiteSettings } from "@/lib/api";

interface FooterProps {
  settings: SiteSettings;
}

export default function Footer({ settings }: FooterProps) {
  return (
    <footer className="mt-32 mb-16 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Divider */}
        <div className="w-12 h-px bg-neutral-300 mx-auto mb-10" />

        {/* Editable footer text (e.g. ICP number) */}
        {settings.footer_text && (
          <p className="text-center text-xs text-neutral-400 tracking-wide mb-3">
            {settings.footer_text}
          </p>
        )}

        {/* Copyright */}
        <p className="text-center text-xs text-neutral-300 tracking-wide">
          {settings.site_title || "TANGERINE"} &copy;{" "}
          <span suppressHydrationWarning>{new Date().getFullYear()}</span>
        </p>
      </div>
    </footer>
  );
}
