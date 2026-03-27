(function (root) {
  function createTimer({ onTick, onDone }) {
    let id = null;
    let seconds = 0;

    function start(totalSeconds) {
      stop();
      seconds = totalSeconds;
      id = setInterval(() => {
        seconds -= 1;
        onTick(seconds);
        if (seconds <= 0) {
          stop();
          onDone();
        }
      }, 1000);
    }

    function pause() {
      if (id) {
        clearInterval(id);
        id = null;
      }
    }

    function resume() {
      if (id || seconds <= 0) return;
      id = setInterval(() => {
        seconds -= 1;
        onTick(seconds);
        if (seconds <= 0) {
          stop();
          onDone();
        }
      }, 1000);
    }

    function stop() {
      if (id) clearInterval(id);
      id = null;
    }

    function getSeconds() {
      return seconds;
    }

    return { start, pause, resume, stop, getSeconds };
  }

  const api = { createTimer };
  root.FitTimer = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
