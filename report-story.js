
document.addEventListener("DOMContentLoaded", () => {
  const reportButton = document.getElementById("report-story-button");
  const storyId = new URLSearchParams(window.location.search).get("id");


  if (!reportButton) return;

  reportButton.addEventListener("click", () => {
    
const reason = prompt(
  "Why are you reporting this story?\n\n" +
  "1. Plagiarism or Copyright Violation\n" +
  "2. Harassment or Bullying\n" +
  "3. Inappropriate Content\n" +
  "4. Spam or Misleading Content\n" +
  "5. Other\n\n" +
  "Enter a number from 1 to 5:"
);

if (reason === null) return;

if (!["1", "2", "3", "4", "5"].includes(reason.trim())) {
  alert("Please enter a valid number from 1 to 5.");
  return;
}

submitStoryReport(storyId, reason.trim());


  });
});


async function submitStoryReport(storyId, reason) {
  if (!storyId) {
    alert("Story ID not found.");
    return;
  }

  const { data: { user }, error: authError } =
    await supabaseClient.auth.getUser();

  if (authError || !user) {
    alert("Please log in before reporting a story.");
    return;
  }

  const reasons = {
    "1": "Plagiarism or Copyright Violation",
    "2": "Harassment or Bullying",
    "3": "Inappropriate Content",
    "4": "Spam or Misleading Content",
    "5": "Other"
  };

  const selectedReason = reasons[reason];

  if (!selectedReason) {
    alert("Invalid reporting reason.");
    return;
  }

  const { data: newReport, error } = await supabaseClient
  .from("story_reports")
  .insert({
    story_id: storyId,
    reporter_id: user.id,
    reason: selectedReason
  })
  .select("id")
  .single();

  if (error) {
    console.error("Report submission error:", error);
    alert("Unable to submit report. Please try again.");
    return;
  }

  // Report submission is complete even if the email notification fails.
  alert("Your report has been submitted successfully.");

  try {
    const { error: notifyError } = await supabaseClient.functions.invoke(
      "notify-story-report",
      { body: { reportId: newReport.id } }
    );
    if (notifyError) console.error("Report notification failed:", notifyError);
  } catch (notifyError) {
    console.error("Report notification failed:", notifyError);
  }
}
