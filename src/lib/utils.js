import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Build an absolute URL for assets coming from backend (Supabase public URLs or /uploads/*).
// - If already absolute (http/https), return as-is
// - If relative, prefix with VITE_API_BASE_URL (no trailing slash)
export function assetUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
  if (!base) return url;
  if (url.startsWith("/")) return `${base}${url}`;
  return `${base}/${url}`;
}
