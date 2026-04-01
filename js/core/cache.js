(() => {
  const cache = {
    get(k, def = {}) {
      try {
        return JSON.parse(localStorage.getItem("fp3.cache." + k) || "null") ?? def;
      } catch {
        return def;
      }
    },
    save(k, v) {
      try {
        localStorage.setItem("fp3.cache." + k, JSON.stringify(v));
      } catch {}
    },
    clear(k) {
      try {
        localStorage.removeItem("fp3.cache." + k);
      } catch {}
    },
  };

  window.cache = cache;
})();
