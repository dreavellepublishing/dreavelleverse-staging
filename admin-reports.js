"use strict";
// Separate client so this dashboard does not run the general site script.
const adminDb = supabase.createClient(
  "https://mdsxnmoezhnruojxnhcu.supabase.co",
  "sb_publishable_686NjuyFA7vEtx9_jCRI6A_FS4aFlCE"
);
const message = document.getElementById("admin-message");
const content = document.getElementById("admin-content");
const reportsEl = document.getElementById("admin-reports");
const allowedStatuses = ["pending", "reviewed", "resolved"];
const filter = document.getElementById("report-filter");
let allReports = [];
let storyTitles = new Map();
function setMessage(value) { message.textContent = value; }
function field(label, value) {
  const p = document.createElement("p");
  const strong = document.createElement("strong"); strong.textContent = label + ": ";
  p.append(strong, document.createTextNode(value == null ? "—" : String(value)));
  return p;
}
function showReports() {
  reportsEl.replaceChildren();
  const data = allReports.filter(r => filter.value === "all" || r.status === filter.value);
  setMessage(`${data.length} report(s) shown (${allReports.length} loaded; most recent 100 maximum).`);
  if (!data.length) { reportsEl.append(field("Reports", "No reports match this filter")); return; }
  renderReports(data);
}
async function loadReports() {
  setMessage("Loading reports…");
  reportsEl.replaceChildren();
  const { data, error } = await adminDb.from("story_reports")
    .select("id,story_id,reason,details,status,created_at")
    .order("created_at", { ascending: false }).limit(100);
  if (error) { setMessage("Could not load reports. Check your administrator permissions."); console.error(error); return; }
  allReports = data || [];
  storyTitles = new Map();
  const storyIds = [...new Set(allReports.map(r => r.story_id).filter(Boolean))];
  if (storyIds.length) {
    const { data: stories, error: storiesError } = await adminDb.from("stories")
      .select("id,title").in("id", storyIds);
    if (storiesError) console.error("Could not load reported story titles:", storiesError);
    else for (const story of stories || []) storyTitles.set(story.id, story.title || "Untitled Story");
  }
  showReports();
}
function renderReports(data) {
  for (const report of data) {
    const card = document.createElement("article"); card.className = "admin-card";
    const heading = document.createElement("h2"); heading.textContent = "Story report"; card.append(heading);
    card.append(field("Report ID", report.id), field("Story ID", report.story_id));
    card.append(field("Reported story", storyTitles.get(report.story_id) || "Title unavailable"));
    if (report.story_id) {
      const link = document.createElement("a");
      link.href = `read-story.html?id=${encodeURIComponent(report.story_id)}`;
      link.textContent = "View Story";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      const linkLine = document.createElement("p");
      linkLine.append(link);
      card.append(linkLine);
    }
    card.append(
      field("Reason", report.reason), field("Details", report.details),
      field("Submitted", report.created_at ? new Date(report.created_at).toLocaleString() : "—"),
      field("Current status", report.status));
    const label = document.createElement("label"); label.textContent = "Update status: ";
    const select = document.createElement("select");
    for (const status of allowedStatuses) {
      const option = document.createElement("option"); option.value = status;
      option.textContent = status[0].toUpperCase() + status.slice(1); select.append(option);
    }
    select.value = report.status;
    label.append(select);
    const button = document.createElement("button"); button.type = "button"; button.textContent = "Save status";
    const feedback = document.createElement("span"); feedback.setAttribute("role", "status");
    button.addEventListener("click", async () => {
      if (select.value === report.status) { feedback.textContent = "No change."; return; }
      button.disabled = true; feedback.textContent = "Saving…";
      const { error } = await adminDb.from("story_reports")
        .update({ status: select.value }).eq("id", report.id);
      button.disabled = false;
      if (error) { console.error(error); feedback.textContent = "Update failed; check permissions."; return; }
      report.status = select.value; feedback.textContent = "Status saved.";
      if (filter.value !== "all" && filter.value !== report.status) showReports();
    });
    card.append(label, button, feedback); reportsEl.append(card);
  }
}
async function init() {
  try {
    const { data: { user }, error: authError } = await adminDb.auth.getUser();
    if (authError || !user) { setMessage("Please log in with your administrator account first."); return; }
    const { data: isAdmin, error } = await adminDb.rpc("is_story_report_admin");
    if (error || isAdmin !== true) { setMessage("Access denied. This account is not authorized for report moderation."); return; }
    content.hidden = false;
    document.getElementById("cover-moderation").hidden = false;
    document.getElementById("covers-refresh").addEventListener("click", loadCoverReviews);
    await loadCoverReviews();
    document.getElementById("admin-refresh").addEventListener("click", loadReports);
    filter.addEventListener("change", showReports);
    await loadReports();
  } catch (error) { console.error(error); setMessage("Could not verify administrator access."); }
}
init();

