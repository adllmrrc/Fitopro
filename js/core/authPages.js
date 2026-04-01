(() => {
  function getHashParams() {
    const raw = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    return new URLSearchParams(raw);
  }

  function clearAuthParams() {
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  function getAppHomeUrl() {
    return new URL("../../index.html", window.location.href).href;
  }

  function buildFriendlyAuthMessage(error) {
    const raw = String(error?.message || error || "").toLowerCase();
    if (raw.includes("expired") || raw.includes("invalid")) {
      return "This link is invalid or expired. Request a fresh email and try again.";
    }
    if (raw.includes("otp")) {
      return "We could not verify this link. Request a new email and try again.";
    }
    if (raw.includes("same password")) {
      return "Choose a different password from your current one.";
    }
    if (raw.includes("password")) {
      return "Use a stronger password and try again.";
    }
    return error?.message || "Something went wrong while validating your link.";
  }

  async function establishSessionFromUrl({ fallbackType } = {}) {
    const search = new URLSearchParams(window.location.search);
    const hash = getHashParams();
    const errorDescription =
      search.get("error_description") || hash.get("error_description");
    const errorCode = search.get("error") || hash.get("error");

    if (errorCode || errorDescription) {
      throw new Error(
        decodeURIComponent((errorDescription || errorCode || "").replace(/\+/g, " "))
      );
    }

    const code = search.get("code");
    if (code) {
      const { data, error } = await window.sb.auth.exchangeCodeForSession(code);
      if (error) throw error;
      clearAuthParams();
      return data?.session || null;
    }

    const tokenHash = search.get("token_hash");
    const type = search.get("type") || fallbackType;
    if (tokenHash && type) {
      const { data, error } = await window.sb.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      });
      if (error) throw error;
      clearAuthParams();
      return data?.session || null;
    }

    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    if (accessToken && refreshToken) {
      const { data, error } = await window.sb.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) throw error;
      clearAuthParams();
      return data?.session || null;
    }

    const { data, error } = await window.sb.auth.getSession();
    if (error) throw error;
    return data?.session || null;
  }

  window.FITOPRO_AUTH_PAGES = {
    buildFriendlyAuthMessage,
    establishSessionFromUrl,
    getAppHomeUrl,
  };
})();
