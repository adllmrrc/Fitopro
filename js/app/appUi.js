(() => {
  let toastTimer = null;

  function showToast(msg, type = "") {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.className = "toast";
    if (type) t.classList.add(type);
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 3000);
  }

  function openModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = "flex";
    requestAnimationFrame(() => el.classList.add("open"));
  }

  function closeModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove("open");
    setTimeout(() => {
      if (!el.classList.contains("open")) el.style.display = "none";
    }, 320);
  }

  function navTo(page) {
    document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
    document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));
    document.getElementById("page-" + page)?.classList.add("active");
    document.getElementById("nav-" + page)?.classList.add("active");
    const scrollArea = document.getElementById("scroll-area");
    if (scrollArea) scrollArea.scrollTop = 0;
    if (page === "stats") {
      setTimeout(renderCharts, 80);
      renderStats();
    }
    if (page === "home") updateHomeUI();
    if (page === "profile") renderProfilePage();
  }

  function showLoading(msg = "Loading...", pct = 0) {
    const o = document.getElementById("loading-overlay");
    if (o) {
      o.style.display = "flex";
      requestAnimationFrame(() => o.classList.add("active"));
    }
    const m = document.getElementById("loading-msg");
    if (m) m.textContent = msg;
    const b = document.getElementById("loading-bar-fill");
    if (b) b.style.width = pct + "%";
  }

  function hideLoading(delay = 0) {
    setTimeout(() => {
      const o = document.getElementById("loading-overlay");
      if (!o) return;
      o.classList.remove("active");
      setTimeout(() => {
        o.style.display = "none";
      }, 320);
    }, delay);
  }

  function showConfirm(title, msg, cb) {
    document.getElementById("confirm-title").textContent = title;
    document.getElementById("confirm-msg").textContent = msg;
    document.getElementById("confirm-yes").onclick = () => {
      closeModal("confirm-modal");
      cb();
    };
    openModal("confirm-modal");
  }

  function setSyncStatus(status, label) {
    const dot = document.getElementById("sync-dot");
    const lbl = document.getElementById("sync-label");
    if (dot) {
      dot.className =
        "sync-dot" +
        (status === "online" ? "" : status === "syncing" ? " syncing" : " offline");
    }
    if (lbl) lbl.textContent = label;
  }

  function showSyncBanner(msg) {
    const b = document.getElementById("sync-banner");
    const m = document.getElementById("sync-banner-msg");
    if (b) b.style.display = "flex";
    if (m) m.textContent = msg;
  }

  function hideSyncBanner() {
    const b = document.getElementById("sync-banner");
    if (b) b.style.display = "none";
  }

  function haptic(p = [10]) {
    if (window.state?.profile?.settings?.haptic && "vibrate" in navigator) navigator.vibrate(p);
  }

  function timeAgo(dateStr) {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return Math.floor(diff / 60) + "m ago";
    if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
    const days = Math.floor(diff / 86400);
    if (days === 1) return "yesterday";
    if (days < 7) return days + " days ago";
    return new Date(dateStr).toLocaleDateString("en", { month: "short", day: "numeric" });
  }

  function fmtDuration(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }

  function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return "GOOD MORNING";
    if (h < 17) return "GOOD AFTERNOON";
    return "GOOD EVENING";
  }

  document.querySelectorAll(".overlay").forEach((o) => {
    o.style.display = "none";
    o.addEventListener("click", (e) => {
      if (e.target === o) closeModal(o.id);
    });
  });

  window.showToast = showToast;
  window.openModal = openModal;
  window.closeModal = closeModal;
  window.navTo = navTo;
  window.showLoading = showLoading;
  window.hideLoading = hideLoading;
  window.showConfirm = showConfirm;
  window.setSyncStatus = setSyncStatus;
  window.showSyncBanner = showSyncBanner;
  window.hideSyncBanner = hideSyncBanner;
  window.haptic = haptic;
  window.timeAgo = timeAgo;
  window.fmtDuration = fmtDuration;
  window.getGreeting = getGreeting;
})();
