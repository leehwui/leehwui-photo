"use client";

import { useState, useEffect } from "react";
import Footer from "@/components/Footer";
import GalleryGrid from "@/components/GalleryGrid";
import { useI18n, LanguageSwitcher } from "@/lib/i18n";
import {
  getPhotos,
  getCategories,
  getSiteSettings,
  Photo,
  Category,
  SiteSettings,
} from "@/lib/api";

const DEFAULT_SETTINGS: SiteSettings = {
  site_title: "TANGERINE",
  site_subtitle: "",
  contact_email: "",
  weibo_url: "",
  wechat_id: "",
  xiaohongshu_url: "",
  bilibili_url: "",
  douyin_url: "",
};

export default function Home() {
  const { t } = useI18n();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      const [p, c, s] = await Promise.all([
        getPhotos(),
        getCategories(),
        getSiteSettings(),
      ]);
      setPhotos(p);
      setCategories(c);
      setSettings(s);
    } catch (err) {
      console.error("Failed to load:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCategoryChange(cat: string | null) {
    setActiveCategory(cat);
    setLoading(true);
    try {
      const data = await getPhotos(cat || undefined);
      setPhotos(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Language switcher */}
      <div className="absolute top-6 right-8 z-10">
        <LanguageSwitcher />
      </div>

      {/* Header */}
      <header className="pt-16 pb-12 text-center px-6">
        <h1 className="text-2xl md:text-3xl tracking-[0.35em] uppercase font-light text-neutral-800">
          {settings.site_title}
        </h1>
        {settings.site_subtitle && (
          <p className="mt-3 text-xs tracking-[0.2em] uppercase text-neutral-400 font-light">
            {settings.site_subtitle}
          </p>
        )}
      </header>

      {/* Category Filters */}
      <nav className="text-center px-6 mb-12">
        <div className="flex items-center justify-center gap-6 flex-wrap">
          <button
            onClick={() => handleCategoryChange(null)}
            className={`text-xs tracking-[0.15em] uppercase transition-colors cursor-pointer pb-1 ${
              activeCategory === null
                ? "text-neutral-800 border-b border-neutral-800"
                : "text-neutral-400 hover:text-neutral-700 border-b border-transparent"
            }`}
          >
            {t("gallery.showAll")}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.name)}
              className={`text-xs tracking-[0.15em] uppercase transition-colors cursor-pointer pb-1 ${
                activeCategory === cat.name
                  ? "text-neutral-800 border-b border-neutral-800"
                  : "text-neutral-400 hover:text-neutral-700 border-b border-transparent"
              }`}
            >
              {cat.display_name || cat.name}
            </button>
          ))}
        </div>
      </nav>

      {/* Gallery */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6">
        {loading ? (
          <div className="text-center py-32">
            <div className="inline-block w-5 h-5 border border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
          </div>
        ) : (
          <GalleryGrid photos={photos} />
        )}
      </main>

      {/* Footer */}
      <Footer settings={settings} />
    </div>
  );
}
