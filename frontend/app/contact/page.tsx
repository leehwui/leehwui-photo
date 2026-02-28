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
  about_photo_url: "",
  about_bio_en: "",
  about_bio_zh: "",
};

/* ── SVG social icons (inline, 24x24) ── */

function WeiboIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
      <path d="M10.23 18.75c-3.57.35-6.65-1.26-6.88-3.6-.23-2.34 2.49-4.55 6.06-4.9 3.57-.35 6.65 1.26 6.88 3.6.23 2.34-2.49 4.55-6.06 4.9zm7.63-9.38c-.25-.08-.42-.14-.29-.5.28-.78.31-1.45.01-2.05-.57-1.1-2.13-1.04-3.92-.03 0 0-.56.25-.42-.2.28-.89.24-1.63-.2-2.06-.98-1-3.6.04-5.84 2.32-1.68 1.7-2.65 3.51-2.65 5.07 0 2.98 3.83 4.8 7.57 4.8 4.9 0 8.16-2.85 8.16-5.11 0-1.37-1.15-2.14-2.42-2.24zm-7.4 7.18c-2.6.25-4.84-.92-5.01-2.63-.17-1.7 1.82-3.3 4.42-3.55 2.6-.25 4.84.93 5.01 2.63.17 1.7-1.82 3.3-4.42 3.55zM20.63 5.78c-1.38-1.53-3.42-2.12-5.3-1.72-.39.08-.64.47-.55.86.08.39.47.64.86.55 1.38-.29 2.87.14 3.88 1.26 1.01 1.12 1.31 2.63.91 3.97-.12.38.1.79.48.91.39.12.79-.1.91-.48.54-1.83.14-3.89-1.19-5.35z" />
      <path d="M18.53 7.85c-.67-.74-1.67-1.03-2.58-.84-.3.06-.49.36-.43.66.06.3.36.49.66.43.51-.11 1.07.05 1.45.47.38.42.49.99.34 1.49-.09.29.07.6.37.69.29.09.6-.07.69-.37.25-.83.07-1.78-.5-2.53z" />
    </svg>
  );
}

function XiaohongshuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-.5 14.5h-1V11h1v5.5zm2.5 0h-1V9h1v7.5zm2.5 0h-1V13h1v3.5zm-7.5 0h-1V12h1v4.5z" />
    </svg>
  );
}

function BilibiliIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
      <path d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.92-.373.347 0 .653.124.92.373L9.653 4.44c.071.071.134.142.187.213h4.267a.836.836 0 0 1 .16-.213l2.853-2.747c.267-.249.573-.373.92-.373.347 0 .662.124.929.373.249.249.373.551.373.907 0 .355-.124.657-.373.906L17.813 4.653zM5.333 7.24c-.746.018-1.373.276-1.88.773-.506.498-.769 1.13-.786 1.894v7.52c.017.764.28 1.395.786 1.893.507.498 1.134.756 1.88.773h13.334c.746-.017 1.373-.275 1.88-.773.506-.498.769-1.129.786-1.893v-7.52c-.017-.765-.28-1.396-.786-1.894-.507-.497-1.134-.755-1.88-.773H5.333zm4 5.146c-.373 0-.684-.124-.933-.373a1.27 1.27 0 0 1-.374-.934c0-.373.125-.684.374-.933.249-.249.56-.374.933-.374.374 0 .684.125.934.374.249.249.373.56.373.933 0 .374-.124.685-.373.934a1.27 1.27 0 0 1-.934.373zm5.334 0c-.374 0-.685-.124-.934-.373a1.27 1.27 0 0 1-.373-.934c0-.373.124-.684.373-.933.25-.249.56-.374.934-.374.373 0 .684.125.933.374.25.249.374.56.374.933 0 .374-.125.685-.374.934a1.27 1.27 0 0 1-.933.373z" />
    </svg>
  );
}

function DouyinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.87a8.28 8.28 0 0 0 4.85 1.56V6.94a4.83 4.83 0 0 1-1.09-.25z" />
    </svg>
  );
}

function WechatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
      <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05a6.937 6.937 0 0 1-.264-1.871c0-3.866 3.576-7 7.985-7 .199 0 .388.022.583.033C16.871 4.682 13.118 2.188 8.691 2.188zm-2.6 4.408c.636 0 1.152.516 1.152 1.152 0 .636-.516 1.152-1.152 1.152S4.94 8.384 4.94 7.748c0-.636.515-1.152 1.151-1.152zm5.6 0c.637 0 1.152.516 1.152 1.152 0 .636-.515 1.152-1.152 1.152-.636 0-1.15-.516-1.15-1.152 0-.636.514-1.152 1.15-1.152zm4.53 3.093c-3.836 0-6.943 2.747-6.943 6.103 0 3.357 3.107 6.103 6.943 6.103.78 0 1.54-.114 2.26-.326a.665.665 0 0 1 .553.074l1.47.858a.262.262 0 0 0 .13.04.226.226 0 0 0 .224-.226c0-.056-.023-.11-.037-.165l-.301-1.14a.454.454 0 0 1 .165-.512C22.196 19.38 23.164 17.6 23.164 15.692c0-3.356-3.107-6.103-6.943-6.103zm-2.602 3.17c.492 0 .891.399.891.89 0 .49-.399.89-.89.89a.891.891 0 0 1-.892-.89c0-.491.4-.89.891-.89zm5.202 0c.492 0 .891.399.891.89 0 .49-.399.89-.89.89a.891.891 0 0 1-.892-.89c0-.491.4-.89.891-.89z" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="24" height="24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0l-9.75 6.5-9.75-6.5" />
    </svg>
  );
}

export default function ContactPage() {
  const { t } = useI18n();
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    getSiteSettings().then(setSettings).catch(console.error);
  }, []);

  const socialLinks: { icon: React.ReactNode; url: string; label: string }[] = [];
  if (settings.weibo_url)
    socialLinks.push({ icon: <WeiboIcon />, url: settings.weibo_url, label: "Weibo" });
  if (settings.xiaohongshu_url)
    socialLinks.push({ icon: <XiaohongshuIcon />, url: settings.xiaohongshu_url, label: "小红书" });
  if (settings.bilibili_url)
    socialLinks.push({ icon: <BilibiliIcon />, url: settings.bilibili_url, label: "Bilibili" });
  if (settings.douyin_url)
    socialLinks.push({ icon: <DouyinIcon />, url: settings.douyin_url, label: "抖音" });

  const hasEmail = !!settings.contact_email;
  const hasWechat = !!settings.wechat_id;
  const hasSocial = socialLinks.length > 0;
  const hasAny = hasEmail || hasWechat || hasSocial;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar siteTitle={settings.site_title} />

      <main className="flex-1 w-full max-w-2xl mx-auto px-6 py-20">
        <h1 className="text-lg tracking-[0.2em] uppercase font-light text-neutral-800 text-center mb-4">
          {t("contact.title")}
        </h1>
        <p className="text-sm text-neutral-400 text-center font-light mb-16">
          {t("contact.description")}
        </p>

        {hasAny ? (
          <div className="space-y-12">
            {/* Email */}
            {hasEmail && (
              <div className="text-center">
                <h2 className="text-xs tracking-[0.2em] uppercase text-neutral-400 mb-4">
                  {t("contact.email")}
                </h2>
                <a
                  href={`mailto:${settings.contact_email}`}
                  className="inline-flex items-center gap-3 text-neutral-700 hover:text-neutral-900 transition-colors"
                >
                  <EmailIcon />
                  <span className="text-sm tracking-wide">{settings.contact_email}</span>
                </a>
              </div>
            )}

            {/* WeChat */}
            {hasWechat && (
              <div className="text-center">
                <h2 className="text-xs tracking-[0.2em] uppercase text-neutral-400 mb-4">
                  {t("contact.wechat")}
                </h2>
                <div className="inline-flex items-center gap-3 text-neutral-700">
                  <WechatIcon />
                  <span className="text-sm tracking-wide">{settings.wechat_id}</span>
                </div>
              </div>
            )}

            {/* Social links */}
            {hasSocial && (
              <div className="text-center">
                <h2 className="text-xs tracking-[0.2em] uppercase text-neutral-400 mb-6">
                  {t("contact.social")}
                </h2>
                <div className="flex items-center justify-center gap-8">
                  {socialLinks.map((link) => (
                    <a
                      key={link.label}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-2 text-neutral-400 hover:text-neutral-800 transition-colors"
                    >
                      {link.icon}
                      <span className="text-[10px] tracking-wider uppercase">
                        {link.label}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-center text-neutral-300 text-sm">—</p>
        )}
      </main>

      <Footer settings={settings} />
    </div>
  );
}
