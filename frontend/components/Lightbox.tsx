"use client";

import { useState, useEffect, useCallback } from "react";
import { Photo } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

interface LightboxProps {
  photos: Photo[];
  currentIndex: number;
  onClose: () => void;
}

export default function Lightbox({
  photos,
  currentIndex,
  onClose,
}: LightboxProps) {
  const { t } = useI18n();
  const [index, setIndex] = useState(currentIndex);
  const photo = photos[index];

  const goNext = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setIndex((i) => (i + 1) % photos.length);
    },
    [photos.length]
  );

  const goPrev = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setIndex((i) => (i - 1 + photos.length) % photos.length);
    },
    [photos.length]
  );

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    }
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose, goNext, goPrev]);

  return (
    <div className="lightbox" onClick={onClose}>
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-6 right-8 text-white/60 hover:text-white text-sm tracking-widest uppercase cursor-pointer z-50"
      >
        {t("gallery.close")}
      </button>

      {/* Prev */}
      {photos.length > 1 && (
        <button
          onClick={(e) => goPrev(e)}
          className="absolute left-6 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-3xl cursor-pointer z-50 select-none"
        >
          &lsaquo;
        </button>
      )}

      {/* Image */}
      <div
        className="max-w-[92vw] max-h-[92vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.url}
          alt={photo.title || ""}
          className="max-w-full max-h-[90vh] object-contain select-none"
          draggable={false}
        />
      </div>

      {/* Next */}
      {photos.length > 1 && (
        <button
          onClick={(e) => goNext(e)}
          className="absolute right-6 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-3xl cursor-pointer z-50 select-none"
        >
          &rsaquo;
        </button>
      )}

      {/* Counter */}
      {photos.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/30 text-xs tracking-widest">
          {index + 1} / {photos.length}
        </div>
      )}
    </div>
  );
}
