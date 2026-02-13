import axios from "axios";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8090";

// Keep an in-memory copy of the token so it is always available
// even if js-cookie fails to read the cookie (path / timing issues).
let _token: string | null =
  (typeof document !== "undefined" ? Cookies.get("token") : null) || null;

function getToken(): string | undefined {
  return _token || Cookies.get("token") || undefined;
}

function setToken(token: string) {
  _token = token;
  Cookies.set("token", token, { expires: 1, path: "/" });
}

function clearToken() {
  _token = null;
  Cookies.remove("token", { path: "/" });
}

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401 (expired or invalid token)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearToken();
    }
    return Promise.reject(error);
  }
);

export interface Photo {
  id: string;
  filename: string;
  url: string;
  category: string;
  title?: string;
  description?: string;
  width?: number;
  height?: number;
  sort_order: number;
}

export interface Category {
  id: string;
  name: string;
  display_name?: string;
  sort_order: number;
}

export interface SiteSettings {
  site_title: string;
  site_subtitle: string;
  contact_email: string;
  weibo_url: string;
  wechat_id: string;
  xiaohongshu_url: string;
  bilibili_url: string;
  douyin_url: string;
}

export async function login(
  username: string,
  password: string
): Promise<string> {
  const formData = new URLSearchParams();
  formData.append("username", username);
  formData.append("password", password);
  const res = await api.post("/api/auth/login", formData, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  const token = res.data.access_token;
  setToken(token);
  return token;
}

export function logout() {
  clearToken();
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

export async function getPhotos(category?: string): Promise<Photo[]> {
  const params = category ? { category } : {};
  const res = await api.get("/api/photos", { params });
  return res.data;
}

export async function getCategories(): Promise<Category[]> {
  const res = await api.get("/api/categories");
  return res.data;
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const res = await api.get("/api/settings");
  return res.data;
}

export async function uploadPhoto(
  file: File,
  category: string,
  title?: string,
  description?: string
): Promise<Photo> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("category", category);
  if (title) formData.append("title", title);
  if (description) formData.append("description", description);
  const res = await api.post("/api/photos", formData);
  return res.data;
}

export async function deletePhoto(photoId: string): Promise<void> {
  await api.delete(`/api/photos/${photoId}`);
}

export async function updatePhoto(
  photoId: string,
  data: { title?: string; description?: string; category?: string }
): Promise<void> {
  const formData = new FormData();
  if (data.title !== undefined) formData.append("title", data.title);
  if (data.description !== undefined) formData.append("description", data.description);
  if (data.category !== undefined) formData.append("category", data.category);
  await api.put(`/api/photos/${photoId}`, formData);
}

export async function updateSettings(
  settings: Partial<SiteSettings>
): Promise<void> {
  await api.put("/api/settings", settings);
}

export async function createCategory(
  name: string,
  displayName?: string
): Promise<Category> {
  const res = await api.post("/api/categories", {
    name,
    display_name: displayName,
  });
  return res.data;
}

export async function deleteCategory(categoryId: string): Promise<void> {
  await api.delete(`/api/categories/${categoryId}`);
}

export async function updateCategory(
  categoryId: string,
  data: { name?: string; display_name?: string }
): Promise<Category> {
  const res = await api.put(`/api/categories/${categoryId}`, data);
  return res.data;
}

export async function reorderCategories(ids: string[]): Promise<void> {
  await api.put("/api/categories/reorder", { ids });
}

export default api;
