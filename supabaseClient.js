(() => {
  const SUPABASE_URL = "https://ektgqepurlifendrlenj.supabase.co";
  const SUPABASE_KEY = "sb_publishable_ODlrM4QhMbLHYrgEft4Sjg_yrQSA_bm";

  if (!window.supabase?.createClient) {
    throw new Error("Supabase library failed to load.");
  }

  window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
})();
