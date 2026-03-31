(function (root) {
  function normalizeHealthPayload(data) {
    const heartRate = Number.parseInt(data.heartRate ?? data.heart_rate ?? data.bpm, 10);
    const calories = Number.parseFloat(data.calories ?? data.activeEnergy ?? data.kcal ?? 0);
    const vo2 = Number.parseFloat(data.vo2 ?? data.vo2max ?? 0);
    const zone = String(data.zone ?? data.hrZone ?? 'unknown');
    return {
      heartRate: Number.isFinite(heartRate) ? heartRate : null,
      calories: Number.isFinite(calories) ? calories : 0,
      vo2: Number.isFinite(vo2) ? vo2 : 0,
      zone,
      at: Date.now(),
    };
  }

  function createWatchBridge({ getUrl, getToken, onData, onError, onOffline }) {
    let pollId = null;
    let retry = 0;

    async function tick() {
      const url = getUrl();
      if (!url) return;
      try {
        const token = getToken();
        const response = await fetch(url, {
          cache: 'no-store',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const normalized = normalizeHealthPayload(await response.json());
        retry = 0;
        onData(normalized);
      } catch (error) {
        retry += 1;
        onError(error, retry);
        if (retry >= 3) onOffline();
      }
    }

    function start() {
      stop();
      tick();
      pollId = setInterval(() => {
        const delayFactor = Math.min(2 ** retry, 8);
        setTimeout(tick, (delayFactor - 1) * 250);
      }, 5000);
    }

    function stop() {
      if (pollId) clearInterval(pollId);
      pollId = null;
      retry = 0;
    }

    return { start, stop, tick };
  }

  const api = { normalizeHealthPayload, createWatchBridge };
  root.FitWatch = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
