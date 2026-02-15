"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Photo, trackPhotoView, trackPhotoDownload } from "@/lib/api";
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
  const trackedIds = useRef<Set<string>>(new Set());

  /* Track view when photo changes */
  useEffect(() => {
    if (photo && !trackedIds.current.has(photo.id)) {
      trackedIds.current.add(photo.id);
      trackPhotoView(photo.id);
    }
  }, [photo]);

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

  const handleDownload = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      trackPhotoDownload(photo.id);
      // Open image in new tab for download
      const link = document.createElement("a");
      link.href = photo.url;
      link.download = photo.title || photo.filename || "photo";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    [photo]
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

  /* Build metadata items */
  const metaItems: { label: string; value: string }[] = [];
  if (photo.camera_model) {
    const cam = photo.camera_make
      ? `${photo.camera_make} ${photo.camera_model}`
      : photo.camera_model;
    metaItems.push({ label: "Camera", value: cam });
  }
  if (photo.focal_length) metaItems.push({ label: "Focal", value: `${photo.focal_length}mm` });
  if (photo.aperture) metaItems.push({ label: "Aperture", value: `ƒ/${photo.aperture}` });
  if (photo.shutter_speed) metaItems.push({ label: "Shutter", value: `${photo.shutter_speed}s` });
  if (photo.iso) metaItems.push({ label: "ISO", value: `${photo.iso}` });

  const hasMetadata = metaItems.length > 0;
  const hasTitle = !!photo.title;
  const showInfoBar = hasTitle || hasMetadata;

  return (
    <div className="lightbox" onClick={onClose}>
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-6 right-8 text-white/60 hover:text-white text-sm tracking-widest uppercase cursor-pointer z-50"
      >
        {t("gallery.close")}
      </button>

      {/* Download */}
      <button
        onClick={handleDownload}
        className="absolute top-6 right-24 text-white/40 hover:text-white cursor-pointer z-50"
        title="Download"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
        </svg>
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
        className={`max-w-[92vw] flex items-center justify-center ${showInfoBar ? "max-h-[82vh]" : "max-h-[92vh]"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.url}
          alt={photo.title || ""}
          className={`max-w-full object-contain select-none ${showInfoBar ? "max-h-[78vh]" : "max-h-[90vh]"}`}
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

      {/* Bottom info bar: title + metadata + counter */}
      <div
        className="absolute bottom-0 left-0 right-0 px-6 py-4 bg-gradient-to-t from-black/70 to-transparent"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="max-w-4xl mx-auto flex items-end justify-between gap-4">
          {/* Left: title + metadata */}
          <div className="min-w-0 flex-1">
            {hasTitle && (
              <p className="text-white/90 text-sm font-light tracking-wide truncate mb-1">
                {photo.title}
              </p>
            )}
            {hasMetadata && (
              <div className="flex items-center gap-3 flex-wrap">
                {metaItems.map((item) => (
                  <span
                    key={item.label}
                    className="text-white/50 text-[11px] tracking-wide"
                  >
                    <span className="text-white/30">{item.label}</span>{" "}
                    {item.value}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Right: counter */}
          {photos.length > 1 && (
            <span className="text-white/30 text-xs tracking-widest whitespace-nowrap">
              {index + 1} / {photos.length}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
