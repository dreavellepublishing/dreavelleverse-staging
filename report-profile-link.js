"use strict";
(async () => {
  const link = document.getElementById("report-management-link");
  const db = window.supabaseClient;
  if (!link || !db) return;
  try {
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError || !user) return;
    const { data, error } = await db.rpc("is_story_report_admin");
    if (!error && data === true) { link.hidden = false; link.style.display = ""; }
  } catch (err) { console.error("Admin link check failed", err); }
})();
