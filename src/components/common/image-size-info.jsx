import * as React from "react";
import { formatBytes } from "../../lib/utils";

export function ImageSizeInfo({ src, file }) {
  const [dimensions, setDimensions] = React.useState(null);
  const [fileSize, setFileSize] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;

    async function loadInfo() {
      // 1. Determine size
      if (file) {
        if (isMounted) setFileSize(file.size);
      } else if (src) {
        try {
          const res = await fetch(src, { method: "HEAD" });
          const len = res.headers.get("content-length");
          if (len && isMounted) {
            setFileSize(parseInt(len, 10));
          }
        } catch (e) {
          // Fallback to omit file size if HEAD request fails/blocked by CORS
        }
      }

      // 2. Determine dimensions
      const imageSrc = file ? URL.createObjectURL(file) : src;
      if (imageSrc) {
        try {
          const dims = await new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              resolve({ width: img.naturalWidth, height: img.naturalHeight });
            };
            img.onerror = () => resolve(null);
            img.src = imageSrc;
          });
          if (isMounted) {
            setDimensions(dims);
          }
        } catch (e) {
          // ignore
        } finally {
          if (file) {
            URL.revokeObjectURL(imageSrc);
          }
        }
      }

      if (isMounted) {
        setLoading(false);
      }
    }

    loadInfo();

    return () => {
      isMounted = false;
    };
  }, [src, file]);

  if (loading) {
    return (
      <div className="absolute bottom-0 left-0 right-0 bg-slate-950/75 p-1 text-[10px] font-mono text-white flex justify-between items-center backdrop-blur-sm select-none pointer-events-none">
        <span>Loading info…</span>
      </div>
    );
  }

  const hasDims = dimensions && dimensions.width && dimensions.height;
  const hasSize = fileSize !== null;

  if (!hasDims && !hasSize) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-slate-950/75 p-1 text-[10px] font-mono text-white flex justify-between items-center backdrop-blur-sm select-none pointer-events-none">
      <span>{hasDims ? `${dimensions.width}×${dimensions.height}` : "—"}</span>
      <span>{hasSize ? formatBytes(fileSize) : "—"}</span>
    </div>
  );
}
