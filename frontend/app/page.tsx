"use client";

import { useState, useEffect, useCallback } from "react";
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

const PAGE_SIZE = 20;

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
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  /* Initial load */
  useEffect(() => {
    loadInitial();
  }, []);

  async function loadInitial() {
    try {
      const [photosRes, c, s] = await Promise.all([
        getPhotos(undefined, 0, PAGE_SIZE),
        getCategories(),
        getSiteSettings(),
      ]);
      setPhotos(photosRes.items);
      setTotal(photosRes.total);
      setCategories(c);
      setSettings(s);
    } catch (err) {
      console.error("Failed to load:", err);
    } finally {
      setLoading(false);
    }
  }

  /* Category switch — reset to first page */
  async function handleCategoryChange(cat: string | null) {
    setActiveCategory(cat);
    setLoading(true);
    setPhotos([]);
    try {
      const data = await getPhotos(cat || undefined, 0, PAGE_SIZE);
      setPhotos(data.items);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  /* Load more — triggered by infinite scroll */
  const handleLoadMore = useCallback(async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await getPhotos(
        activeCategory || undefined,
        photos.length,
        PAGE_SIZE
      );
      setPhotos((prev) => [...prev, ...data.items]);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  }, [activeCategory, photos.length, loadingMore]);

  const hasMore = photos.length < total;

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
      <main className="flex-1 w-full mx-auto px-2 sm:px-4 lg:px-6 max-w-7xl">
        {loading ? (
          <div className="text-center py-32">
            <div className="inline-block w-5 h-5 border border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
          </div>
        ) : (
          <GalleryGrid
            photos={photos}
            hasMore={hasMore}
            loading={loadingMore}
            onLoadMore={handleLoadMore}
          />
        )}
      </main>

      {/* Footer */}
      <Footer settings={settings} />
    </div>
  );
}
