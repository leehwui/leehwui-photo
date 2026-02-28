"use client";

import { createContext, useContext, useCallback, useSyncExternalStore, ReactNode } from "react";

export type Locale = "en" | "zh";

const dictionaries = {
  en: {
    // Nav
    "nav.gallery": "Gallery",
    "nav.about": "About",
    "nav.contact": "Contact",

    // Gallery
    "gallery.showAll": "Show All",
    "gallery.empty": "No photographs to display.",
    "gallery.close": "Close",

    // About
    "about.title": "About Me",
    "about.bio": "I'm a photographer with a passion for capturing the world through my lens. My work spans across street photography, city skylines, landscapes, sports & events, and portraiture. Each frame tells a story — whether it's the energy of a bustling street, the serenity of a mountain ridge, or the decisive moment in a sporting event.",
    "about.specialties": "Specialties",
    "about.street": "Street Photography",
    "about.skyline": "City Skyline",
    "about.landscape": "Landscape",
    "about.sports": "Sports & Events",
    "about.portraiture": "Portraiture",

    // Contact
    "contact.title": "Get in Touch",
    "contact.description": "Feel free to reach out through any of the platforms below.",
    "contact.email": "Email",
    "contact.wechat": "WeChat",
    "contact.social": "Social Media",

    // Footer
    "footer.wechat": "WeChat",
    "footer.contact": "Contact",

    // Admin
    "admin.footerText": "Footer Text",
    "admin.footerTextHint": "Custom footer text, e.g. ICP number",
    "admin.aboutPage": "About Page",
    "admin.aboutPhoto": "About Photo",
    "admin.aboutPhotoHint": "Upload a photo for the About page",
    "admin.changePhoto": "Change Photo",
    "admin.aboutBioEn": "Bio (English)",
    "admin.aboutBioZh": "Bio (中文)",
    "admin.aboutBioHint": "Leave empty to use the default text",

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
    // Nav
    "nav.gallery": "作品",
    "nav.about": "关于",
    "nav.contact": "联系",

    // Gallery
    "gallery.showAll": "全部",
    "gallery.empty": "暂无照片",
    "gallery.close": "关闭",

    // About
    "about.title": "关于我",
    "about.bio": "我是一名热爱用镜头记录世界的摄影师。我的作品涵盖街头摄影、城市天际线、风光、体育赛事以及人像等多个领域。每一帧画面都在讲述一个故事——无论是熙攘街头的活力、山脊间的宁静，还是赛场上的决定性瞬间。",
    "about.specialties": "擅长领域",
    "about.street": "街头摄影",
    "about.skyline": "城市天际线",
    "about.landscape": "风光",
    "about.sports": "体育赛事",
    "about.portraiture": "人像",

    // Contact
    "contact.title": "联系方式",
    "contact.description": "欢迎通过以下任何平台与我联系。",
    "contact.email": "邮箱",
    "contact.wechat": "微信",
    "contact.social": "社交媒体",

    // Footer
    "footer.wechat": "微信",
    "footer.contact": "联系",

    // Admin
    "admin.footerText": "页脚文本",
    "admin.footerTextHint": "自定义页脚文本，如 ICP 备案号",
    "admin.aboutPage": "关于页面",
    "admin.aboutPhoto": "关于页照片",
    "admin.aboutPhotoHint": "上传关于页面的照片",
    "admin.changePhoto": "更换照片",
    "admin.aboutBioEn": "简介（English）",
    "admin.aboutBioZh": "简介（中文）",
    "admin.aboutBioHint": "留空则使用默认文本",

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

// ─── Locale store (external store for useSyncExternalStore) ───
let _locale: Locale = "en";
const _listeners = new Set<() => void>();

function _getLocaleSnapshot(): Locale {
  return _locale;
}

function _getLocaleServerSnapshot(): Locale {
  return "en"; // always "en" on server for consistent SSR
}

function _subscribeLocale(cb: () => void) {
  _listeners.add(cb);
  return () => _listeners.delete(cb);
}

function _setLocale(l: Locale) {
  _locale = l;
  if (typeof window !== "undefined") {
    localStorage.setItem("locale", l);
  }
  _listeners.forEach((cb) => cb());
}

// Read saved locale from localStorage on client module load
if (typeof window !== "undefined") {
  const saved = localStorage.getItem("locale") as Locale | null;
  if (saved === "en" || saved === "zh") {
    _locale = saved;
  } else {
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith("zh")) {
      _locale = "zh";
    }
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(
    _subscribeLocale,
    _getLocaleSnapshot,
    _getLocaleServerSnapshot
  );

  const setLocale = useCallback((l: Locale) => {
    _setLocale(l);
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
