"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useI18n, LanguageSwitcher } from "@/lib/i18n";
import {
  login,
  logout,
  isLoggedIn,
  getPhotos,
  getCategories,
  getSiteSettings,
  uploadPhoto,
  deletePhoto,
  updatePhoto,
  updateSettings,
  createCategory,
  deleteCategory,
  Photo,
  Category,
  SiteSettings,
} from "@/lib/api";

/* ── Preview item for staged files ── */
interface FilePreview {
  file: File;
  preview: string; // object URL
}

export default function AdminPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [authed, setAuthed] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "photos" | "categories" | "settings"
  >("photos");

  // Upload state
  const [filePreviews, setFilePreviews] = useState<FilePreview[]>([]);
  const [uploadCategory, setUploadCategory] = useState("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag state
  const [dragging, setDragging] = useState(false);
  const dragCounter = useRef(0);

  // Category form
  const [newCatName, setNewCatName] = useState("");
  const [newCatDisplay, setNewCatDisplay] = useState("");

  // Edit modal
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const photosPerPage = 12;

  useEffect(() => {
    if (isLoggedIn()) {
      setAuthed(true);
      loadData();
    }
  }, []);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      filePreviews.forEach((fp) => URL.revokeObjectURL(fp.preview));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [p, c, s] = await Promise.all([
        getPhotos(),
        getCategories(),
        getSiteSettings(),
      ]);
      setPhotos(p);
      setCategories(c);
      setSiteSettings(s);
    } catch {
      logout();
      setAuthed(false);
    } finally {
      setLoading(false);
    }
  }

  /* ── File helpers ── */
  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const imageFiles = Array.from(files).filter((f) =>
        f.type.startsWith("image/")
      );
      const newPreviews: FilePreview[] = imageFiles.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));
      setFilePreviews((prev) => [...prev, ...newPreviews]);
    },
    []
  );

  function removeFile(index: number) {
    setFilePreviews((prev) => {
      const copy = [...prev];
      URL.revokeObjectURL(copy[index].preview);
      copy.splice(index, 1);
      return copy;
    });
  }

  function clearFiles() {
    filePreviews.forEach((fp) => URL.revokeObjectURL(fp.preview));
    setFilePreviews([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  /* ── Drag & drop handlers ── */
  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragging(true);
    }
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragging(false);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    dragCounter.current = 0;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }

  /* ── Auth ── */
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    try {
      await login(username, password);
      setAuthed(true);
      loadData();
    } catch {
      setLoginError(t("admin.invalidCredentials"));
    }
  }

  function handleLogout() {
    logout();
    setAuthed(false);
    setPhotos([]);
  }

  /* ── Upload ── */
  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (filePreviews.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < filePreviews.length; i++) {
        await uploadPhoto(
          filePreviews[i].file,
          uploadCategory || "uncategorized",
          uploadTitle,
          uploadDescription
        );
        setUploadProgress(
          Math.round(((i + 1) / filePreviews.length) * 100)
        );
      }
      clearFiles();
      setUploadTitle("");
      setUploadDescription("");
      loadData();
    } catch (err) {
      console.error("Upload failed:", err);
      alert(t("admin.uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  /* ── Delete photo ── */
  async function handleDelete(photo: Photo) {
    if (!confirm(`${t("admin.confirmDelete")} "${photo.title || photo.filename}"?`))
      return;
    try {
      await deletePhoto(photo.id);
      loadData();
    } catch (err) {
      console.error("Delete failed:", err);
      alert(t("admin.deleteFailed"));
    }
  }

  /* ── Edit photo ── */
  function openEditModal(photo: Photo) {
    setEditingPhoto(photo);
    setEditTitle(photo.title || "");
    setEditDescription(photo.description || "");
    setEditCategory(photo.category || "");
  }

  function closeEditModal() {
    setEditingPhoto(null);
    setEditTitle("");
    setEditDescription("");
    setEditCategory("");
  }

  async function handleSaveEdit() {
    if (!editingPhoto) return;
    try {
      await updatePhoto(editingPhoto.id, {
        title: editTitle,
        description: editDescription,
        category: editCategory,
      });
      closeEditModal();
      loadData();
    } catch (err) {
      console.error("Update failed:", err);
      alert(t("admin.updateFailed"));
    }
  }

  /* ── Categories ── */
  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await createCategory(
        newCatName.trim(),
        newCatDisplay.trim() || undefined
      );
      setNewCatName("");
      setNewCatDisplay("");
      loadData();
    } catch (err) {
      console.error("Failed to create category:", err);
      alert(t("admin.catCreateFailed"));
    }
  }

  async function handleDeleteCategory(cat: Category) {
    if (
      !confirm(
        `${t("admin.confirmDeleteCat")} "${cat.display_name || cat.name}"?`
      )
    )
      return;
    try {
      await deleteCategory(cat.id);
      loadData();
    } catch (err) {
      console.error("Failed to delete category:", err);
      alert(t("admin.catDeleteFailed"));
    }
  }

  /* ── Settings ── */
  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!siteSettings) return;
    try {
      await updateSettings(siteSettings);
      alert(t("admin.settingsSaved"));
    } catch (err) {
      console.error("Failed to save settings:", err);
      alert(t("admin.settingsFailed"));
    }
  }

  /* ════════════ Login Form ════════════ */
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="absolute top-6 right-8">
          <LanguageSwitcher />
        </div>
        <div className="w-full max-w-sm p-8">
          <div className="text-center mb-10">
            <h1 className="text-xs tracking-[0.35em] uppercase text-neutral-900">
              {t("admin.title")}
            </h1>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="text"
              placeholder={t("admin.username")}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-neutral-200 bg-white text-sm focus:outline-none focus:border-neutral-400 transition-colors"
              required
            />
            <input
              type="password"
              placeholder={t("admin.password")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-neutral-200 bg-white text-sm focus:outline-none focus:border-neutral-400 transition-colors"
              required
            />
            {loginError && (
              <p className="text-red-500 text-sm">{loginError}</p>
            )}
            <button
              type="submit"
              className="w-full py-3 bg-neutral-900 text-white text-xs tracking-[0.2em] uppercase hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              {t("admin.signIn")}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => router.push("/")}
              className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer tracking-wide"
            >
              {t("admin.backToGallery")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ════════════ Admin Dashboard ════════════ */

  const inputClass =
    "w-full px-4 py-2 border border-neutral-200 bg-white text-sm focus:outline-none focus:border-neutral-400 transition-colors";
  const labelClass =
    "block text-xs text-neutral-500 mb-1.5 tracking-wide uppercase";
  const tabClass = (active: boolean) =>
    `px-4 py-2 text-xs tracking-[0.15em] uppercase cursor-pointer transition-colors ${
      active
        ? "border-b-2 border-neutral-900 text-neutral-900"
        : "text-neutral-400 hover:text-neutral-600"
    }`;

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <header className="border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-xs tracking-[0.35em] uppercase text-neutral-900">
            {t("admin.title")}
          </span>
          <div className="flex items-center gap-6">
            <LanguageSwitcher />
            <button
              onClick={() => router.push("/")}
              className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer tracking-wide"
            >
              {t("admin.viewSite")}
            </button>
            <button
              onClick={handleLogout}
              className="text-xs text-neutral-400 hover:text-red-500 transition-colors cursor-pointer tracking-wide"
            >
              {t("admin.signOut")}
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-neutral-100">
        <div className="max-w-6xl mx-auto px-6 flex gap-6">
          <button
            className={tabClass(activeTab === "photos")}
            onClick={() => setActiveTab("photos")}
          >
            {t("admin.photos")}
          </button>
          <button
            className={tabClass(activeTab === "categories")}
            onClick={() => setActiveTab("categories")}
          >
            {t("admin.categories")}
          </button>
          <button
            className={tabClass(activeTab === "settings")}
            onClick={() => setActiveTab("settings")}
          >
            {t("admin.settings")}
          </button>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* ──── Photos Tab ──── */}
        {activeTab === "photos" && (
          <>
            {/* Upload Section */}
            <section className="border border-neutral-200 p-6 mb-8">
              <h2 className="text-xs tracking-[0.2em] uppercase text-neutral-900 mb-6">
                {t("admin.uploadPhotos")}
              </h2>
              <form onSubmit={handleUpload} className="space-y-5">
                {/* Drop zone */}
                <div className="flex justify-center">
                  <div
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full max-w-lg aspect-video border-2 border-dashed rounded-sm flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                      dragging
                        ? "border-neutral-800 bg-neutral-50"
                        : "border-neutral-200 hover:border-neutral-400"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) addFiles(e.target.files);
                        e.target.value = "";
                      }}
                    />
                    {/* Upload icon */}
                    <svg className="w-8 h-8 text-neutral-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    <p className="text-sm text-neutral-500">
                      {t("admin.dropHere")}
                    </p>
                    <p className="text-xs text-neutral-400 mt-1">
                      {t("admin.orClick")}
                    </p>
                  </div>
                </div>

                {/* Previews */}
                {filePreviews.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-neutral-500">
                        {filePreviews.length} {t("admin.selected")}
                      </span>
                      <button
                        type="button"
                        onClick={clearFiles}
                        className="text-xs text-neutral-400 hover:text-red-500 transition-colors cursor-pointer"
                      >
                        {t("admin.clearAll")}
                      </button>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                      {filePreviews.map((fp, idx) => (
                        <div key={idx} className="relative group aspect-square">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={fp.preview}
                            alt={fp.file.name}
                            className="w-full h-full object-cover rounded-sm"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(idx);
                            }}
                            className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 text-white text-xs flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            title={t("admin.remove")}
                          >
                            &times;
                          </button>
                          <p className="absolute bottom-0 inset-x-0 bg-black/40 text-white text-[10px] px-1 truncate">
                            {fp.file.name}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Meta fields */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>{t("admin.category")}</label>
                    <select
                      value={uploadCategory}
                      onChange={(e) => setUploadCategory(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">{t("admin.selectCategory")}</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.display_name || c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>
                      {t("admin.titleField")}
                    </label>
                    <input
                      type="text"
                      placeholder={t("admin.optional")}
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>
                      {t("admin.description")}
                    </label>
                    <input
                      type="text"
                      placeholder={t("admin.optional")}
                      value={uploadDescription}
                      onChange={(e) => setUploadDescription(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* Upload button + progress */}
                <div className="flex items-center gap-4">
                  <button
                    type="submit"
                    disabled={uploading || filePreviews.length === 0}
                    className="px-6 py-2 bg-neutral-900 text-white text-xs tracking-[0.15em] uppercase hover:bg-neutral-800 transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {uploading
                      ? `${t("admin.uploading")} ${uploadProgress}%`
                      : `${t("admin.upload")}${
                          filePreviews.length > 0
                            ? ` (${filePreviews.length})`
                            : ""
                        }`}
                  </button>
                  {uploading && (
                    <div className="flex-1 h-1 bg-neutral-100 rounded overflow-hidden">
                      <div
                        className="h-full bg-neutral-800 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              </form>
            </section>

            {/* Photos List */}
            <section className="border border-neutral-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xs tracking-[0.2em] uppercase text-neutral-900">
                  {t("admin.photos")} ({photos.length})
                </h2>
                <button
                  onClick={loadData}
                  className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer tracking-wide"
                >
                  {t("admin.refresh")}
                </button>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block w-5 h-5 border border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
                </div>
              ) : photos.length === 0 ? (
                <p className="text-center py-12 text-sm text-neutral-400">
                  {t("admin.noPhotos")}
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {photos
                      .slice(
                        (currentPage - 1) * photosPerPage,
                        currentPage * photosPerPage
                      )
                      .map((photo) => (
                        <div key={photo.id} className="group relative">
                          <div className="aspect-square overflow-hidden bg-neutral-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={photo.url}
                              alt={photo.title || photo.filename}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2">
                            <button
                              onClick={() => openEditModal(photo)}
                              className="opacity-0 group-hover:opacity-100 px-3 py-1.5 bg-white text-neutral-900 text-xs tracking-wide transition-opacity cursor-pointer"
                            >
                              {t("admin.edit")}
                            </button>
                            <button
                              onClick={() => handleDelete(photo)}
                              className="opacity-0 group-hover:opacity-100 px-3 py-1.5 bg-white text-red-600 text-xs tracking-wide transition-opacity cursor-pointer"
                            >
                              {t("admin.delete")}
                            </button>
                          </div>
                          <div className="mt-1.5">
                            <p className="text-xs text-neutral-600 truncate">
                              {photo.title || photo.filename}
                            </p>
                            <p className="text-xs text-neutral-400">
                              {photo.category}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* Pagination */}
                  {photos.length > photosPerPage && (
                    <div className="flex items-center justify-center gap-4 mt-8">
                      <button
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 text-xs tracking-wide border border-neutral-200 text-neutral-600 hover:border-neutral-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {t("admin.prev")}
                      </button>
                      <span className="text-xs text-neutral-500">
                        {currentPage} {t("admin.pageOf")}{" "}
                        {Math.ceil(photos.length / photosPerPage)}
                      </span>
                      <button
                        onClick={() =>
                          setCurrentPage((p) =>
                            Math.min(
                              Math.ceil(photos.length / photosPerPage),
                              p + 1
                            )
                          )
                        }
                        disabled={
                          currentPage >=
                          Math.ceil(photos.length / photosPerPage)
                        }
                        className="px-3 py-1.5 text-xs tracking-wide border border-neutral-200 text-neutral-600 hover:border-neutral-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {t("admin.next")}
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>

            {/* Edit Modal */}
            {editingPhoto && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-white w-full max-w-md mx-4 p-6 shadow-lg">
                  <h3 className="text-xs tracking-[0.2em] uppercase text-neutral-900 mb-6">
                    {t("admin.editPhoto")}
                  </h3>

                  <div className="flex gap-4 mb-5">
                    <div className="w-24 h-24 flex-shrink-0 bg-neutral-100 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={editingPhoto.url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-xs text-neutral-400 break-all">
                      {editingPhoto.filename}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className={labelClass}>
                        {t("admin.category")}
                      </label>
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className={inputClass}
                      >
                        <option value="">
                          {t("admin.selectCategory")}
                        </option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.display_name || c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>
                        {t("admin.titleField")}
                      </label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className={inputClass}
                        placeholder={t("admin.optional")}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>
                        {t("admin.description")}
                      </label>
                      <input
                        type="text"
                        value={editDescription}
                        onChange={(e) =>
                          setEditDescription(e.target.value)
                        }
                        className={inputClass}
                        placeholder={t("admin.optional")}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      onClick={closeEditModal}
                      className="px-4 py-2 text-xs tracking-wide text-neutral-500 hover:text-neutral-800 transition-colors cursor-pointer"
                    >
                      {t("admin.cancel")}
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      className="px-5 py-2 bg-neutral-900 text-white text-xs tracking-[0.15em] uppercase hover:bg-neutral-800 transition-colors cursor-pointer"
                    >
                      {t("admin.save")}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ──── Categories Tab ──── */}
        {activeTab === "categories" && (
          <section className="border border-neutral-200 p-6">
            <h2 className="text-xs tracking-[0.2em] uppercase text-neutral-900 mb-6">
              {t("admin.manageCategories")}
            </h2>

            <form onSubmit={handleAddCategory} className="flex gap-3 mb-8">
              <input
                type="text"
                placeholder={t("admin.catNamePlaceholder")}
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className={inputClass + " max-w-[200px]"}
                required
              />
              <input
                type="text"
                placeholder={t("admin.catDisplayPlaceholder")}
                value={newCatDisplay}
                onChange={(e) => setNewCatDisplay(e.target.value)}
                className={inputClass + " max-w-[200px]"}
              />
              <button
                type="submit"
                className="px-5 py-2 bg-neutral-900 text-white text-xs tracking-[0.15em] uppercase hover:bg-neutral-800 transition-colors cursor-pointer whitespace-nowrap"
              >
                {t("admin.add")}
              </button>
            </form>

            {categories.length === 0 ? (
              <p className="text-sm text-neutral-400">
                {t("admin.noCategories")}
              </p>
            ) : (
              <div className="space-y-2">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between py-3 px-4 border border-neutral-100"
                  >
                    <div>
                      <span className="text-sm text-neutral-800">
                        {cat.display_name || cat.name}
                      </span>
                      {cat.display_name && cat.display_name !== cat.name && (
                        <span className="text-xs text-neutral-400 ml-2">
                          ({cat.name})
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteCategory(cat)}
                      className="text-xs text-neutral-400 hover:text-red-500 transition-colors cursor-pointer tracking-wide"
                    >
                      {t("admin.delete")}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ──── Settings Tab ──── */}
        {activeTab === "settings" && siteSettings && (
          <section className="border border-neutral-200 p-6">
            <h2 className="text-xs tracking-[0.2em] uppercase text-neutral-900 mb-6">
              {t("admin.siteSettings")}
            </h2>
            <form
              onSubmit={handleSaveSettings}
              className="space-y-5 max-w-lg"
            >
              <div>
                <label className={labelClass}>{t("admin.siteTitle")}</label>
                <input
                  type="text"
                  value={siteSettings.site_title}
                  onChange={(e) =>
                    setSiteSettings({
                      ...siteSettings,
                      site_title: e.target.value,
                    })
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{t("admin.subtitle")}</label>
                <input
                  type="text"
                  value={siteSettings.site_subtitle}
                  onChange={(e) =>
                    setSiteSettings({
                      ...siteSettings,
                      site_subtitle: e.target.value,
                    })
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  {t("admin.contactEmail")}
                </label>
                <input
                  type="email"
                  value={siteSettings.contact_email}
                  onChange={(e) =>
                    setSiteSettings({
                      ...siteSettings,
                      contact_email: e.target.value,
                    })
                  }
                  className={inputClass}
                />
              </div>

              <hr className="border-neutral-100" />

              <div>
                <label className={labelClass}>{t("admin.weiboUrl")}</label>
                <input
                  type="url"
                  value={siteSettings.weibo_url}
                  onChange={(e) =>
                    setSiteSettings({
                      ...siteSettings,
                      weibo_url: e.target.value,
                    })
                  }
                  className={inputClass}
                  placeholder="https://weibo.com/..."
                />
              </div>
              <div>
                <label className={labelClass}>{t("admin.wechatId")}</label>
                <input
                  type="text"
                  value={siteSettings.wechat_id}
                  onChange={(e) =>
                    setSiteSettings({
                      ...siteSettings,
                      wechat_id: e.target.value,
                    })
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  {t("admin.xiaohongshuUrl")}
                </label>
                <input
                  type="url"
                  value={siteSettings.xiaohongshu_url}
                  onChange={(e) =>
                    setSiteSettings({
                      ...siteSettings,
                      xiaohongshu_url: e.target.value,
                    })
                  }
                  className={inputClass}
                  placeholder="https://www.xiaohongshu.com/..."
                />
              </div>
              <div>
                <label className={labelClass}>
                  {t("admin.bilibiliUrl")}
                </label>
                <input
                  type="url"
                  value={siteSettings.bilibili_url}
                  onChange={(e) =>
                    setSiteSettings({
                      ...siteSettings,
                      bilibili_url: e.target.value,
                    })
                  }
                  className={inputClass}
                  placeholder="https://space.bilibili.com/..."
                />
              </div>
              <div>
                <label className={labelClass}>{t("admin.douyinUrl")}</label>
                <input
                  type="url"
                  value={siteSettings.douyin_url}
                  onChange={(e) =>
                    setSiteSettings({
                      ...siteSettings,
                      douyin_url: e.target.value,
                    })
                  }
                  className={inputClass}
                  placeholder="https://www.douyin.com/..."
                />
              </div>

              <button
                type="submit"
                className="px-6 py-2 bg-neutral-900 text-white text-xs tracking-[0.15em] uppercase hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                {t("admin.saveSettings")}
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
