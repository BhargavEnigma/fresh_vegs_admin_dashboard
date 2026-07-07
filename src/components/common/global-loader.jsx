import * as React from "react";
import { useGlobalLoader } from "./global-loader-context";
import { cn } from "../../lib/utils";
import LogoLight from "../../assets/logo-light-trans.png";
import LogoDark from "../../assets/logo-dark-trans.png";

function useActiveThemeLogo() {
  const [isDark, setIsDark] = React.useState(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );

  React.useEffect(() => {
    const root = document.documentElement;
    const syncTheme = () => {
      setIsDark(root.classList.contains("dark"));
    };

    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return isDark ? LogoDark : LogoLight;
}

export function GlobalLoader() {
  const { isGlobalLoading, loaderMessage } = useGlobalLoader();
  const [showContent, setShowContent] = React.useState(false);
  const logoSrc = useActiveThemeLogo();

  React.useEffect(() => {
    if (isGlobalLoading) {
      const timer = setTimeout(() => {
        setShowContent(true);
      }, 200); // 200ms delay to prevent flicker on rapid actions
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [isGlobalLoading]);

  if (!isGlobalLoading) return null;

  return (
    <div
      className="fixed inset-0 z-[90] cursor-wait select-none"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-slate-900/10 dark:bg-slate-950/20 backdrop-blur-[1px] transition-all duration-300 ease-out",
          showContent && "bg-slate-900/35 dark:bg-slate-950/50 backdrop-blur-sm"
        )}
      />

      {/* Loader Card */}
      {showContent && (
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div
            role="status"
            aria-live="polite"
            className="flex flex-col items-center gap-6 rounded-3xl border border-white/20 bg-white/85 p-8 text-center shadow-2xl shadow-slate-900/10 backdrop-blur-md dark:border-slate-800/40 dark:bg-slate-900/85 dark:shadow-black/40 max-w-sm w-full animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Premium Animated Logo Orbit */}
            <div className="relative flex h-28 w-28 items-center justify-center">
              {/* Pulsating backdrop glow */}
              <div className="absolute h-20 w-20 rounded-full bg-dailyveg-500/10 blur-xl dark:bg-dailyveg-400/10 animate-pulse" />
              
              {/* Spinning gradient ring */}
              <div className="absolute h-24 w-24 rounded-full border-[3px] border-dailyveg-500/15 border-t-dailyveg-500 animate-spin" />
              
              {/* Reverse spinning outer dashed ring */}
              <div
                className="absolute h-28 w-28 rounded-full border border-dashed border-dailyveg-400/30 animate-spin"
                style={{ animationDirection: "reverse", animationDuration: "12s" }}
              />

              {/* Center Pulsing Logo */}
              <img
                src={logoSrc}
                alt="DailyVeg"
                className="z-10 h-10 max-w-[90px] object-contain animate-pulse"
                style={{ animationDuration: "2s" }}
              />
            </div>

            {/* Dynamic Loading Text */}
            <span className="text-sm font-semibold tracking-wide text-slate-700 dark:text-slate-200">
              {loaderMessage}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
