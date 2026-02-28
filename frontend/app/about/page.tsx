"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useI18n } from "@/lib/i18n";
import { getSiteSettings, SiteSettings } from "@/lib/api";

const DEFAULT_SETTINGS: SiteSettings = {
  site_title: "TANGERINE",
  site_subtitle: "",
  contact_email: "",
  weibo_url: "",
  wechat_id: "",
  xiaohongshu_url: "",
  bilibili_url: "",
  douyin_url: "",
  footer_text: "",
};

export default function AboutPage() {
  const { t } = useI18n();
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    getSiteSettings().then(setSettings).catch(console.error);
  }, []);

  const specialties = [
    { key: "about.street" as const, icon: "🏙️" },
    { key: "about.skyline" as const, icon: "🌆" },
    { key: "about.landscape" as const, icon: "🏔️" },
    { key: "about.sports" as const, icon: "⚡" },
    { key: "about.portraiture" as const, icon: "📷" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar siteTitle={settings.site_title} />

      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-start">
          {/* Photo */}
          <div className="aspect-[3/4] overflow-hidden bg-neutral-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/about-photo.jpg"
              alt="Photographer"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Bio */}
          <div className="flex flex-col justify-center">
            <h1 className="text-lg tracking-[0.2em] uppercase font-light text-neutral-800 mb-8">
              {t("about.title")}
            </h1>

            <p className="text-sm leading-7 text-neutral-600 font-light mb-10">
              {t("about.bio")}
            </p>

            {/* Specialties */}
            <div>
              <h2 className="text-xs tracking-[0.2em] uppercase text-neutral-400 mb-5">
                {t("about.specialties")}
              </h2>
              <div className="flex flex-wrap gap-3">
                {specialties.map((s) => (
                  <span
                    key={s.key}
                    className="px-4 py-2 border border-neutral-200 text-xs tracking-wide text-neutral-600"
                  >
                    {s.icon} {t(s.key)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer settings={settings} />
    </div>
  );
}
