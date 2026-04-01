(() => {
  let deferredInstallPrompt = null;
  let swRegistration = null;
  let waitingWorker = null;
  let refreshingForUpdate = false;

  function setPwaState(nextState = {}) {
    window.FITOPRO_PWA = {
      ...(window.FITOPRO_PWA || {}),
      canInstall: !!deferredInstallPrompt,
      hasUpdate: !!waitingWorker,
      promptInstall: async () => {
        if (!deferredInstallPrompt) return false;
        deferredInstallPrompt.prompt();
        const outcome = await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
        setPwaState();
        return outcome?.outcome === "accepted";
      },
      applyUpdate: () => {
        if (!waitingWorker) return false;
        waitingWorker.postMessage({ type: "SKIP_WAITING" });
        return true;
      },
      dismissUpdate: () => {
        hideUpdateBanner();
      },
      ...nextState,
    };
  }

  function showUpdateBanner() {
    const banner = document.getElementById("pwa-update-banner");
    if (!banner) return;
    banner.style.display = "flex";
  }

  function hideUpdateBanner() {
    const banner = document.getElementById("pwa-update-banner");
    if (!banner) return;
    banner.style.display = "none";
  }

  function setWaitingWorker(worker) {
    waitingWorker = worker || null;
    setPwaState();
    if (waitingWorker) showUpdateBanner();
  }

  function trackInstallingWorker(worker) {
    if (!worker) return;
    worker.addEventListener("statechange", () => {
      if (worker.state === "installed" && navigator.serviceWorker.controller) {
        setWaitingWorker(worker);
      }
    });
  }

  function bindRegistration(registration) {
    swRegistration = registration;

    if (registration.waiting) {
      setWaitingWorker(registration.waiting);
    }

    registration.addEventListener("updatefound", () => {
      trackInstallingWorker(registration.installing);
    });

    if (registration.installing) {
      trackInstallingWorker(registration.installing);
    }

    const checkForUpdates = () => {
      if (!swRegistration) return;
      swRegistration.update().catch((error) => {
        console.error("Service worker update check failed:", error);
      });
    };

    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") checkForUpdates();
    });

    window.addEventListener("focus", checkForUpdates);
    window.setInterval(checkForUpdates, 15 * 60 * 1000);
  }

  window.applyPwaUpdate = () => {
    if (waitingWorker) {
      refreshingForUpdate = true;
      const bannerMsg = document.getElementById("pwa-update-msg");
      if (bannerMsg) bannerMsg.textContent = "Refreshing FitoPro with the latest version...";
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    }
  };

  window.dismissPwaUpdate = () => {
    hideUpdateBanner();
  };

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    setPwaState();
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    setPwaState();
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshingForUpdate) {
        window.location.reload();
      }
    });

    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("./sw.js")
        .then((registration) => {
          bindRegistration(registration);
          setPwaState();
        })
        .catch((error) => {
          console.error("Service worker registration failed:", error);
        });
    });
  } else {
    setPwaState();
  }
})();
