import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./styles/globals.css";
import { AppRouter } from "./router";
import { AuthProvider } from "./auth/auth-context";
import { ToastProvider } from "./components/toast/toast-context";
import { GlobalLoaderProvider } from "./components/common/global-loader-context";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <GlobalLoaderProvider>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <AppRouter />
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </GlobalLoaderProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
