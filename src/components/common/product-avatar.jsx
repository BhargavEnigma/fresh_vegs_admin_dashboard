import React, { useState } from "react";
import { Package } from "lucide-react";
import { assetUrl, cn } from "../../lib/utils";

/**
 * Extracts a valid absolute image URL from various product/item shapes
 * returned across different daily ops endpoints.
 */
export function getProductImageUrl(item) {
  if (!item) return "";
  if (typeof item === "string") return assetUrl(item);

  // Direct string property checks
  if (typeof item.image_url === "string" && item.image_url) return assetUrl(item.image_url);
  if (typeof item.image === "string" && item.image) return assetUrl(item.image);
  if (typeof item.product_image === "string" && item.product_image) return assetUrl(item.product_image);
  if (typeof item.thumbnail_url === "string" && item.thumbnail_url) return assetUrl(item.thumbnail_url);

  // Array of images on item
  if (Array.isArray(item.images) && item.images.length > 0) {
    const first = item.images[0];
    const url = typeof first === "string" ? first : (first?.image_url || first?.url || first?.path || first?.src);
    if (url) return assetUrl(url);
  }
  if (Array.isArray(item.product_images) && item.product_images.length > 0) {
    const first = item.product_images[0];
    const url = typeof first === "string" ? first : (first?.image_url || first?.url || first?.path || first?.src);
    if (url) return assetUrl(url);
  }
  if (Array.isArray(item.image_urls) && item.image_urls.length > 0) {
    const first = item.image_urls[0];
    if (typeof first === "string" && first) return assetUrl(first);
  }

  // Nested product object check
  if (item.product && typeof item.product === "object") {
    const nested = getProductImageUrl(item.product);
    if (nested) return nested;
  }

  // Grouped items / rows check
  if (Array.isArray(item.product_group_rows) && item.product_group_rows.length > 0) {
    for (const row of item.product_group_rows) {
      const rowImg = getProductImageUrl(row);
      if (rowImg) return rowImg;
    }
  }

  return "";
}

/**
 * Consistent, premium Product Avatar / Thumbnail component.
 * Renders the product image when available with graceful fallback to an icon.
 */
export function ProductAvatar({
  item,
  src,
  alt,
  size = "md",
  className,
  fallbackIcon: FallbackIcon = Package,
}) {
  const [imgError, setImgError] = useState(false);

  const resolvedSrc = src || getProductImageUrl(item);
  const resolvedAlt = alt || item?.product_name || item?.product?.name || item?.name || "Product";

  const sizeClasses = {
    xs: "h-6 w-6 rounded-lg text-[10px]",
    sm: "h-8 w-8 rounded-lg text-xs",
    md: "h-10 w-10 rounded-xl text-sm",
    lg: "h-12 w-12 rounded-xl text-base",
    xl: "h-20 w-20 rounded-2xl text-lg",
  };

  const iconSizes = {
    xs: "h-3 w-3",
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
    xl: "h-7 w-7",
  };

  const selectedSizeClass = sizeClasses[size] || sizeClasses.md;
  const selectedIconSize = iconSizes[size] || iconSizes.md;

  if (resolvedSrc && !imgError) {
    return (
      <img
        src={resolvedSrc}
        alt={resolvedAlt}
        onError={() => setImgError(true)}
        loading="lazy"
        className={cn(
          "shrink-0 object-cover border border-slate-200/80 bg-slate-100 dark:border-slate-800 dark:bg-slate-900 shadow-sm",
          selectedSizeClass,
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center border border-slate-200/80 bg-slate-100 text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500 shadow-sm",
        selectedSizeClass,
        className
      )}
      title={resolvedAlt}
    >
      <FallbackIcon className={selectedIconSize} />
    </div>
  );
}
