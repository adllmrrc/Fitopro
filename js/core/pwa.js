(() => {
  let deferredInstallPrompt = null;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    window.FITOPRO_PWA = {
      ...(window.FITOPRO_PWA || {}),
      canInstall: true,
      promptInstall: async () => {
        if (!deferredInstallPrompt) return false;
        deferredInstallPrompt.prompt();
        const outcome = await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
        return outcome?.outcome === "accepted";
      },
    };
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    window.FITOPRO_PWA = {
      ...(window.FITOPRO_PWA || {}),
      canInstall: false,
    };
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch((error) => {
        console.error("Service worker registration failed:", error);
      });
    });
  }
})();
