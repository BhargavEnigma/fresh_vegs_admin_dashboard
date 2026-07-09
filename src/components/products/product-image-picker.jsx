import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../ui/button";
import { ImageSizeInfo } from "../common/image-size-info";

function createPreview(file) {
  return URL.createObjectURL(file);
}

/**
 * Multi image picker with preview + remove.
 * - Returns File[] via onChange
 * - Uses Tailwind styles to match existing UI.
 */
export function ProductImagePicker({ value = [], onChange, maxFiles = 10, accept = "image/*" }) {
  const inputRef = useRef(null);
  const [items, setItems] = useState(() => (value || []).map((f) => ({ file: f, preview: createPreview(f) })));

  const files = useMemo(() => items.map((x) => x.file), [items]);

  useEffect(() => {
    if (typeof onChange === "function") {
      onChange(files);
    }
  }, [files, onChange]);

  useEffect(() => {
    return () => {
      // cleanup previews on unmount
      items.forEach((x) => {
        if (x.preview) URL.revokeObjectURL(x.preview);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openPicker() {
    inputRef.current?.click();
  }

  function handleSelect(e) {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;

    const remaining = Math.max(0, maxFiles - items.length);
    const slice = selected.slice(0, remaining);

    const mapped = slice.map((file) => ({ file, preview: createPreview(file) }));
    setItems((prev) => [...prev, ...mapped]);

    // reset input so re-selecting same file triggers change
    e.target.value = "";
  }

  function removeAt(idx) {
    setItems((prev) => {
      const next = [...prev];
      const removed = next.splice(idx, 1);
      if (removed[0]?.preview) URL.revokeObjectURL(removed[0].preview);
      return next;
    });
  }

  function clearAll() {
    setItems((prev) => {
      prev.forEach((x) => {
        if (x.preview) URL.revokeObjectURL(x.preview);
      });
      return [];
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={openPicker}>
          Add images
        </Button>
        <Button type="button" variant="outline" onClick={clearAll} disabled={!items.length}>
          Clear
        </Button>
        <div className="ml-auto text-xs text-slate-500">
          {items.length}/{maxFiles}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          onChange={handleSelect}
          className="hidden"
        />
      </div>

      {items.length === 0 ? (
        <div className="mt-3 text-xs text-slate-500">No images selected.</div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {items.map((x, idx) => (
            <div key={`${x.file.name}-${idx}`} className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="aspect-square bg-slate-50 dark:bg-slate-900 relative">
                <img src={x.preview} alt={x.file.name} className="h-full w-full object-cover" />
                <ImageSizeInfo file={x.file} src={x.preview} />
              </div>
              <div className="p-2">
                <div className="mb-2 truncate text-xs" title={x.file.name}>
                  {x.file.name}
                </div>
                <Button type="button" variant="outline" className="w-full" onClick={() => removeAt(idx)}>
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
