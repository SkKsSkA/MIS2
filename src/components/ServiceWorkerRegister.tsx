"use client";

import { useEffect } from "react";

/** Регистрирует service worker (только в продакшене), чтобы приложение ставилось на экран и открытое приглашение работало офлайн. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* не критично */
    });
  }, []);
  return null;
}
