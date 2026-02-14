"use client";

import { useState, useEffect, useRef } from "react";
import { Photo } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import Lightbox from "./Lightbox";

interface GalleryGridProps {
  photos: Photo[];
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
}

export default function GalleryGrid({
  photos,
  hasMore,
  loading,
  onLoadMore,
}: GalleryGridProps) {
  const { t } = useI18n();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  /* Intersection Observer for infinite scroll */
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          onLoadMore();
        }
      },
      { rootMargin: "400px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore]);

  if (photos.length === 0 && !loading) {
    return (
      <div className="text-center py-32 text-neutral-400 text-sm tracking-wide">
        {t("gallery.empty")}
      </div>
    );
  }

  return (
    <>
      <div className="gallery-grid">
        {photos.map((photo, idx) => (
          <div
            key={photo.id}
            className="gallery-item animate-fade-up cursor-pointer"
            style={{ animationDelay: `${Math.min(idx, 20) * 0.04}s`, opacity: 0 }}
            onClick={() => setLightboxIndex(idx)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt={photo.title || ""}
              loading="lazy"
            />
          </div>
        ))}
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-1" />

      {/* Loading spinner */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block w-5 h-5 border border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
        </div>
      )}

      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}
