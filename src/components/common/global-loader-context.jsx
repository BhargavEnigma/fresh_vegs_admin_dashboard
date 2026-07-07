import * as React from "react";
import { useIsMutating, useQueryClient } from "@tanstack/react-query";
import { GlobalLoader } from "./global-loader";

const GlobalLoaderContext = React.createContext(null);

export function GlobalLoaderProvider({ children }) {
  const [manualLoaders, setManualLoaders] = React.useState([]);
  const queryClient = useQueryClient();
  const mutatingCount = useIsMutating();

  const showLoader = React.useCallback((message = "Please wait...") => {
    setManualLoaders((prev) => [...prev, message]);
  }, []);

  const hideLoader = React.useCallback(() => {
    setManualLoaders((prev) => {
      if (prev.length === 0) return prev;
      return prev.slice(0, -1);
    });
  }, []);

  const withLoader = React.useCallback(async (promiseOrFn, message) => {
    showLoader(message);
    try {
      if (typeof promiseOrFn === "function") {
        return await promiseOrFn();
      }
      return await promiseOrFn;
    } finally {
      hideLoader();
    }
  }, [showLoader, hideLoader]);

  // Determine if loader should be visible (any manual loaders or pending query mutations)
  const isGlobalLoading = manualLoaders.length > 0 || mutatingCount > 0;

  // Retrieve the appropriate message
  const loaderMessage = React.useMemo(() => {
    if (manualLoaders.length > 0) {
      return manualLoaders[manualLoaders.length - 1];
    }
    if (mutatingCount > 0) {
      const pendingMutations = queryClient
        .getMutationCache()
        .getAll()
        .filter((m) => m.state.status === "pending");

      const mutationWithMeta = pendingMutations.find(
        (m) => m.options?.meta?.globalLoaderMessage
      );
      if (mutationWithMeta) {
        return mutationWithMeta.options.meta.globalLoaderMessage;
      }
    }
    return "Please wait...";
  }, [manualLoaders, mutatingCount, queryClient]);

  const value = React.useMemo(
    () => ({
      showLoader,
      hideLoader,
      withLoader,
      isGlobalLoading,
      loaderMessage,
    }),
    [showLoader, hideLoader, withLoader, isGlobalLoading, loaderMessage]
  );

  return (
    <GlobalLoaderContext.Provider value={value}>
      {children}
      <GlobalLoader />
    </GlobalLoaderContext.Provider>
  );
}

export function useGlobalLoader() {
  const context = React.useContext(GlobalLoaderContext);
  if (!context) {
    throw new Error("useGlobalLoader must be used within a GlobalLoaderProvider");
  }
  return context;
}
