export function registerPwaServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Falha ao registrar o service worker do PWA.", error);
    });
  });
}
