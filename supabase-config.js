/**
 * ROUH Perfumes — Supabase Connection Settings
 * ضع هنا رابط المشروع (Project URL) والمفتاح العام (anon public key) من:
 * Supabase Dashboard -> Project Settings -> API
 *
 * تنبيه أمني: ضع مفتاح anon public فقط — لا تضع service_role نهائياً في أي ملف أمامي.
 */
window.ROUH_SUPABASE_CONFIG = {
  url: "https://vzilxdzfixnjsdwpbnuc.supabase.co",
  anonKey: "sb_publishable_-fBWE8AiiVyDniW8c5VgRw_0aDf_Vkz",
};

window.isRouhSupabaseConfigured = function () {
  var cfg = window.ROUH_SUPABASE_CONFIG || {};
  return Boolean(
    typeof cfg.url === "string" &&
      cfg.url.trim().startsWith("https://") &&
      typeof cfg.anonKey === "string" &&
      cfg.anonKey.trim().length > 20
  );
};

window.getRouhSupabase = function () {
  if (!window.isRouhSupabaseConfigured()) return null;
  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    return null;
  }
  if (!window.__rouhSupabaseClient) {
    var cfg = window.ROUH_SUPABASE_CONFIG;
    window.__rouhSupabaseClient = window.supabase.createClient(
      cfg.url.trim(),
      cfg.anonKey.trim()
    );
  }
  return window.__rouhSupabaseClient;
};