// Pending covers are in a private storage bucket. Only authorized administrators
// can retrieve and approve them through database/storage RLS.
async function loadCoverReviews() {
  const area = document.getElementById("covers-list");
  const status = document.getElementById("covers-message");
  area.replaceChildren(); status.textContent = "Loading pending covers…";
  const { data, error } = await adminDb.from("dv_cover_reviews")
    .select("id,story_id,writer_id,storage_path,status,created_at")
    .eq("status", "pending").order("created_at", { ascending: true }).limit(100);
  if (error) { status.textContent = "Unable to load cover reviews. Run the included SQL setup first."; console.error(error); return; }
  status.textContent = `${(data || []).length} pending cover(s).`;
  for (const item of data || []) {
    const card = document.createElement("article"); card.className = "admin-card";
    card.append(field("Story ID",item.story_id),field("Submitted",new Date(item.created_at).toLocaleString()));
    const { data: signed, error: signError } = await adminDb.storage.from("pending-story-covers")
      .createSignedUrl(item.storage_path, 300);
    if (!signError && signed?.signedUrl) {
      const img = document.createElement("img"); img.src = signed.signedUrl;
      img.alt = "Submitted book cover"; img.style.cssText = "display:block;max-width:220px;max-height:320px;object-fit:contain;margin:12px 0";
      card.append(img);
    } else card.append(field("Preview", "Unavailable; check storage permissions"));
    const feedback = document.createElement("span"); feedback.setAttribute("role","status");
    for (const decision of ["approve", "reject"]) {
      const btn = document.createElement("button"); btn.type = "button";
      btn.textContent = decision === "approve" ? "Approve cover" : "Request changes";
      btn.addEventListener("click", async () => {
        if (!confirm(decision === "approve" ? "Approve this cover for public display?" : "Reject this cover and request a replacement?")) return;
        btn.disabled = true; feedback.textContent = "Saving decision…";
        let publicPath = null;
        if (decision === "approve") {
          const { data: file, error: downloadError } = await adminDb.storage.from("pending-story-covers").download(item.storage_path);
          if (downloadError || !file) { feedback.textContent = "Could not read submitted cover."; btn.disabled = false; return; }
          const ext = (item.storage_path.split(".").pop() || "jpg").toLowerCase();
          publicPath = `${item.writer_id}/${item.story_id}/approved-${item.id}.${ext}`;
          const { error: copyError } = await adminDb.storage.from("story-covers").upload(publicPath,file,{upsert:false,contentType:file.type || "image/jpeg"});
          if (copyError) { console.error(copyError); feedback.textContent = "Could not publish approved image. Check story-covers admin storage policy."; btn.disabled = false; return; }
        }
        const { error } = await adminDb.rpc("dv_decide_cover_review", { review_id: item.id, decision, approved_path: publicPath });
        if (error) {
          console.error(error);
          // The storage upload happens before the database decision. Clean up
          // an orphaned public copy if the decision fails; do not overwrite.
          if (decision === "approve" && publicPath) {
            const { error: cleanupError } = await adminDb.storage.from("story-covers").remove([publicPath]);
            if (cleanupError) console.error("Manual cleanup may be required:", publicPath, cleanupError);
          }
          feedback.textContent = "Decision failed. Check permissions and setup.";
          btn.disabled = false; return;
        }
        feedback.textContent = "Decision saved."; await loadCoverReviews();
      });
      card.append(btn);
    }
    card.append(feedback); area.append(card);
  }
}
