"use client";

import { useState } from "react";
import { Photo } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import Lightbox from "./Lightbox";

interface GalleryGridProps {
  photos: Photo[];
}

export default function GalleryGrid({ photos }: GalleryGridProps) {
  const { t } = useI18n();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (photos.length === 0) {
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
            style={{ animationDelay: `${idx * 0.04}s`, opacity: 0 }}
            onClick={() => setLightboxIndex(idx)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt={photo.title || ""}
              className="w-full block"
              loading="lazy"
            />
          </div>
        ))}
      </div>

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
