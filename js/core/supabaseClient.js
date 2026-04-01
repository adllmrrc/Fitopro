(() => {
  const config = window.FITOPRO_CONFIG || {};
  const SUPABASE_URL = config.SUPABASE_URL;
  const SUPABASE_KEY = config.SUPABASE_ANON_KEY;

  if (!window.supabase?.createClient) {
    throw new Error("Supabase library failed to load.");
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Missing FitoPro Supabase configuration.");
  }

  window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
})();
