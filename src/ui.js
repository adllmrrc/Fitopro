(function (root) {
  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'fr-FR';
    utter.rate = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }

  function playTone(type = 'ok') {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const freq = type === 'alert' ? 220 : type === 'success' ? 660 : 440;
    osc.frequency.value = freq;
    gain.gain.value = 0.02;
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  }

  function strongHaptic() {
    if (navigator.vibrate) navigator.vibrate([18, 30, 18]);
  }

  const api = { speak, playTone, strongHaptic };
  root.FitUI = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
