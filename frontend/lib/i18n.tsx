"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type Locale = "en" | "zh";

const dictionaries = {
  en: {
    // Gallery
    "gallery.showAll": "Show All",
    "gallery.empty": "No photographs to display.",
    "gallery.close": "Close",

    // Footer
    "footer.wechat": "WeChat",
    "footer.contact": "Contact",

    // Admin - Login
    "admin.title": "Administration",
    "admin.username": "Username",
    "admin.password": "Password",
    "admin.signIn": "Sign In",
    "admin.backToGallery": "Back to Gallery",
    "admin.invalidCredentials": "Invalid username or password",

    // Admin - Dashboard
    "admin.viewSite": "View Site",
    "admin.signOut": "Sign Out",
    "admin.photos": "Photos",
    "admin.categories": "Categories",
    "admin.settings": "Settings",
    "admin.refresh": "Refresh",

    // Admin - Upload
    "admin.uploadPhotos": "Upload Photos",
    "admin.files": "Files",
    "admin.category": "Category",
    "admin.selectCategory": "Select category",
    "admin.titleField": "Title",
    "admin.description": "Description",
    "admin.optional": "Optional",
    "admin.upload": "Upload",
    "admin.uploading": "Uploading...",
    "admin.uploadFailed": "Upload failed. Please try again.",
    "admin.dropHere": "Drag & drop images here",
    "admin.orClick": "or click to browse",
    "admin.selected": "selected",
    "admin.clearAll": "Clear all",
    "admin.remove": "Remove",

    // Admin - Photos list
    "admin.noPhotos": "No photos uploaded yet.",
    "admin.delete": "Delete",
    "admin.confirmDelete": "Delete",
    "admin.deleteFailed": "Delete failed.",
    "admin.edit": "Edit",
    "admin.editPhoto": "Edit Photo",
    "admin.save": "Save",
    "admin.cancel": "Cancel",
    "admin.updateFailed": "Update failed.",
    "admin.prev": "Previous",
    "admin.next": "Next",
    "admin.pageOf": "of",

    // Admin - Categories
    "admin.manageCategories": "Manage Categories",
    "admin.catNamePlaceholder": "Name (e.g. landscape)",
    "admin.catDisplayPlaceholder": "Display name (optional)",
    "admin.add": "Add",
    "admin.noCategories": "No categories.",
    "admin.confirmDeleteCat": "Delete category",
    "admin.catCreateFailed": "Failed to create category.",
    "admin.catDeleteFailed": "Failed to delete category.",
    "admin.catUpdateFailed": "Failed to update category.",
    "admin.catReorderFailed": "Failed to reorder categories.",
    "admin.dragToReorder": "Drag to reorder",
    "admin.editCategory": "Edit Category",
    "admin.filterByCategory": "Filter",
    "admin.allCategories": "All",

    // Admin - Settings
    "admin.siteSettings": "Site Settings",
    "admin.siteTitle": "Site Title",
    "admin.subtitle": "Subtitle",
    "admin.contactEmail": "Contact Email",
    "admin.weiboUrl": "Weibo URL",
    "admin.wechatId": "WeChat ID",
    "admin.xiaohongshuUrl": "Xiaohongshu URL",
    "admin.bilibiliUrl": "Bilibili URL",
    "admin.douyinUrl": "Douyin URL",
    "admin.saveSettings": "Save Settings",
    "admin.settingsSaved": "Settings saved.",
    "admin.settingsFailed": "Failed to save settings.",
  },
  zh: {
    // Gallery
    "gallery.showAll": "全部",
    "gallery.empty": "暂无照片",
    "gallery.close": "关闭",

    // Footer
    "footer.wechat": "微信",
    "footer.contact": "联系",

    // Admin - Login
    "admin.title": "管理后台",
    "admin.username": "用户名",
    "admin.password": "密码",
    "admin.signIn": "登录",
    "admin.backToGallery": "返回画廊",
    "admin.invalidCredentials": "用户名或密码错误",

    // Admin - Dashboard
    "admin.viewSite": "查看网站",
    "admin.signOut": "退出登录",
    "admin.photos": "照片",
    "admin.categories": "分类",
    "admin.settings": "设置",
    "admin.refresh": "刷新",

    // Admin - Upload
    "admin.uploadPhotos": "上传照片",
    "admin.files": "文件",
    "admin.category": "分类",
    "admin.selectCategory": "选择分类",
    "admin.titleField": "标题",
    "admin.description": "描述",
    "admin.optional": "选填",
    "admin.upload": "上传",
    "admin.uploading": "上传中...",
    "admin.uploadFailed": "上传失败，请重试。",
    "admin.dropHere": "拖拽图片到此处",
    "admin.orClick": "或点击浏览文件",
    "admin.selected": "已选",
    "admin.clearAll": "清除全部",
    "admin.remove": "移除",

    // Admin - Photos list
    "admin.noPhotos": "暂无已上传照片。",
    "admin.delete": "删除",
    "admin.confirmDelete": "删除",
    "admin.deleteFailed": "删除失败。",
    "admin.edit": "编辑",
    "admin.editPhoto": "编辑照片",
    "admin.save": "保存",
    "admin.cancel": "取消",
    "admin.updateFailed": "更新失败。",
    "admin.prev": "上一页",
    "admin.next": "下一页",
    "admin.pageOf": "/",

    // Admin - Categories
    "admin.manageCategories": "管理分类",
    "admin.catNamePlaceholder": "名称（如 landscape）",
    "admin.catDisplayPlaceholder": "显示名称（选填）",
    "admin.add": "添加",
    "admin.noCategories": "暂无分类。",
    "admin.confirmDeleteCat": "删除分类",
    "admin.catCreateFailed": "创建分类失败。",
    "admin.catDeleteFailed": "删除分类失败。",
    "admin.catUpdateFailed": "更新分类失败。",
    "admin.catReorderFailed": "排序分类失败。",
    "admin.dragToReorder": "拖拽排序",
    "admin.editCategory": "编辑分类",
    "admin.filterByCategory": "筛选",
    "admin.allCategories": "全部",

    // Admin - Settings
    "admin.siteSettings": "站点设置",
    "admin.siteTitle": "站点标题",
    "admin.subtitle": "副标题",
    "admin.contactEmail": "联系邮箱",
    "admin.weiboUrl": "微博链接",
    "admin.wechatId": "微信号",
    "admin.xiaohongshuUrl": "小红书链接",
    "admin.bilibiliUrl": "哔哩哔哩链接",
    "admin.douyinUrl": "抖音链接",
    "admin.saveSettings": "保存设置",
    "admin.settingsSaved": "设置已保存。",
    "admin.settingsFailed": "保存设置失败。",
  },
} as const;

type Dict = typeof dictionaries.en;
export type TranslationKey = keyof Dict;

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType>({
  locale: "en",
  setLocale: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("locale") as Locale | null;
      if (saved === "en" || saved === "zh") return saved;
      // detect browser language
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith("zh")) return "zh";
    }
    return "en";
  });

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    if (typeof window !== "undefined") {
      localStorage.setItem("locale", l);
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => {
      return dictionaries[locale]?.[key] ?? dictionaries.en[key] ?? key;
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useI18n();
  return (
    <button
      onClick={() => setLocale(locale === "en" ? "zh" : "en")}
      className={
        className ||
        "text-xs tracking-wide text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
      }
      title={locale === "en" ? "切换到中文" : "Switch to English"}
    >
      {locale === "en" ? "中文" : "EN"}
    </button>
  );
}
