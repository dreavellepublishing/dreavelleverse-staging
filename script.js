/* Supabase Connection */
const SUPABASE_URL = "https://mdsxnmoezhnruojxnhcu.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_686NjuyFA7vEtx9_jCRI6A_FS4aFlCE";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);
window.supabaseClient = supabaseClient;

const writingArea = document.querySelector(".chapter-writing-area");
const wordCount = document.querySelector(".word-count");

if (writingArea && wordCount) {

    writingArea.addEventListener("input", function () {

        const text = writingArea.value.trim();

        if (text === "") {
            wordCount.textContent = "0 words";
            return;
        }

        const words = text.split(/\s+/);

        wordCount.textContent =
            words.length === 1
                ? "1 word"
                : `${words.length} words`;
    });

}

/* Automatic Draft Saving */

const chapterTitle = document.querySelector(".chapter-title-input");
const saveStatus = document.querySelector(".save-status");

async function saveDraftAutomatically() {

    if (!writingArea || !chapterTitle) {
        return;
    }

    const currentChapterNumber = Number(
        localStorage.getItem(
            "dreavelleVerseCurrentChapter"
        ) || "1"
    );

    const storyId =
        localStorage.getItem(
            "dreavelleVerseStoryId"
        );

    /* Keep local recovery copy */

    localStorage.setItem(
        "dreavelleVerseChapterTitle",
        chapterTitle.value
    );

    localStorage.setItem(
        "dreavelleVerseChapterContent",
        writingArea.value
    );

    if (!storyId) {
        return;
    }

    const { data: { session } } =
        await supabaseClient.auth.getSession();

    if (!session || !session.user) {
        return;
    }
const { data: existingChapter, error: statusError } =
    await supabaseClient
        .from("chapters")
        .select("status, publish_at")
        .eq("story_id", storyId)
        .eq("user_id", session.user.id)
        .eq("chapter_number", currentChapterNumber)
        .maybeSingle();

if (statusError) {
    console.error(
        "Could not check chapter status before autosave:",
        statusError
    );
    return;
}

const currentStatus = existingChapter?.status || "Draft";
const currentPublishAt = existingChapter?.publish_at || null;
    const { error } =
        await supabaseClient
            .from("chapters")
            .upsert(
                {
                    story_id: storyId,
                    user_id: session.user.id,
                    chapter_number:
                        currentChapterNumber,
                    title: chapterTitle.value,
                    content: writingArea.value,
                   status: currentStatus,
publish_at: currentPublishAt,
                    updated_at:
                        new Date().toISOString()
                },
                {
                    onConflict:
                        "story_id,chapter_number"
                }
            );

    if (error) {
        console.error(
            "Could not autosave chapter:",
            error
        );

        if (saveStatus) {
            saveStatus.textContent =
                "Saved locally";
        }

        return;
    }

    if (saveStatus) {

        saveStatus.classList.remove(
            "published",
            "draft"
        );

        saveStatus.classList.add("draft");

        saveStatus.textContent =
            "All changes saved";
    }
}

if (writingArea && chapterTitle) {

    writingArea.addEventListener("input", function () {
    if (saveStatus) {
        saveStatus.textContent = "Saving...";
    }

    setTimeout(function () {
        saveDraftAutomatically();
    }, 500);
});

   chapterTitle.addEventListener("input", function () {
    if (saveStatus) {
        saveStatus.textContent = "Saving...";
    }

    setTimeout(function () {
        saveDraftAutomatically();
    }, 500);
});
}

/* Restore Saved Draft */

async function restoreSavedDraft() {

    if (!writingArea || !chapterTitle) {
        return;
    }

    const currentChapterNumber = Number(
        localStorage.getItem(
            "dreavelleVerseCurrentChapter"
        ) || "1"
    );

    const storyId =
        localStorage.getItem(
            "dreavelleVerseStoryId"
        );

    if (!storyId) {
        return;
    }

    const { data: { session } } =
        await supabaseClient.auth.getSession();

    if (!session || !session.user) {
        return;
    }

    const { data: chapter, error } =
        await supabaseClient
            .from("chapters")
            .select("title, content, status")
            .eq("story_id", storyId)
            .eq("user_id", session.user.id)
            .eq(
                "chapter_number",
                currentChapterNumber
            )
            .maybeSingle();

    if (error) {
        console.error(
            "Could not restore chapter draft:",
            error
        );
        return;
    }

    if (!chapter) {
        return;
    }

    chapterTitle.value =
        chapter.title ||
        `Chapter ${currentChapterNumber}`;

    writingArea.value =
        chapter.content || "";

    if (saveStatus) {
        saveStatus.textContent =
            chapter.status === "Draft"
                ? "Draft recovered"
                : chapter.status;
    }

    const text = writingArea.value.trim();

    if (wordCount) {

        if (text === "") {
            wordCount.textContent = "0 words";
        } else {

            const words = text.split(/\s+/);

            wordCount.textContent =
                words.length === 1
                    ? "1 word"
                    : `${words.length} words`;
        }
    }
}

restoreSavedDraft();

/* Manual Save Draft Button */

const saveDraftButton = document.querySelector(".save-draft-button");

if (saveDraftButton) {

    saveDraftButton.addEventListener("click", async function () {

        saveDraftAutomatically();

        const currentChapterNumber = Number(
            localStorage.getItem(
                "dreavelleVerseCurrentChapter"
            ) || "1"
        );

        const storyId = localStorage.getItem(
            "dreavelleVerseStoryId"
        );

        if (!storyId) {
            console.error("No DreavelleVerse story ID found.");
            return;
        }

        const { data: { session } } =
            await supabaseClient.auth.getSession();

        if (!session || !session.user) {
            console.error("No logged-in user found.");
            return;
        }

        const draftData = {
            title: chapterTitle.value,
            content: writingArea.value
        };

        const { error } = await supabaseClient
            .from("chapters")
            .upsert(
                {
                    story_id: storyId,
                    user_id: session.user.id,
                    chapter_number: currentChapterNumber,
                    title: chapterTitle.value,
                    content: writingArea.value,
                    status: "Draft",
                    publish_at: null,
                    updated_at: new Date().toISOString()
                },
                {
                    onConflict: "story_id,chapter_number"
                }
            );

        if (error) {
            console.error(
                "Could not save chapter draft:",
                error
            );
            return;
        }

        /* Keep localStorage temporarily for existing features */

        localStorage.setItem(
            `dreavelleVerseDraftChapter${currentChapterNumber}`,
            JSON.stringify(draftData)
        );

        localStorage.removeItem(
            `dreavelleVerseRecoveryChapter${currentChapterNumber}`
        );

        localStorage.setItem(
            "dreavelleVerseChapterStatus",
            "Draft"
        );

        if (saveStatus) {
            saveStatus.classList.remove(
                "published",
                "draft"
            );

            saveStatus.classList.add("draft");
            saveStatus.textContent = "Draft saved";
        }
    });
}
const storyEditMode =
    new URLSearchParams(window.location.search).get("mode") === "edit";
    const storyFormHeading = document.querySelector(
    "#story-form-heading"
);

if (storyEditMode && storyFormHeading) {
    storyFormHeading.textContent = "Edit Story Information";
}

const storyFormGreeting = document.querySelector(
    "#story-form-greeting"
);

if (storyEditMode && storyFormGreeting) {
    storyFormGreeting.textContent = "Manage Your Story";
}

const storyFormIntro = document.querySelector(
    "#story-form-intro"
);

if (storyEditMode && storyFormIntro) {
    storyFormIntro.textContent =
        "Update your story details below. Your chapters will stay unchanged.";
}

/* Save Story Information */

const storyTitleInput = document.querySelector("#story-title");
const saveStoryButton = document.querySelector("#save-story-button");
const storyAuthorInput = document.querySelector("#story-author");

/* Use Logged In User As Author */

if (storyAuthorInput && !storyEditMode) {
    (async function () {
        const { data: { session } } =
            await supabaseClient.auth.getSession();

        if (!session || !session.user) {
            return;
        }

        const { data: profile, error } =
            await supabaseClient
                .from("profiles")
                .select("display_name")
                .eq("id", session.user.id)
                .maybeSingle();

        if (error) {
            console.error(
                "Could not load author name:",
                error
            );
        }

        const authorName =
            profile?.display_name ||
            session.user.user_metadata?.display_name ||
            session.user.email ||
            "";

        storyAuthorInput.value = authorName;
    })();
}

const storyDescriptionInput = document.querySelector("#story-description");
const storyGenreInput = document.querySelector("#story-genre");
const storyTagsInput = document.querySelector("#story-tags");
const storyCoverInput =
    document.querySelector("#story-cover");

let selectedStoryCover = null;

if (storyCoverInput) {
    storyCoverInput.addEventListener(
        "change",
        function () {
            selectedStoryCover =
                this.files[0] || null;
        }
    );
}
if (storyEditMode && saveStoryButton) {
    saveStoryButton.textContent = "Save Changes";
}
if (storyEditMode && storyTitleInput) {

    (async function () {

        const { data: { session } } =
            await supabaseClient.auth.getSession();

        if (!session || !session.user) {
            return;
        }

        const storyId =
            localStorage.getItem(
                "dreavelleVerseStoryId"
            );

        if (!storyId) {
            console.error(
                "Could not load story: Story ID not found."
            );
            return;
        }

        const { data: story, error } =
            await supabaseClient
                .from("stories")
                .select(
                    "title, author, description, genre, tags"
                )
                .eq("id", storyId)
                .eq("user_id", session.user.id)
                .single();

        if (error) {
            console.error(
                "Could not load story for editing:",
                error
            );
            return;
        }

        storyTitleInput.value =
            story.title || "";

        if (storyAuthorInput) {
            storyAuthorInput.value =
                story.author || "";
        }

        if (storyDescriptionInput) {
            storyDescriptionInput.value =
                story.description || "";
        }

        if (storyGenreInput) {
            storyGenreInput.value =
                story.genre || "";
        }

        if (storyTagsInput) {
            storyTagsInput.value =
                story.tags || "";
        }

    })();
}

if (storyTitleInput && saveStoryButton) {

    saveStoryButton.addEventListener("click", async function () {
        const storyTitle = storyTitleInput.value.trim();

       if (storyTitle !== "") {
        const { data: { session } } =
    await supabaseClient.auth.getSession();

if (!session || !session.user) {
    return;
}

const storyAuthor =
    storyAuthorInput
        ? storyAuthorInput.value.trim()
        : "";

const storyDescription =
    storyDescriptionInput
        ? storyDescriptionInput.value.trim()
        : "";

const storyGenre =
    storyGenreInput
        ? storyGenreInput.value
        : "";

const storyTags =
    storyTagsInput
        ? storyTagsInput.value.trim()
        : "";
        if (!storyEditMode) {
    const { data: newStory, error: storyError } =
        await supabaseClient
            .from("stories")
            .insert({
                user_id: session.user.id,
                title: storyTitle,
                author: storyAuthor,
                description: storyDescription,
                genre: storyGenre,
                tags: storyTags,
                status: "Draft"
            })
            .select()
            .single();

    if (storyError) {
        console.error(
            "Could not save story:",
            storyError
        );
        return;
    }

    localStorage.setItem(
        "dreavelleVerseStoryId",
        newStory.id
    );
}

if (storyEditMode) {
    const storyId =
        localStorage.getItem(
            "dreavelleVerseStoryId"
        );

    if (!storyId) {
        console.error(
            "Could not update story: Story ID not found."
        );
        return;
    }

    const { error: storyUpdateError } =
        await supabaseClient
            .from("stories")
            .update({
                title: storyTitle,
                author: storyAuthor,
                description: storyDescription,
                genre: storyGenre,
                tags: storyTags,
                updated_at: new Date().toISOString()
            })
            .eq("id", storyId)
            .eq("user_id", session.user.id);

    if (storyUpdateError) {
        console.error(
            "Could not update story:",
            storyUpdateError
        );
        return;
    }
}

    localStorage.setItem(
        "dreavelleVerseStoryTitle",
        storyTitle
    );
localStorage.setItem(
    "dreavelleVerseStoryAuthor",
    storyAuthorInput ? storyAuthorInput.value.trim() : ""
);


localStorage.setItem(
    "dreavelleVerseStoryDescription",
    storyDescriptionInput ? storyDescriptionInput.value.trim() : ""
);


localStorage.setItem(
    "dreavelleVerseStoryGenre",
    storyGenreInput ? storyGenreInput.value : ""
);


localStorage.setItem(
    "dreavelleVerseStoryTags",
    storyTagsInput ? storyTagsInput.value.trim() : ""
);
if (selectedStoryCover) {
    const storyId = localStorage.getItem("dreavelleVerseStoryId");
    if (!storyId) { alert("Please save the story before submitting a cover."); return; }
    if (!selectedStoryCover.type.startsWith("image/") || selectedStoryCover.size > 5 * 1024 * 1024) {
        alert("Please choose an image under 5 MB."); return;
    }
    const extension = (selectedStoryCover.name.split(".").pop() || "jpg").toLowerCase();
    if (!["jpg","jpeg","png","webp"].includes(extension)) { alert("Use JPG, PNG, or WebP for your cover."); return; }
    const coverPath = `${session.user.id}/${storyId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabaseClient.storage.from("pending-story-covers")
        .upload(coverPath, selectedStoryCover, { upsert: false, contentType: selectedStoryCover.type });
    if (uploadError) { console.error(uploadError); alert("Cover submission failed. Please check that the moderation database setup has been completed."); return; }
    const { error: reviewError } = await supabaseClient.from("dv_cover_reviews").insert({
        story_id: storyId, writer_id: session.user.id, storage_path: coverPath, status: "pending"
    });
    if (reviewError) { console.error(reviewError); alert("Cover review request could not be saved. Please contact support."); return; }
    selectedStoryCover = null;
    alert("Cover submitted for administrator review. Your existing cover, if any, remains visible until approval.");
}

if (!storyEditMode) {
    localStorage.removeItem(
        "dreavelleVerseChapterTitle"
    );

    localStorage.removeItem(
        "dreavelleVerseChapterContent"
    );

    localStorage.removeItem(
    "dreavelleVerseChapter1"
);
localStorage.removeItem(
    "dreavelleVerseChapter2"
);
localStorage.removeItem(
    "dreavelleVerseChapterStatus"
);
localStorage.setItem(
    "dreavelleVerseTotalChapters",
    "1"
);
localStorage.setItem(
    "dreavelleVerseCurrentChapter",
    "1"
);
}
  if (storyEditMode) {
    window.location.href = "story-manager.html";
} else {
    window.location.href = "chapter-editor.html";
}
}
});
}

/* Display Story Title in Chapter Editor */

const editorStoryName = document.querySelector(".editor-story-name");

if (editorStoryName) {
    (async function loadEditorStoryName() {
        const { data: { session }, error: sessionError } =
            await supabaseClient.auth.getSession();

        if (sessionError || !session?.user) return;

        const urlStoryId = new URLSearchParams(window.location.search).get("id");
        let storyId = urlStoryId || localStorage.getItem("dreavelleVerseStoryId");

        if (!storyId) {
            const { data: latestStory, error: latestError } = await supabaseClient
                .from("stories")
                .select("id")
                .eq("user_id", session.user.id)
                .order("updated_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (latestError) {
                console.error("Could not find editor story:", latestError);
                return;
            }
            storyId = latestStory?.id;
        }

        if (!storyId) return;

        const { data: story, error } = await supabaseClient
            .from("stories")
            .select("title")
            .eq("id", storyId)
            .eq("user_id", session.user.id)
            .maybeSingle();

        if (error) {
            console.error("Could not load editor story title:", error);
            return;
        }

        if (!story) return;

        editorStoryName.textContent = story.title || "Untitled Story";
        localStorage.setItem("dreavelleVerseStoryId", storyId);
        localStorage.setItem("dreavelleVerseStoryTitle", story.title || "");
    })();
}


/* Display Story Information on Story Manager */

const managerStoryTitle =
    document.querySelector(".manager-story-title");

const managerStoryDescription =
    document.querySelector(".manager-story-description");

const managerStoryAuthor =
    document.querySelector(".manager-story-author");

const managerStoryGenre =
    document.querySelector(".manager-story-genre");

const managerStoryTags =
    document.querySelector(".manager-story-tags");

if (managerStoryTitle) {

    (async function () {

        const { data: { session } } =
            await supabaseClient.auth.getSession();

        if (!session || !session.user) {
            return;
        }

       let storyId =
    localStorage.getItem(
        "dreavelleVerseStoryId"
    );

if (!storyId) {

    const { data: latestStory, error: latestStoryError } =
        await supabaseClient
            .from("stories")
            .select("id")
            .eq("user_id", session.user.id)
            .order("updated_at", {
                ascending: false
            })
            .limit(1)
            .maybeSingle();

    if (latestStoryError) {
        console.error(
            "Could not recover story:",
            latestStoryError
        );
        return;
    }

    if (!latestStory) {
        managerStoryTitle.textContent =
            "Untitled Story";
        return;
    }

    storyId = latestStory.id;

    localStorage.setItem(
        "dreavelleVerseStoryId",
        storyId
    );
}

        const { data: story, error } =
            await supabaseClient
                .from("stories")
                .select(
    "title, author, description, genre, tags, cover_url, completion_status"
)
                .eq("id", storyId)
                .eq("user_id", session.user.id)
                .single();

        if (error) {
            console.error(
                "Could not load story:",
                error
            );
            return;
        }
        
        // Load likes and follows for this specific story
        const storyLikeCount =
            document.getElementById("story-like-count");

        const storyFollowCount =
            document.getElementById("story-follow-count");

        if (storyLikeCount) {
            storyLikeCount.textContent = "…";
        }

        if (storyFollowCount) {
            storyFollowCount.textContent = "…";
        }

        const [likesResult, followsResult] = await Promise.all([
            supabaseClient
                .from("story_likes")
                .select("*", { count: "exact", head: true })
                .eq("story_id", storyId),

            supabaseClient
                .from("story_follows")
                .select("*", { count: "exact", head: true })
                .eq("story_id", storyId)
        ]);

        if (storyLikeCount) {
            storyLikeCount.textContent = likesResult.error
                ? "—"
                : String(likesResult.count ?? 0);
        }

        if (storyFollowCount) {
            storyFollowCount.textContent = followsResult.error
                ? "—"
                : String(followsResult.count ?? 0);
        }

        if (likesResult.error) {
            console.error("Unable to load story likes:", likesResult.error);
        }

        if (followsResult.error) {
            console.error("Unable to load story follows:", followsResult.error);
        }

        managerStoryTitle.textContent =
            story.title || "Untitled Story";
        const managerStoryCover =
    document.getElementById("manager-story-cover");

if (managerStoryCover) {
    if (story.cover_url) {
        managerStoryCover.src = story.cover_url;
        managerStoryCover.style.display = "block";
    } else {
        managerStoryCover.removeAttribute("src");
        managerStoryCover.style.display = "none";
    }
}

        if (managerStoryDescription) {
    const fullDescription = story.description || "";
    const previewLength = 280;

    managerStoryDescription.textContent = "";

    if (fullDescription.length > previewLength) {
        const previewText = document.createElement("span");
        previewText.textContent =
            fullDescription.slice(0, previewLength).trimEnd() + "... ";

        const readMoreButton = document.createElement("button");
        readMoreButton.type = "button";
        readMoreButton.className = "manager-read-more";
        readMoreButton.textContent = "Read More";

        let expanded = false;

        readMoreButton.addEventListener("click", () => {
            expanded = !expanded;

            previewText.textContent = expanded
                ? fullDescription + " "
                : fullDescription.slice(0, previewLength).trimEnd() + "... ";

            readMoreButton.textContent =
                expanded ? "Show Less" : "Read More";
        });

        managerStoryDescription.append(
            previewText,
            readMoreButton
        );
    } else {
        managerStoryDescription.textContent = fullDescription;
    }
}

        if (managerStoryAuthor) {
            managerStoryAuthor.textContent =
                "Author: " +
                (story.author || "Unknown Author");
        }

        if (managerStoryGenre) {
            managerStoryGenre.textContent =
                story.genre
                    ? "Genre: " + story.genre
                    : "";
        }

        if (managerStoryTags) {
            managerStoryTags.textContent =
                story.tags
                    ? "Tags: " + story.tags
                    : "";
        }
    })();
}

/* Display Chapter Title on Story Manager */

const managerChapterTitle = document.querySelector(".manager-chapter-title");

if (managerChapterTitle) {

    const savedChapterTitle = localStorage.getItem(
        "dreavelleVerseChapterTitle"
    );

    if (savedChapterTitle) {
        managerChapterTitle.textContent = savedChapterTitle;
    }

}

/* Publish Chapter */

const publishChapterButton = document.querySelector(
    ".publish-chapter-button"
);

if (publishChapterButton) {
(async function syncPublishButtonWithSupabase() {
    const currentChapterNumber = Number(
        localStorage.getItem("dreavelleVerseCurrentChapter") || "1"
    );

    const storyId = localStorage.getItem(
        "dreavelleVerseStoryId"
    );

    const { data: { session } } =
        await supabaseClient.auth.getSession();

    if (!session || !session.user || !storyId) {
        return;
    }

    const { data: chapter, error } =
        await supabaseClient
            .from("chapters")
            .select("status")
            .eq("story_id", storyId)
            .eq("user_id", session.user.id)
            .eq("chapter_number", currentChapterNumber)
            .maybeSingle();

    if (error) {
        console.error(
            "Could not check chapter publish status:",
            error
        );
        return;
    }

    if (
        chapter &&
        chapter.status &&
        chapter.status.toLowerCase() === "published"
    ) {
        publishChapterButton.textContent = "Unpublish Chapter";
    } else {
        publishChapterButton.textContent = "Publish Chapter";
    }
})();
    publishChapterButton.addEventListener("click", async function () {

       await saveDraftAutomatically();

        const currentChapterNumber = Number(
            localStorage.getItem(
                "dreavelleVerseCurrentChapter"
            ) || "1"
        );

        const storyId = localStorage.getItem(
            "dreavelleVerseStoryId"
        );

        const { data: { session } } =
            await supabaseClient.auth.getSession();

        if (!session || !session.user || !storyId) {
            console.error(
                "Cannot publish chapter: missing user or story."
            );
            return;
        }

        const { error } = await supabaseClient
            .from("chapters")
            .upsert(
                {
                    story_id: storyId,
                    user_id: session.user.id,
                    chapter_number: currentChapterNumber,
                    title: chapterTitle.value,
                    content: writingArea.value,
                    status: "Published",
                    publish_at: null,
                    updated_at: new Date().toISOString()
                },
                {
                    onConflict: "story_id,chapter_number"
                }
            );

        if (error) {
            console.error(
                "Could not publish chapter:",
                error
            );
            return;
        }
const { error: storyPublishError } = await supabaseClient
    .from("stories")
    .update({
        status: "Published",
        updated_at: new Date().toISOString()
    })
    .eq("id", storyId)
    .eq("user_id", session.user.id);

if (storyPublishError) {
    console.error(
        "Could not update story status:",
        storyPublishError
    );
    alert("Chapter published, but story status could not be updated.");
    return;
}
        localStorage.setItem(
            "dreavelleVerseChapterStatus",
            "Published"
        );

        localStorage.removeItem(
            `dreavelleVerseDraftChapter${currentChapterNumber}`
        );

        localStorage.removeItem(
            `dreavelleVerseRecoveryChapter${currentChapterNumber}`
        );

        localStorage.removeItem(
            `dreavelleVerseScheduledChapter${currentChapterNumber}`
        );

        if (saveStatus) {
            saveStatus.textContent = "Published";
        }

        publishChapterButton.textContent = "Published";

        /* Create Notification for Followed Story */

        const storyIsFollowed =
            localStorage.getItem(
                "dreavelleVerseStoryFollowed"
            ) === "true";

        const followedAtChapter = Number(
            localStorage.getItem(
                "dreavelleVerseFollowedAtChapter"
            ) || "0"
        );

        if (
            storyIsFollowed &&
            currentChapterNumber > followedAtChapter
        ) {

            const notificationStoryTitle =
                localStorage.getItem(
                    "dreavelleVerseStoryTitle"
                ) || "Untitled Story";

            const notificationChapterData =
                localStorage.getItem(
                    `dreavelleVerseChapter${currentChapterNumber}`
                );

            if (notificationChapterData) {

                const parsedNotificationChapter =
                    JSON.parse(notificationChapterData);

                const notifications = JSON.parse(
                    localStorage.getItem(
                       `dreavelleVerseNotifications_${(await supabaseClient.auth.getUser()).data.user?.id}`
                    ) || "[]"
                );

                const { data: { user: notificationPreferenceUser } } =
    await supabaseClient.auth.getUser();

const storyNotificationsEnabled =
    localStorage.getItem(
        "dreavelleVerseStoryNotificationsEnabled_" +
        (notificationPreferenceUser?.id || "guest")
    ) !== "false";

                const notificationAlreadyExists =
                    notifications.some(
                        function (notification) {
                            return (
                                Number(notification.chapterNumber) ===
                                currentChapterNumber
                            );
                        }
                    );

                if (
                    storyNotificationsEnabled &&
                    !notificationAlreadyExists
                ) {

                    notifications.unshift({
                        storyTitle:
                            notificationStoryTitle,

                        chapterNumber:
                            currentChapterNumber,

                        chapterTitle:
                            parsedNotificationChapter.title ||
                            `Chapter ${currentChapterNumber}`,

                        createdAt: Date.now(),

                        read: false
                    });

                    localStorage.setItem(
                        `dreavelleVerseNotifications_${(await supabaseClient.auth.getUser()).data.user?.id}`,
                        JSON.stringify(notifications)
                    );
                }
            }
        }
    });
}

/* Unpublish Chapter */

const unpublishChapterButton = document.querySelector(
    "#unpublish-chapter-button"
);

if (unpublishChapterButton) {

    unpublishChapterButton.addEventListener("click", async function () {

        const currentChapterNumber =
            localStorage.getItem(
                "dreavelleVerseCurrentChapter"
            ) || "1";

        const confirmUnpublish = confirm(
            "Are you sure you want to unpublish this chapter? It will become a draft and will no longer be visible to readers."
        );

        if (!confirmUnpublish) {
            return;
        }

        const storyId =
            localStorage.getItem(
                "dreavelleVerseStoryId"
            );

        const { data: { session } } =
            await supabaseClient.auth.getSession();

        if (!session || !storyId) {
            alert("Could not unpublish chapter.");
            return;
        }

        const { data: updatedChapter, error } =
            await supabaseClient
                .from("chapters")
                .update({
                    status: "Draft",
                    publish_at: null,
                    updated_at: new Date().toISOString()
                })
                .eq("story_id", storyId)
.eq("user_id", session.user.id)
.eq(
    "chapter_number",
    Number(currentChapterNumber)
)
.select();

console.log("Unpublish result:", updatedChapter);

        if (error) {
            console.error(
                "Could not unpublish chapter:",
                error
            );

            alert("Could not unpublish chapter.");
            return;
        }

        // Hide a story from Discover when its last published chapter is unpublished.
        const { data: remainingPublished, error: remainingError } = await supabaseClient
            .from("chapters")
            .select("id")
            .eq("story_id", storyId)
            .eq("status", "Published")
            .limit(1);
        if (remainingError) {
            console.error("Could not check remaining published chapters:", remainingError);
        } else if (!remainingPublished?.length) {
            const { error: draftStoryError } = await supabaseClient
                .from("stories")
                .update({ status: "Draft", updated_at: new Date().toISOString() })
                .eq("id", storyId)
                .eq("user_id", session.user.id);
            if (draftStoryError) console.error("Could not change story to Draft:", draftStoryError);
        }

        const publishedChapterKey =
            `dreavelleVerseChapter${currentChapterNumber}`;

        const publishedChapter =
            localStorage.getItem(publishedChapterKey);

        if (publishedChapter) {

            const chapterData =
                JSON.parse(publishedChapter);

            chapterData.status = "Draft";

            localStorage.setItem(
                `dreavelleVerseDraftChapter${currentChapterNumber}`,
                JSON.stringify(chapterData)
            );

            localStorage.removeItem(
                publishedChapterKey
            );
        }

        localStorage.removeItem(
            `dreavelleVerseRecoveryChapter${currentChapterNumber}`
        );

        localStorage.setItem(
            "dreavelleVerseChapterStatus",
            "Draft"
        );

        if (saveStatus) {
            saveStatus.textContent = "Draft";
        }

        if (publishChapterButton) {
            publishChapterButton.textContent =
                "Publish Chapter";
        }
        if (unpublishChapterButton) {
    unpublishChapterButton.style.display = "none";
}

        alert(
            "Chapter unpublished successfully. It is now saved as a draft."
        );

        window.location.reload();
    });

}

/* Display Chapter Status on Story Manager */

const managerChapterStatus = document.querySelector(
    ".manager-chapter-status"
);

if (managerChapterStatus) {

    const savedChapterStatus = localStorage.getItem(
        "dreavelleVerseChapterStatus"
    );

    if (savedChapterStatus) {
        managerChapterStatus.textContent = savedChapterStatus;
    }
if (savedChapterStatus === "Published") {
    if (publishChapterButton) {
        publishChapterButton.style.display = "none";
    }

    if (unpublishChapterButton) {
        unpublishChapterButton.style.display = "";
    }
} else {
    if (publishChapterButton) {
        publishChapterButton.style.display = "";
        publishChapterButton.textContent = "Publish Chapter";
    }

    if (unpublishChapterButton) {
        unpublishChapterButton.style.display = "none";
    }
}
}

/* Add New Chapter - Supabase */

const addChapterButton = document.querySelector(
    "#add-chapter-button"
);

if (addChapterButton) {
  addChapterButton.addEventListener(
    "click",
    async function (event) {

        event.preventDefault();

            const storyId =
                localStorage.getItem("dreavelleVerseStoryId");

            const { data: { session } } =
                await supabaseClient.auth.getSession();

            if (!session || !storyId) {
                alert("Could not create a new chapter.");
                return;
            }

            const { data: chapters, error } =
                await supabaseClient
                    .from("chapters")
                    .select("chapter_number")
                    .eq("story_id", storyId)
                    .eq("user_id", session.user.id)
                    .order("chapter_number", {
                        ascending: false
                    })
                    .limit(1);

            if (error) {
                console.error(
                    "Could not find latest chapter:",
                    error
                );

                alert("Could not create a new chapter.");
                return;
            }

            let nextChapterNumber = 1;

            if (chapters && chapters.length > 0) {
                nextChapterNumber =
                    Number(chapters[0].chapter_number) + 1;
            }

            localStorage.setItem(
                "dreavelleVerseCurrentChapter",
                nextChapterNumber.toString()
            );

            localStorage.removeItem(
                "dreavelleVerseChapterTitle"
            );

            localStorage.removeItem(
                "dreavelleVerseChapterContent"
            );

            localStorage.removeItem(
                "dreavelleVerseChapterStatus"
            );

            window.location.href =
                "chapter-editor.html";
        }
    );
}

/* Current Chapter Number */

if (!localStorage.getItem("dreavelleVerseCurrentChapter")) {
    localStorage.setItem(
        "dreavelleVerseCurrentChapter",
        "1"
    );
}

/* Total Chapters */

if (!localStorage.getItem("dreavelleVerseTotalChapters")) {
    localStorage.setItem(
    "dreavelleVerseTotalChapters",
    "1"
);

}

/* Display Current Chapter Number */

const editorChapterNumber = document.querySelector(
    ".editor-chapter-number"
);

if (editorChapterNumber) {

    const currentChapterNumber = localStorage.getItem(
        "dreavelleVerseCurrentChapter"
    ) || "1";

    editorChapterNumber.textContent =
        `Chapter ${currentChapterNumber}`;
}

/* Store Chapter 1 Separately */

const existingChapterOne = localStorage.getItem(
    "dreavelleVerseChapter1"
);

if (!existingChapterOne) {

    const chapterOneData = {
        title: localStorage.getItem(
            "dreavelleVerseChapterTitle"
        ) || "Chapter 1",

        content: localStorage.getItem(
            "dreavelleVerseChapterContent"
        ) || "",

        status: localStorage.getItem(
            "dreavelleVerseChapterStatus"
        ) || "Draft"
    };

    localStorage.setItem(
        "dreavelleVerseChapter1",
        JSON.stringify(chapterOneData)
    );
}

/* Save Current Chapter Separately */

async function saveCurrentChapterSeparately() {

    if (!writingArea || !chapterTitle) {
        return;
    }

    const currentChapterNumber = Number(
        localStorage.getItem(
            "dreavelleVerseCurrentChapter"
        ) || "1"
    );

    const chapterData = {
        title: chapterTitle.value,
        content: writingArea.value,
        status: localStorage.getItem(
            "dreavelleVerseChapterStatus"
        ) || "Draft"
    };

    /* Keep localStorage working during migration */

    localStorage.setItem(
        `dreavelleVerseChapter${currentChapterNumber}`,
        JSON.stringify(chapterData)
    );

    /* Save chapter to Supabase */

    const { data: { session } } =
        await supabaseClient.auth.getSession();

    if (!session || !session.user) {
        console.error("No logged-in user.");
        return;
    }

    const storyId =
        localStorage.getItem(
            "dreavelleVerseStoryId"
        );

    if (!storyId) {
        console.error(
            "No DreavelleVerse story ID found."
        );
        return;
    }

    const { error } =
        await supabaseClient
            .from("chapters")
            .upsert(
                {
                    user_id: session.user.id,
                    story_id: storyId,
                    chapter_number:
                        currentChapterNumber,
                    title:
                        chapterData.title,
                    content:
                        chapterData.content,
                    status:
                        chapterData.status,
                    updated_at:
                        new Date().toISOString()
                },
                {
                    onConflict:
                        "story_id,chapter_number"
                }
            );

    if (error) {
        console.error(
            "Could not save chapter to Supabase:",
            error
        );
        return;
    }

    console.log(
        "Chapter saved to Supabase."
    );
}
/* Show Correct Publish / Unpublish Button from Supabase */
async function loadChapterPublishStatus() {

    if (!publishChapterButton || !unpublishChapterButton) {
        return;
    }

    const currentChapterNumber = Number(
        localStorage.getItem(
            "dreavelleVerseCurrentChapter"
        ) || "1"
    );

    const storyId = localStorage.getItem(
        "dreavelleVerseStoryId"
    );

    const { data: { session } } =
        await supabaseClient.auth.getSession();

    if (!session || !storyId) {
        return;
    }

    const { data: chapter, error } =
        await supabaseClient
            .from("chapters")
            .select("status")
            .eq("story_id", storyId)
            .eq("user_id", session.user.id)
            .eq("chapter_number", currentChapterNumber)
            .maybeSingle();

    if (error) {
        console.error(
            "Could not load chapter status:",
            error
        );
        return;
    }

    const currentStatus = chapter?.status || "Draft";

    if (currentStatus === "Published") {

        publishChapterButton.textContent = "Published";
        publishChapterButton.disabled = true;

        unpublishChapterButton.style.display = "inline-block";

    } else {

        publishChapterButton.textContent = "Publish Chapter";
        publishChapterButton.disabled = false;

        unpublishChapterButton.style.display = "none";
    }
}

loadChapterPublishStatus();
    if (wordCount) {

        const text = writingArea.value.trim();

        if (text === "") {
            wordCount.textContent = "0 words";
        } else {
            const words = text.split(/\s+/);

            wordCount.textContent =
                words.length === 1
                    ? "1 word"
                    : `${words.length} words`;
              }
    }

/* Display All Chapters on Story Manager */

const currentChapterNumber = Number(
    localStorage.getItem(
        "dreavelleVerseCurrentChapter"
    ) || "1"
);

const chapterList = document.querySelector("#chapter-list");

if (chapterList) {

    (async function loadStoryManagerChapters() {

        const storyId =
            localStorage.getItem(
                "dreavelleVerseStoryId"
            );

        const { data: { session } } =
            await supabaseClient.auth.getSession();

        if (!session || !storyId) {
            return;
        }

        const { data: chapters, error } =
            await supabaseClient
                .from("chapters")
                .select("*")
                .eq("story_id", storyId)
                .eq("user_id", session.user.id)
                .order("chapter_number", {
                    ascending: true
                });

        if (error) {
            console.error(
                "Could not load chapters:",
                error
            );
            return;
        }

        chapterList.innerHTML = "";

        if (!chapters || chapters.length === 0) {
            return;
        }

        const lastExistingChapter =
            chapters[chapters.length - 1]
                .chapter_number;

        chapters.forEach(function (chapterData) {

            const chapterNumber =
                chapterData.chapter_number;

            const chapterItem =
                document.createElement("div");

            chapterItem.className = "chapter-item";

            const chapterStatus =
                chapterData.status || "Draft";

            chapterItem.innerHTML = `
                <div>
                    <p class="chapter-number">
                        Chapter ${chapterNumber}
                    </p>

                    <h3>
                        ${chapterData.title ||
                        `Chapter ${chapterNumber}`}
                    </h3>

                    <p class="chapter-status ${
                        chapterStatus === "Published"
                            ? "published"
                            : chapterStatus === "Scheduled"
                            ? "scheduled"
                            : "draft"
                    }">
                        ${chapterStatus}
                    </p>
                </div>

                <div class="chapter-card-actions">

                    ${chapterNumber > 1 ? `
                        <button
                            type="button"
                            class="move-chapter-button move-up-button"
                            data-chapter="${chapterNumber}"
                        >
                            ↑ Move Up
                        </button>
                    ` : ""}

                    ${chapterNumber < lastExistingChapter ? `
                        <button
                            type="button"
                            class="move-chapter-button move-down-button"
                            data-chapter="${chapterNumber}"
                        >
                            ↓ Move Down
                        </button>
                    ` : ""}

                    <a
                        href="chapter-editor.html"
                        class="edit-chapter-button"
                        data-chapter="${chapterNumber}"
                    >
                        Edit Chapter
                    </a>

                </div>
            `;

            chapterList.appendChild(chapterItem);
        });

        const editChapterButtons =
            document.querySelectorAll(
                ".edit-chapter-button"
            );

        editChapterButtons.forEach(function (button) {

            button.addEventListener(
                "click",
                function () {

                    const selectedChapter =
                        button.getAttribute(
                            "data-chapter"
                        );

                    localStorage.setItem(
                        "dreavelleVerseCurrentChapter",
                        selectedChapter
                    );
                }
            );
        });

    })();
}

/* Open Selected Chapter */

const editChapterButtons = document.querySelectorAll(
    ".edit-chapter-button"
);

editChapterButtons.forEach(function (button) {

    button.addEventListener("click", function () {

        const selectedChapter =
            button.getAttribute("data-chapter");

        localStorage.setItem(
            "dreavelleVerseCurrentChapter",
            selectedChapter
        );

    });

});
/* Load Current Chapter */

async function loadCurrentChapter() {

    if (!writingArea || !chapterTitle) {
        return;
    }

    const currentChapterNumber = Number(
        localStorage.getItem(
            "dreavelleVerseCurrentChapter"
        ) || "1"
    );

    const storyId =
        localStorage.getItem(
            "dreavelleVerseStoryId"
        );

    const { data: { session } } =
        await supabaseClient.auth.getSession();

    if (!session || !storyId) {
        return;
    }

    const { data: chapterData, error } =
        await supabaseClient
            .from("chapters")
            .select("*")
            .eq("story_id", storyId)
            .eq("user_id", session.user.id)
            .eq(
                "chapter_number",
                currentChapterNumber
            )
            .maybeSingle();

    if (error) {
        console.error(
            "Could not load chapter:",
            error
        );
        return;
    }

    if (chapterData) {

        chapterTitle.value =
            chapterData.title ||
            `Chapter ${currentChapterNumber}`;

        writingArea.value =
            chapterData.content || "";

        const status =
            chapterData.status || "Draft";

        localStorage.setItem(
            "dreavelleVerseChapterTitle",
            chapterTitle.value
        );

        localStorage.setItem(
            "dreavelleVerseChapterContent",
            writingArea.value
        );

        localStorage.setItem(
            "dreavelleVerseChapterStatus",
            status
        );

    } else {

        chapterTitle.value =
            `Chapter ${currentChapterNumber}`;

        writingArea.value = "";

        localStorage.setItem(
            "dreavelleVerseChapterTitle",
            chapterTitle.value
        );

        localStorage.setItem(
            "dreavelleVerseChapterContent",
            ""
        );

        localStorage.setItem(
            "dreavelleVerseChapterStatus",
            "Draft"
        );
    }

    if (saveStatus) {

        const status =
            localStorage.getItem(
                "dreavelleVerseChapterStatus"
            ) || "Draft";

        saveStatus.textContent = status;

        saveStatus.classList.remove(
            "published",
            "draft"
        );

        saveStatus.classList.add(
            status === "Published"
                ? "published"
                : "draft"
        );
    }
}
/* Reader View */

const readerChapters = document.querySelector(
    "#reader-chapters"
);

const readerStoryTitle = document.querySelector(
    "#reader-story-title"
);
const readerStoryCover = document.querySelector(
    "#reader-story-cover"
);

if (readerChapters) {

    (async function () {

       const urlParams = new URLSearchParams(window.location.search);
const storyId = urlParams.get("id");

        if (!storyId) {
            return;
        }

        const { data: story, error } =
            await supabaseClient
                .from("stories")
                .select("title, cover_url")
                .eq("id", storyId)
                .single();

        if (error) {
            console.error(
                "Could not load reader story:",
                error
            );
            return;
        }

        const storyTitle =
            story.title || "Untitled Story";

        const storyCover =
            story.cover_url || "";

        if (readerStoryCover && storyCover) {
            readerStoryCover.innerHTML = `
                <img
                    src="${storyCover}"
                    class="reader-story-cover-image"
                    alt="${storyTitle} cover"
                >
            `;
        }

        if (readerStoryTitle) {
            readerStoryTitle.textContent =
                storyTitle;
        }

    })();

}

/* Load Published Chapters from Supabase */
if (readerChapters) {
    (async function () {
        const urlParams = new URLSearchParams(window.location.search);
        const storyId = urlParams.get("id");

        if (!storyId) {
            return;
        }

        const { data: publishedChapters, error: chaptersError } =
            await supabaseClient
                .from("chapters")
                .select("id, chapter_number, title")
                .eq("story_id", storyId)
                .eq("status", "Published")
                .order("chapter_number", { ascending: true });

        if (chaptersError) {
            console.error(
                "Could not load published chapters:",
                chaptersError
            );
            return;
        }

        readerChapters.innerHTML = "";

        if (!publishedChapters || publishedChapters.length === 0) {
            readerChapters.innerHTML =
                "<p>No published chapters yet.</p>";
            return;
        }

        publishedChapters.forEach((chapter) => {
            const chapterCard = document.createElement("div");

            chapterCard.className =
                "reader-chapter-card";

            chapterCard.innerHTML = `
                <h2>
                    ${chapter.title || `Chapter ${chapter.chapter_number}`}
                </h2>

                <a
                    href="read-chapter.html?id=${storyId}&chapter=${chapter.chapter_number}"
                    class="read-chapter-button"
                >
                    Read Chapter
                </a>
            `;

            readerChapters.appendChild(chapterCard);
        });
    })();
}

/* Reader Chapter Page */

const chapterContent = document.querySelector(
    "#chapter-content"
);

const readingTitle = document.querySelector(
    "#reading-story-title"
);

const readingChapterTitle = document.querySelector(
    "#reading-chapter-title"
);

if (chapterContent) {
    (async function () {
        const urlParams = new URLSearchParams(window.location.search);
        const storyId = urlParams.get("id");
        const chapterNumber = Number(urlParams.get("chapter"));

        if (!storyId || !chapterNumber) {
            return;
        }

        const { data: story, error: storyError } =
            await supabaseClient
                .from("stories")
                .select("title")
                .eq("id", storyId)
                .single();

        if (!storyError && story && readingTitle) {
            readingTitle.textContent =
                story.title || "Untitled Story";
        }

        const { data: chapter, error: chapterError } =
            await supabaseClient
                .from("chapters")
                .select("title, content, status")
                .eq("story_id", storyId)
                .eq("chapter_number", chapterNumber)
                .eq("status", "Published")
                .maybeSingle();

        if (chapterError) {
            console.error(
                "Could not load published chapter:",
                chapterError
            );
            return;
        }

        if (chapter) {
            if (readingChapterTitle) {
                readingChapterTitle.textContent =
                    chapter.title || `Chapter ${chapterNumber}`;
            }

            chapterContent.textContent =
                chapter.content || "";
            // Local, per-reader fallback is saved on chapter open, independent of bookmarks/completion.
            // The account-specific key is also used if a progress table write fails.
            // Save the actual chapter URL, not a shared localStorage chapter value.
            try {
                const { data: { session } } = await supabaseClient.auth.getSession();
                if (session) {
                    localStorage.setItem(`dvLastRead:${session.user.id}:${storyId}`, String(chapterNumber));
                    const { error: progressError } = await supabaseClient.from("reading_progress").upsert({
                        user_id: session.user.id, story_id: storyId,
                        last_read_chapter: chapterNumber, updated_at: new Date().toISOString()
                    }, { onConflict: "user_id,story_id" });
                    if (progressError) console.warn("Could not save chapter progress:",progressError);
                }
            } catch (progressError) { console.warn("Reading progress:",progressError); }
            
if (story && chapter && chapter.content) {
    const { error: readError } =
        await supabaseClient.rpc("dv_record_story_read", {
            p_story_id: storyId
        });

    if (readError) {
        console.error("Unable to record story read:", readError);
    }
}

        } else {
            if (readingChapterTitle) {
                readingChapterTitle.textContent =
                    "Chapter Unavailable";
            }

            chapterContent.textContent =
                "This chapter is not published yet.";
        }
    })();
}

/* Reader Chapter Selection */

const readButtons = document.querySelectorAll(
    ".read-chapter-button"
);


readButtons.forEach(function(button){

    button.addEventListener(
        "click",
        function(){

            const chapterNumber =
            button.getAttribute(
                "data-chapter"
            );


            localStorage.setItem(
                "dreavelleVerseReadingChapter",
                chapterNumber
            );

        }
    );

});

/* Reader chapter navigation: chapter_number is the stored sequence key;
   displayed labels must come from published chapter titles (Prologue, Chapter 1, etc.). */
const previousButton = document.querySelector(".reading-navigation button:first-child");
const nextButton = document.querySelector(".reading-navigation button:last-child");
if (chapterContent && (previousButton || nextButton)) {
    [previousButton, nextButton].forEach(button => { if (button) button.hidden = true; });
    (async () => {
        const params = new URLSearchParams(location.search);
        const storyId = params.get("id");
        const current = Number(params.get("chapter"));
        if (!storyId || !Number.isInteger(current) || current < 0) return;
        const { data: chapters, error } = await supabaseClient.from("chapters")
            .select("chapter_number,title")
            .eq("story_id", storyId)
            .eq("status", "Published")
            .order("chapter_number", { ascending: true });
        if (error) { console.warn("Chapter navigation:", error); return; }
        const ordered = (chapters || []).filter(c => Number.isInteger(Number(c.chapter_number)));
        const position = ordered.findIndex(c => Number(c.chapter_number) === current);
        if (position < 0) return;
        const labelFor = c => (c.title || `Chapter ${c.chapter_number}`).trim();
        const configure = (button, chapter, direction) => {
            if (!button || !chapter) return;
            button.hidden = false;
            button.disabled = false;
            button.removeAttribute("aria-disabled");
            button.textContent = direction === "previous"
                ? `← Previous · ${labelFor(chapter)}`
                : `Next · ${labelFor(chapter)} →`;
            button.onclick = () => {
                location.href = `read-chapter.html?id=${encodeURIComponent(storyId)}&chapter=${encodeURIComponent(chapter.chapter_number)}`;
            };
        };
        configure(previousButton, ordered[position - 1], "previous");
        configure(nextButton, ordered[position + 1], "next");
    })();
}

// Completion remains an optional, reversible, per-chapter action.
const markCompletedButton = document.querySelector("#mark-completed-button");
if (markCompletedButton) {
    const params = new URLSearchParams(location.search);
    const completionStory = params.get("id");
    const completionChapter = Number(params.get("chapter"));
    if (completionStory && Number.isInteger(completionChapter) && completionChapter > 0) {
        markCompletedButton.style.display = "inline-block";
        (async () => {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (!session) return;
            const key = `dvCompleted:${session.user.id}:${completionStory}:${completionChapter}`;
            const render = () => {
                const done = localStorage.getItem(key) === "true";
                markCompletedButton.textContent = done ? "↶ Mark as Unread" : "✓ Mark as Completed";
                markCompletedButton.setAttribute("aria-pressed", String(done));
            };
            render();
            markCompletedButton.addEventListener("click", () => {
                if (localStorage.getItem(key) === "true") localStorage.removeItem(key);
                else localStorage.setItem(key, "true");
                render();
            });
        })();
    }
}

/* Discover: ten published stories, rotated daily, with compact cards. */
const discoverStories = document.querySelector("#discover-stories");
if (discoverStories) {
    (async function loadDiscoverStories() {
        const { data: stories, error } = await supabaseClient.from("stories")
            .select("id,title,author,genre,tags,cover_url")
            .eq("status", "Published").order("id", { ascending: true }).limit(1000);
        if (error) { console.error(error); discoverStories.textContent = "Unable to load stories right now."; return; }
        const preferences = JSON.parse(localStorage.getItem("dreavelleVerseReadingPreferences") || "[]");
        const pool = (stories || []).filter(story => !preferences.length || preferences.includes(story.genre || ""));
        const eligible = [];
        // Preserve the existing rule: only stories with a published chapter appear.
        for (let i = 0; i < pool.length; i += 80) {
            const batch = pool.slice(i, i + 80);
            const { data: chapters, error: chapterError } = await supabaseClient.from("chapters")
                .select("story_id").in("story_id", batch.map(s => s.id)).eq("status", "Published");
            if (chapterError) { console.error(chapterError); discoverStories.textContent = "Unable to load stories right now."; return; }
            const published = new Set((chapters || []).map(c => String(c.story_id)));
            eligible.push(...batch.filter(s => published.has(String(s.id))));
        }
        discoverStories.replaceChildren();
        if (!eligible.length) { discoverStories.textContent = "No published stories yet."; return; }
        const day = Math.floor(Date.now() / 86400000);
        const offset = day % eligible.length;
        const selected = Array.from({ length: Math.min(10, eligible.length) }, (_, i) => eligible[(offset + i) % eligible.length]);
        for (const story of selected) {
            const card = document.createElement("article"); card.className = "story-card";
            if (story.cover_url && /^https?:\/\//i.test(story.cover_url)) {
                const cover = document.createElement("img"); cover.className = "story-cover-image";
                cover.src = story.cover_url; cover.alt = `${story.title || "Story"} cover`; cover.loading = "lazy"; card.append(cover);
            } else {
                const cover = document.createElement("div"); cover.className = "story-cover-placeholder"; cover.textContent = "Story Cover"; card.append(cover);
            }
            const add = (tag, value, cls) => { const node = document.createElement(tag); node.textContent = value; if (cls) node.className = cls; card.append(node); };
            add("h3", story.title || "Untitled Story");
            add("p", `By ${story.author || "Unknown Author"}`, "discover-story-author");
            add("p", `Genre: ${story.genre || "—"}`, "discover-story-genre");
            add("p", `Tags: ${Array.isArray(story.tags) ? story.tags.join(", ") : (story.tags || "—")}`, "discover-story-tags");
            const read = document.createElement("a"); read.className = "start-reading-button";
            read.href = `read-story.html?id=${encodeURIComponent(story.id)}`; read.textContent = "Start Reading"; card.append(read);
            discoverStories.append(card);
        }
    })().catch(error => { console.error(error); discoverStories.textContent = "Unable to load stories right now."; });
}
    /* Display Story Information on Reader Story Page */

const readerStoryAuthor = document.querySelector("#reader-story-author");
const readerStoryGenre = document.querySelector("#reader-story-genre");
const readerStoryTags = document.querySelector("#reader-story-tags");

if (
    readerStoryAuthor ||
    readerStoryGenre ||
    readerStoryTags
) {
    (async function () {

        const urlParams = new URLSearchParams(window.location.search);
const storyId = urlParams.get("id");

        if (!storyId) {
            return;
        }

        const { data: story, error } =
            await supabaseClient
                .from("stories")
                .select("author, genre, tags")
                .eq("id", storyId)
                .single();

        if (error) {
            console.error(
                "Could not load reader story information:",
                error
            );
            return;
        }

        if (readerStoryAuthor) {
            readerStoryAuthor.textContent =
                story.author || "Unknown Author";
        }

        if (readerStoryGenre) {
            readerStoryGenre.textContent =
                "Genre: " +
                (story.genre || "Not specified");
        }

        if (readerStoryTags) {
            readerStoryTags.textContent =
                "Tags: " +
                (story.tags || "No tags");
        }

    })();
}


/* Display Story Description on Reader Story Page */

const readerStoryDescription = document.querySelector(
    "#reader-story-description"
);

if (readerStoryDescription) {

    (async function () {

        const storyId =
  new URLSearchParams(window.location.search).get("id") ||
  localStorage.getItem("dreavelleVerseStoryId");

        if (!storyId) {
            return;
        }

        const { data: story, error } =
            await supabaseClient
                .from("stories")
                .select("description")
                .eq("id", storyId)
                .single();

        if (error) {
            console.error(
                "Could not load story description:",
                error
            );
            return;
        }

        readerStoryDescription.textContent =
            story.description ||
            "Story description will appear here.";

    })();
}

/* Add Story to Library */
const addToLibraryButton =
    document.querySelector("#add-to-library-button");

if (addToLibraryButton) {
      (async function () {
    const { data: { session } } =
      await supabaseClient.auth.getSession();

    if (!session) return;

    const storyId =
      new URLSearchParams(window.location.search).get("id") ||
      localStorage.getItem("dreavelleVerseStoryId");

    if (!storyId) return;

    const { data, error } = await supabaseClient
      .from("library")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("story_id", storyId)
      .maybeSingle();

    if (error) {
      console.error("Error checking library status:", error);
      return;
    }

    if (data) {
      addToLibraryButton.textContent = "Added to Library";
      addToLibraryButton.disabled = true;
    }
  })();
    addToLibraryButton.addEventListener(
        "click",
        async function () {
            const {
                data: { session }
            } = await supabaseClient.auth.getSession();

            if (!session) {
                alert("Please log in to add this story to your library.");
                return;
            }

            const storyId =
                new URLSearchParams(window.location.search).get("id") ||
                localStorage.getItem("dreavelleVerseStoryId");

            if (!storyId) {
                alert("Story not found.");
                return;
            }

            const { data: existingEntry, error: checkError } =
                await supabaseClient
                    .from("library")
                    .select("id")
                    .eq("user_id", session.user.id)
                    .eq("story_id", storyId)
                    .maybeSingle();

            if (checkError) {
                console.error(
                    "Error checking library:",
                    checkError
                );
                return;
            }

            if (existingEntry) {
                addToLibraryButton.textContent =
                    "Added to Library";
                return;
            }

            const { error } =
                await supabaseClient
                    .from("library")
                    .insert({
                        user_id: session.user.id,
                        story_id: storyId
                    });

            if (error) {
                console.error(
                    "Error adding story to library:",
                    error
                );
                return;
            }

            addToLibraryButton.textContent =
                "Added to Library";
        }
    );
}

   /* Library Page - Supabase */

const libraryStories = document.querySelector("#library-stories");
const librarySearchInput = document.querySelector("#library-search-input");
const librarySearchButton = document.querySelector("#library-search-button");

let libraryStoryData = [];

/* Load the logged-in user's library from Supabase */
async function loadLibraryFromSupabase() {
    if (!libraryStories) {
        return;
    }

    const {
        data: { session }
    } = await supabaseClient.auth.getSession();

    if (!session) {
        libraryStories.innerHTML = `
            <p>Please log in to view your library.</p>
        `;
        return;
    }

    const { data: libraryRows, error: libraryError } =
        await supabaseClient
            .from("library")
            .select("story_id")
            .eq("user_id", session.user.id);

    if (libraryError) {
        console.error("Error loading library:", libraryError);

        libraryStories.innerHTML = `
            <p>Unable to load your library.</p>
        `;
        return;
    }

    if (!libraryRows || libraryRows.length === 0) {
        libraryStoryData = [];

        libraryStories.innerHTML = `
            <p>You haven't added any stories to your library yet.</p>
        `;
        return;
    }

    const storyIds = libraryRows.map(row => row.story_id);

    const { data: stories, error: storiesError } =
        await supabaseClient
            .from("stories")
            .select(`
                id,
                title,
                author,
                description,
                genre,
                tags,
                cover_url,
                status
            `)
            .in("id", storyIds)
            .eq("status", "Published");

    if (storiesError) {
        console.error("Error loading library stories:", storiesError);

        libraryStories.innerHTML = `
            <p>Unable to load your saved stories.</p>
        `;
        return;
    }

    libraryStoryData = stories || [];

    renderLibraryStories(libraryStoryData);
}


/* Display stories in the Library */
function renderLibraryStories(stories) {
    if (!libraryStories) {
        return;
    }

    if (!stories || stories.length === 0) {
        libraryStories.innerHTML = `
            <p>No stories found.</p>
        `;
        return;
    }

    libraryStories.innerHTML = stories
        .map(story => {
            const cover = story.cover_url
                ? `
                    <img
                        src="${story.cover_url}"
                        class="story-cover-image"
                        alt="${story.title || "Story"} cover"
                    >
                `
                : `
                    <div class="story-cover-placeholder">
                        Story Cover
                    </div>
                `;

            return `
                <div class="story-card">
                    ${cover}

                    <h3>${story.title || "Untitled Story"}</h3>

                    <p class="discover-story-author">
                        By ${story.author || "Unknown Author"}
                    </p>

                    <p class="discover-story-genre">
                        Genre: ${story.genre || ""}
                    </p>

                    <p class="discover-story-tags">
                        Tags: ${story.tags || ""}
                    </p>

                    <button
                        type="button"
                        class="start-reading-button library-read-story-button"
                        data-story-id="${story.id}"
                    >
                        Start Reading
                    </button>

                    <button type="button" class="library-continue-button" data-story-id="${story.id}" hidden>Continue Reading</button>
                    <button type="button" class="library-bookmarks-button" data-story-id="${story.id}">View Bookmarks</button>
                    <div class="library-bookmarks-list" data-story-id="${story.id}" hidden></div>

                    <button
                        type="button"
                        class="library-remove-button"
                        data-story-id="${story.id}"
                    >
                        Remove from Library
                    </button>
                </div>
            `;
        })
        .join("");

    addLibraryButtonEvents();
}


/* Library buttons */
function addLibraryButtonEvents() {
    const readButtons =
        document.querySelectorAll(".library-read-story-button");

    readButtons.forEach(button => {
        button.addEventListener("click", function () {
            const storyId = this.dataset.storyId;

            localStorage.setItem(
                "dreavelleVerseReadingStoryId",
                storyId
            );

           window.location.href = `read-story.html?id=${encodeURIComponent(storyId)}`;
        });
    });


    // Reader-specific progress and chapter bookmarks from Supabase.
    (async () => {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) return;
        const userId = session.user.id;
        const [progressResult, bookmarksResult] = await Promise.all([
            supabaseClient.from("reading_progress").select("story_id,last_read_chapter").eq("user_id",userId),
            supabaseClient.from("chapter_bookmarks").select("story_id,chapter_number").eq("user_id",userId)
        ]);
        if (progressResult.error) console.warn("Reading progress:",progressResult.error);
        if (bookmarksResult.error) console.warn("Bookmarks:",bookmarksResult.error);
        const progress = new Map((progressResult.data || []).map(x => [x.story_id,x.last_read_chapter]));
        const bookmarks = new Map();
        (bookmarksResult.data || []).forEach(x => {
            if (!bookmarks.has(x.story_id)) bookmarks.set(x.story_id,[]);
            bookmarks.get(x.story_id).push(x.chapter_number);
        });
        const continueButtons = [...document.querySelectorAll(".library-continue-button")];
        const chapterTitles = new Map();
        await Promise.all(continueButtons.map(async button => {
            const storyId = button.dataset.storyId;
            const savedFromAccount = Number(progress.get(storyId));
            const savedLocally = Number(localStorage.getItem(`dvLastRead:${userId}:${storyId}`));
            const chapter = Number.isInteger(savedFromAccount) && savedFromAccount >= 0 && progress.has(storyId)
                ? savedFromAccount : savedLocally;
            if (!Number.isInteger(chapter) || chapter < 0 || (!progress.has(storyId) && !localStorage.getItem(`dvLastRead:${userId}:${storyId}`))) return;
            const { data, error } = await supabaseClient.from("chapters")
                .select("chapter_number,title,status")
                .eq("story_id",storyId)
                .eq("chapter_number",chapter)
                .eq("status","Published")
                .maybeSingle();
            if (error || !data) return;
            const chapterTitle = (data.title || `Chapter ${chapter}`).trim();
            button.hidden = false;
            button.textContent = `Continue Reading · ${chapterTitle}`;
            button.addEventListener("click", () => {
                location.href = `read-chapter.html?id=${encodeURIComponent(storyId)}&chapter=${encodeURIComponent(chapter)}`;
            });
        }));
        document.querySelectorAll(".library-bookmarks-button").forEach(button => {
            const chapters = [...new Set(bookmarks.get(button.dataset.storyId) || [])].sort((a,b)=>a-b);
            button.textContent = `View Bookmarks (${chapters.length})`;
            button.addEventListener("click", () => {
                const list = document.querySelector(`.library-bookmarks-list[data-story-id="${button.dataset.storyId}"]`);
                if (!list) return;
                list.hidden = !list.hidden;
                list.replaceChildren();
                if (!chapters.length) {list.textContent="No bookmarked chapters yet.";return;}
                chapters.forEach(chapter => {
                    const link = document.createElement("a");
                    link.href = `read-chapter.html?id=${encodeURIComponent(button.dataset.storyId)}&chapter=${chapter}`;
                    link.textContent = `Chapter ${chapter}`;
                    link.className = "library-bookmark-link";
                    list.appendChild(link);
                });
            });
        });
    })();

    const removeButtons =
        document.querySelectorAll(".library-remove-button");

    removeButtons.forEach(button => {
        button.addEventListener("click", async function () {
            const storyId = this.dataset.storyId;

            const {
                data: { session }
            } = await supabaseClient.auth.getSession();

            if (!session) {
                return;
            }

            const { error } = await supabaseClient
                .from("library")
                .delete()
                .eq("user_id", session.user.id)
                .eq("story_id", storyId);

            if (error) {
                console.error(
                    "Error removing story from library:",
                    error
                );
                return;
            }

            await loadLibraryFromSupabase();
        });
    });
}


/* Library Search */
function searchLibrary() {
    if (!librarySearchInput) {
        return;
    }

    const searchText =
        librarySearchInput.value.trim().toLowerCase();

    if (!searchText) {
        renderLibraryStories(libraryStoryData);
        return;
    }

    const filteredStories = libraryStoryData.filter(story => {
        const searchableText = `
            ${story.title || ""}
            ${story.author || ""}
            ${story.genre || ""}
            ${story.tags || ""}
        `.toLowerCase();

        return searchableText.includes(searchText);
    });

    renderLibraryStories(filteredStories);
}


if (librarySearchButton) {
    librarySearchButton.addEventListener(
        "click",
        searchLibrary
    );
}


if (librarySearchInput) {
    librarySearchInput.addEventListener(
        "keydown",
        function (event) {
            if (event.key === "Enter") {
                searchLibrary();
            }
        }
    );
}


/* Load Library */
if (libraryStories) {
    loadLibraryFromSupabase();
}

/* Discover Search */

const discoverSearchInput = document.querySelector(
    "#discover-search-input"
);

const discoverSearchButton = document.querySelector(
    "#discover-search-button"
);

function searchDiscover() {
    if (!discoverSearchInput || !discoverStories) return;
    const searchText = discoverSearchInput.value.trim().toLowerCase();
    discoverStories.querySelectorAll(".story-card").forEach(card => {
        card.style.display = !searchText || card.textContent.toLowerCase().includes(searchText)
            ? "" : "none";
    });
}

if (discoverSearchButton) {

    discoverSearchButton.addEventListener(
        "click",
        searchDiscover
    );
}

if (discoverSearchInput) {

    discoverSearchInput.addEventListener(
        "keydown",
        function (event) {

            if (event.key === "Enter") {
                searchDiscover();
            }
        }
    );
}

/* Discover user search: independent of the existing story search. */
const discoverUsersTab = document.querySelector("#search-users-tab");
const discoverStoriesTab = document.querySelector("#search-stories-tab");
const discoverUsersSection = document.querySelector("#discover-users-section");
const discoverStoriesSection = document.querySelector("#discover-stories-section");
const discoverUsersResults = document.querySelector("#discover-users-results");
let discoverSearchMode = "stories";

function setDiscoverSearchMode(mode) {
    discoverSearchMode = mode;
    const users = mode === "users";
    discoverUsersSection.hidden = !users;
    discoverStoriesSection.hidden = users;
    discoverUsersTab.classList.toggle("active", users);
    discoverStoriesTab.classList.toggle("active", !users);
    discoverUsersTab.setAttribute("aria-pressed", String(users));
    discoverStoriesTab.setAttribute("aria-pressed", String(!users));
    discoverSearchInput.placeholder = users ? "Search by username..." : "Search by title, author, or genre...";
    discoverSearchInput.value = "";
    if (!users) searchDiscover();
    else discoverUsersResults.textContent = "Enter a name above to find people.";
}

async function searchDiscoverUsers() {
    const name = discoverSearchInput.value.trim();
    discoverUsersResults.replaceChildren();
    if (!name) {
        discoverUsersResults.textContent = "Enter a username to search.";
        return;
    }
    discoverUsersResults.textContent = "Searching users...";
    // Escape SQL LIKE wildcards so usernames are searched literally.
    const pattern = name.replace(/[\\%_]/g, "\\$&");
    const { data: people, error } = await supabaseClient
        .from("profiles")
        .select("id, display_name, avatar_url, bio")
        .ilike("display_name", `%${pattern}%`)
        .order("display_name", { ascending: true })
        .limit(30);
    discoverUsersResults.replaceChildren();
    if (error) {
        console.error("User search error:", error);
        discoverUsersResults.textContent = "Unable to search users. Check the profiles table API access and SELECT policy.";
        return;
    }
    if (!people?.length) {
        discoverUsersResults.textContent = "No users found with that name.";
        return;
    }
    for (const person of people) {
        const card = document.createElement("article");
        card.className = "discover-user-card";
        const avatar = document.createElement("div");
        avatar.className = "discover-user-avatar";
        if (person.avatar_url && /^https:\/\//i.test(person.avatar_url)) {
            const img = document.createElement("img");
            img.src = person.avatar_url;
            img.alt = "";
            avatar.appendChild(img);
        } else {
            avatar.textContent = (person.display_name || "U").charAt(0).toUpperCase();
        }
        const info = document.createElement("div");
        info.className = "discover-user-info";
        const heading = document.createElement("h3");
        heading.textContent = person.display_name || "Reader";
        const bio = document.createElement("p");
        bio.textContent = person.bio || "DreavelleVerse member";
        info.append(heading, bio);
        const link = document.createElement("a");
        link.className = "start-reading-button";
        link.href = `public-profile.html?id=${encodeURIComponent(person.id)}`;
        link.textContent = "View Profile";
        card.append(avatar, info, link);
        discoverUsersResults.appendChild(card);

        // Display this writer's public books directly below their profile.
        const books = document.createElement("div");
        books.className = "discover-writer-books";
        books.style.margin = "12px 0 24px";
        books.textContent = "Loading published books...";
        discoverUsersResults.appendChild(books);

        const { data: writerStories, error: booksError } = await supabaseClient
            .from("stories")
            .select("id, title, cover_url, genre")
            .eq("user_id", person.id)
            .eq("status", "Published")
            .order("title", { ascending: true });

        books.replaceChildren();
        if (booksError) {
            console.error("Could not load writer books:", booksError);
            books.textContent = "Books are temporarily unavailable.";
            continue;
        }
        if (!writerStories?.length) continue;

        const { data: publishedChapters, error: chapterError } = await supabaseClient
            .from("chapters")
            .select("story_id")
            .in("story_id", writerStories.map(story => story.id))
            .eq("status", "Published");
        if (chapterError) {
            console.error("Could not check published chapters:", chapterError);
            books.textContent = "Books are temporarily unavailable.";
            continue;
        }
        const publicStoryIds = new Set((publishedChapters || []).map(chapter => chapter.story_id));
        const publicBooks = writerStories.filter(story => publicStoryIds.has(story.id));
        if (!publicBooks.length) continue;

        const booksHeading = document.createElement("h4");
        booksHeading.textContent = `Published books by ${person.display_name || "this writer"}`;
        books.appendChild(booksHeading);
        for (const story of publicBooks) {
            const book = document.createElement("article");
            book.className = "discover-user-card";
            book.style.marginTop = "10px";
            if (story.cover_url && /^https:\/\//i.test(story.cover_url)) {
                const cover = document.createElement("img");
                cover.src = story.cover_url;
                cover.alt = `${story.title || "Story"} cover`;
                cover.loading = "lazy";
                cover.style.cssText = "width:65px;height:90px;object-fit:cover;border-radius:6px";
                book.appendChild(cover);
            }
            const details = document.createElement("div");
            details.className = "discover-user-info";
            const title = document.createElement("h4");
            title.textContent = story.title || "Untitled Story";
            const genre = document.createElement("p");
            genre.textContent = story.genre || "Story";
            details.append(title, genre);
            const readLink = document.createElement("a");
            readLink.className = "start-reading-button";
            readLink.href = `read-story.html?id=${encodeURIComponent(story.id)}`;
            readLink.textContent = "Read Book";
            book.append(details, readLink);
            books.appendChild(book);
        }
    }
}

if (discoverUsersTab && discoverStoriesTab && discoverSearchInput && discoverSearchButton) {
    discoverUsersTab.addEventListener("click", () => setDiscoverSearchMode("users"));
    discoverStoriesTab.addEventListener("click", () => setDiscoverSearchMode("stories"));
    // Capture clicks before the existing story-only listener runs.
    discoverSearchButton.addEventListener("click", (event) => {
        if (discoverSearchMode === "users") {
            event.stopImmediatePropagation();
            searchDiscoverUsers();
        }
    }, true);
    discoverSearchInput.addEventListener("keydown", (event) => {
        if (discoverSearchMode === "users" && event.key === "Enter") {
            event.stopImmediatePropagation();
            searchDiscoverUsers();
        }
    }, true);
}

/* Remember Reader Progress */

document.addEventListener("click", async function (event) {

    const readChapterButton =
        event.target.closest(".read-chapter-button");

    if (!readChapterButton) {
        return;
    }

    const chapterNumber = Number(
        readChapterButton.getAttribute("data-chapter")
    );

    if (!chapterNumber) {
        return;
    }

    const storyId =
        localStorage.getItem(
            "dreavelleVerseStoryId"
        );

    if (!storyId) {
        return;
    }

    const { data: { session } } =
        await supabaseClient.auth.getSession();

    if (!session || !session.user) {
        return;
    }

    const { error } =
        await supabaseClient
            .from("reading_progress")
            .upsert(
                {
                    user_id: session.user.id,
                    story_id: storyId,
                    last_read_chapter: chapterNumber,
                    updated_at:
                        new Date().toISOString()
                },
                {
                    onConflict: "user_id,story_id"
                }
            );

    if (error) {
        console.error(
            "Could not save reading progress:",
            error
        );
        return;
    }

    localStorage.setItem(
        "dreavelleVerseLastReadChapter",
        chapterNumber.toString()
    );
});

/* Story Dashboard Statistics */

const totalChapterCount = document.querySelector(
    "#total-chapter-count"
);

const publishedChapterCount = document.querySelector(
    "#published-chapter-count"
);

const draftChapterCount = document.querySelector(
    "#draft-chapter-count"
);

const scheduledChapterCount = document.querySelector(
    "#scheduled-chapter-count"
);

async function loadStoryDashboardStatistics() {

    if (
        !totalChapterCount ||
        !publishedChapterCount ||
        !draftChapterCount ||
        !scheduledChapterCount
    ) {
        return;
    }

    const storyId =
        localStorage.getItem("dreavelleVerseStoryId");

    const { data: { session } } =
        await supabaseClient.auth.getSession();

    if (!session || !storyId) {
        return;
    }

    const { data: chapters, error } =
        await supabaseClient
            .from("chapters")
            .select("status")
            .eq("story_id", storyId)
            .eq("user_id", session.user.id);

    if (error) {
        console.error(
            "Could not load chapter statistics:",
            error
        );
        return;
    }

    const totalCount = chapters.length;

    const publishedCount =
        chapters.filter(
            chapter => chapter.status === "Published"
        ).length;

    const draftCount =
        chapters.filter(
            chapter => chapter.status === "Draft"
        ).length;

    const scheduledCount =
        chapters.filter(
            chapter => chapter.status === "Scheduled"
        ).length;

    totalChapterCount.textContent = totalCount;
    publishedChapterCount.textContent = publishedCount;
    draftChapterCount.textContent = draftCount;
    scheduledChapterCount.textContent = scheduledCount;
    
/* Load Story Reads from Supabase */

const storyReadCount = document.getElementById("story-read-count");

if (storyReadCount) {
    const { data: storyReadsData, error: storyReadsError } =
        await supabaseClient
            .from("stories")
            .select("total_reads")
            .eq("id", storyId)
            .eq("user_id", session.user.id)
            .single();

    if (storyReadsError) {
        console.error("Could not load story reads:", storyReadsError);
    } else {
        storyReadCount.textContent = storyReadsData?.total_reads ?? 0;
    }
}

}

loadStoryDashboardStatistics();

/* Delete Chapter - Supabase */

const deleteChapterButton = document.querySelector(
    "#delete-chapter-button"
);

if (deleteChapterButton) {
    deleteChapterButton.addEventListener(
        "click",
        async function () {
            const currentChapterNumber = Number(
                localStorage.getItem(
                    "dreavelleVerseCurrentChapter"
                )
            );

            const storyId =
                localStorage.getItem(
                    "dreavelleVerseStoryId"
                );

            if (!currentChapterNumber || !storyId) {
                return;
            }

            const confirmDelete = confirm(
                `Are you sure you want to delete Chapter ${currentChapterNumber}? This cannot be undone.`
            );

            if (!confirmDelete) {
                return;
            }

            const { data: { session } } =
                await supabaseClient.auth.getSession();

            if (!session) {
                alert("Please log in again.");
                return;
            }

            /* Delete selected chapter */

            const { error: deleteError } =
                await supabaseClient
                    .from("chapters")
                    .delete()
                    .eq("story_id", storyId)
                    .eq("user_id", session.user.id)
                    .eq(
                        "chapter_number",
                        currentChapterNumber
                    );

            if (deleteError) {
                console.error(
                    "Could not delete chapter:",
                    deleteError
                );
                alert("Could not delete chapter.");
                return;
            }

            /*
                Move every later chapter down by one.
                We load them first so each row can
                be updated using its unique ID.
            */

            const { data: laterChapters, error: loadError } =
                await supabaseClient
                    .from("chapters")
                    .select("id, chapter_number")
                    .eq("story_id", storyId)
                    .eq("user_id", session.user.id)
                    .gt(
                        "chapter_number",
                        currentChapterNumber
                    )
                    .order(
                        "chapter_number",
                        { ascending: true }
                    );

            if (loadError) {
                console.error(
                    "Chapter deleted, but later chapters could not be loaded:",
                    loadError
                );
                alert(
                    "Chapter was deleted, but chapter numbering could not be updated."
                );
                window.location.href =
                    "story-manager.html";
                return;
            }

            for (const chapter of laterChapters || []) {
                const { error: moveError } =
                    await supabaseClient
                        .from("chapters")
                        .update({
                            chapter_number:
                                Number(
                                    chapter.chapter_number
                                ) - 1,
                            updated_at:
                                new Date().toISOString()
                        })
                        .eq("id", chapter.id)
                        .eq(
                            "user_id",
                            session.user.id
                        );

                if (moveError) {
                    console.error(
                        "Could not renumber chapter:",
                        moveError
                    );
                    alert(
                        "Chapter was deleted, but one or more chapter numbers could not be updated."
                    );
                    window.location.href =
                        "story-manager.html";
                    return;
                }
            }

            /* Clear temporary editor values */

            localStorage.removeItem(
                "dreavelleVerseChapterTitle"
            );

            localStorage.removeItem(
                "dreavelleVerseChapterContent"
            );

            localStorage.removeItem(
                "dreavelleVerseChapterStatus"
            );

            localStorage.setItem(
                "dreavelleVerseCurrentChapter",
                "1"
            );

            alert(
                `Chapter ${currentChapterNumber} has been deleted.`
            );

            window.location.href =
                "story-manager.html";
        }
    );
}

/* Chapter Draft Recovery - Supabase */

let chapterRecoveryTimer = null;

async function saveChapterRecovery() {
    if (!writingArea || !chapterTitle) {
        return;
    }

    const currentChapterNumber = Number(
        localStorage.getItem(
            "dreavelleVerseCurrentChapter"
        ) || "1"
    );

    const storyId =
        localStorage.getItem(
            "dreavelleVerseStoryId"
        );

    if (!storyId) {
        return;
    }

    const { data: { session } } =
        await supabaseClient.auth.getSession();

    if (!session) {
        return;
    }

    const { error } =
        await supabaseClient
            .from("chapters")
            .update({
                title: chapterTitle.value,
                content: writingArea.value,
                updated_at: new Date().toISOString()
            })
            .eq("story_id", storyId)
            .eq("user_id", session.user.id)
            .eq(
                "chapter_number",
                currentChapterNumber
            );

    if (error) {
        console.error(
            "Could not autosave chapter:",
            error
        );
    }
}

function scheduleChapterRecoverySave() {
    clearTimeout(chapterRecoveryTimer);

    chapterRecoveryTimer = setTimeout(
        saveChapterRecovery,
        1000
    );
}

if (writingArea && chapterTitle) {
    writingArea.addEventListener(
        "input",
        scheduleChapterRecoverySave
    );

    chapterTitle.addEventListener(
        "input",
        scheduleChapterRecoverySave
    );
}

/* Continue Writing - Supabase */

const continueWritingButton = document.querySelector(
    "#continue-writing-button"
);

if (continueWritingButton) {

    continueWritingButton.addEventListener(
        "click",
        async function (event) {

            event.preventDefault();

            const storyId =
                localStorage.getItem("dreavelleVerseStoryId");

            const { data: { session } } =
                await supabaseClient.auth.getSession();

            if (!session || !storyId) {
                alert("Could not continue writing.");
                return;
            }

            const { data: chapters, error } =
                await supabaseClient
                    .from("chapters")
                    .select("chapter_number")
                    .eq("story_id", storyId)
                    .eq("user_id", session.user.id)
                    .order("chapter_number", {
                        ascending: false
                    })
                    .limit(1);

            if (error) {
                console.error(
                    "Could not load latest chapter:",
                    error
                );

                alert("Could not continue writing.");
                return;
            }

            if (!chapters || chapters.length === 0) {
                alert("No chapter found yet.");
                return;
            }

            const latestChapter =
                chapters[0].chapter_number;

            localStorage.setItem(
                "dreavelleVerseCurrentChapter",
                latestChapter.toString()
            );

            window.location.href =
                "chapter-editor.html";
        }
    );
}

/* Move Chapters Up and Down - Supabase */

async function swapChapters(firstChapterNumber, secondChapterNumber) {
    const storyId =
        localStorage.getItem("dreavelleVerseStoryId");

    const { data: { session } } =
        await supabaseClient.auth.getSession();

    if (!session || !storyId) {
        alert("Could not move chapter.");
        return false;
    }

    /* Load the two chapters */
    const { data: chapters, error: loadError } =
        await supabaseClient
            .from("chapters")
            .select("*")
            .eq("story_id", storyId)
            .eq("user_id", session.user.id)
            .in(
                "chapter_number",
                [firstChapterNumber, secondChapterNumber]
            );

    if (loadError) {
        console.error(
            "Could not load chapters for moving:",
            loadError
        );
        return false;
    }

    if (!chapters || chapters.length !== 2) {
        console.error(
            "Both chapters were not found."
        );
        return false;
    }

    const firstChapter =
        chapters.find(
            chapter =>
                Number(chapter.chapter_number) ===
                Number(firstChapterNumber)
        );

    const secondChapter =
        chapters.find(
            chapter =>
                Number(chapter.chapter_number) ===
                Number(secondChapterNumber)
        );

    if (!firstChapter || !secondChapter) {
        return false;
    }

    /*
       Use temporary chapter number 0 so we do not
       conflict with the unique story/chapter number.
    */

    const { error: firstMoveError } =
        await supabaseClient
            .from("chapters")
            .update({
                chapter_number: 0,
                updated_at: new Date().toISOString()
            })
            .eq("id", firstChapter.id)
            .eq("user_id", session.user.id);

    if (firstMoveError) {
        console.error(
            "Could not begin chapter move:",
            firstMoveError
        );
        return false;
    }

    const { error: secondMoveError } =
        await supabaseClient
            .from("chapters")
            .update({
                chapter_number: firstChapterNumber,
                updated_at: new Date().toISOString()
            })
            .eq("id", secondChapter.id)
            .eq("user_id", session.user.id);

    if (secondMoveError) {
        console.error(
            "Could not move second chapter:",
            secondMoveError
        );

        await supabaseClient
            .from("chapters")
            .update({
                chapter_number: firstChapterNumber
            })
            .eq("id", firstChapter.id);

        return false;
    }

    const { error: finalMoveError } =
        await supabaseClient
            .from("chapters")
            .update({
                chapter_number: secondChapterNumber,
                updated_at: new Date().toISOString()
            })
            .eq("id", firstChapter.id)
            .eq("user_id", session.user.id);

    if (finalMoveError) {
        console.error(
            "Could not finish chapter move:",
            finalMoveError
        );
        return false;
    }

    return true;
}


const chapterListContainer =
    document.querySelector("#chapter-list");

if (chapterListContainer) {
    chapterListContainer.addEventListener(
        "click",
        async function (event) {

            const moveUpButton =
                event.target.closest(".move-up-button");

            const moveDownButton =
                event.target.closest(".move-down-button");

            if (moveUpButton) {
                const chapterNumber =
                    Number(moveUpButton.dataset.chapter);

                if (chapterNumber <= 1) {
                    return;
                }

                const previousChapterNumber =
                    chapterNumber - 1;

                const success =
                    await swapChapters(
                        chapterNumber,
                        previousChapterNumber
                    );

                if (success) {
                    window.location.reload();
                }

                return;
            }

            if (moveDownButton) {
                const chapterNumber =
                    Number(moveDownButton.dataset.chapter);

                const storyId =
                    localStorage.getItem(
                        "dreavelleVerseStoryId"
                    );

                const { data: { session } } =
                    await supabaseClient.auth.getSession();

                if (!session || !storyId) {
                    return;
                }

                const { count, error } =
                    await supabaseClient
                        .from("chapters")
                        .select(
                            "*",
                            {
                                count: "exact",
                                head: true
                            }
                        )
                        .eq("story_id", storyId)
                        .eq(
                            "user_id",
                            session.user.id
                        );

                if (error) {
                    console.error(
                        "Could not count chapters:",
                        error
                    );
                    return;
                }

                const totalChapters = count || 0;

                if (chapterNumber >= totalChapters) {
                    return;
                }

                const nextChapterNumber =
                    chapterNumber + 1;

                const success =
                    await swapChapters(
                        chapterNumber,
                        nextChapterNumber
                    );

                if (success) {
                    window.location.reload();
                }
            }
        }
    );
}

/* Restore Chapter Schedule from Supabase */

async function restoreChapterScheduleFromSupabase() {
    if (!scheduleDateInput || !scheduleTimeInput) {
        return;
    }

    const currentChapterNumber =
        Number(
            localStorage.getItem(
                "dreavelleVerseCurrentChapter"
            )
        ) || 1;

    const storyId =
        localStorage.getItem("dreavelleVerseStoryId");

    const { data: { session } } =
        await supabaseClient.auth.getSession();

    if (!session || !storyId) {
        return;
    }

    const { data, error } =
        await supabaseClient
            .from("chapters")
            .select("status, publish_at")
            .eq("story_id", storyId)
            .eq("user_id", session.user.id)
            .eq("chapter_number", currentChapterNumber)
            .maybeSingle();

    if (error) {
        console.error(
            "Could not restore chapter schedule:",
            error
        );
        return;
    }

    if (
        !data ||
        data.status !== "Scheduled" ||
        !data.publish_at
    ) {
        scheduleDateInput.value = "";
        scheduleTimeInput.value = "";
        return;
    }

    const scheduledDate =
        new Date(data.publish_at);

    const year =
        scheduledDate.getFullYear();

    const month =
        String(
            scheduledDate.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            scheduledDate.getDate()
        ).padStart(2, "0");

    const hours =
        String(
            scheduledDate.getHours()
        ).padStart(2, "0");

    const minutes =
        String(
            scheduledDate.getMinutes()
        ).padStart(2, "0");

    scheduleDateInput.value =
        `${year}-${month}-${day}`;

    scheduleTimeInput.value =
        `${hours}:${minutes}`;
}

/* Cancel and Reschedule Chapter */

const scheduleDateInput =
    document.querySelector("#schedule-date");

const scheduleTimeInput =
    document.querySelector("#schedule-time");
const scheduleChapterButton =
    document.querySelector("#schedule-chapter-button");
const rescheduleChapterButton =
    document.querySelector("#reschedule-chapter-button");

const cancelScheduleButton =
    document.querySelector("#cancel-schedule-button");
restoreChapterScheduleFromSupabase();
async function updateScheduleButtons() {
    

    if (
        !scheduleChapterButton ||
        !rescheduleChapterButton ||
        !cancelScheduleButton
    ) {
        return;
    }

    const currentChapterNumber =
        Number(
            localStorage.getItem(
                "dreavelleVerseCurrentChapter"
            ) || "1"
        );

    const storyId =
        localStorage.getItem("dreavelleVerseStoryId");

    const { data: { session } } =
        await supabaseClient.auth.getSession();

    if (!session || !storyId) {
        scheduleChapterButton.style.display = "inline-block";
        rescheduleChapterButton.style.display = "none";
        cancelScheduleButton.style.display = "none";
        return;
    }

    const { data: chapter, error } =
        await supabaseClient
            .from("chapters")
            .select("status, publish_at")
            .eq("story_id", storyId)
            .eq("user_id", session.user.id)
            .eq("chapter_number", currentChapterNumber)
            .maybeSingle();

    if (error) {
        console.error(
            "Could not check chapter schedule:",
            error
        );
        return;
    }

    const isScheduled =
        chapter?.status === "Scheduled" &&
        chapter?.publish_at;

    if (isScheduled) {
        scheduleChapterButton.style.display = "none";
        rescheduleChapterButton.style.display = "inline-block";
        cancelScheduleButton.style.display = "inline-block";
    } else {
        scheduleChapterButton.style.display = "inline-block";
        rescheduleChapterButton.style.display = "none";
        cancelScheduleButton.style.display = "none";
    }
}
    if (
    scheduleChapterButton &&
    scheduleDateInput &&
    scheduleTimeInput
) {
    scheduleChapterButton.addEventListener(
        "click",
        async function () {
            const scheduleDate = scheduleDateInput.value;
            const scheduleTime = scheduleTimeInput.value;

            if (!scheduleDate || !scheduleTime) {
                alert("Please select both a publish date and time.");
                return;
            }

            const scheduledDateTime = new Date(
                `${scheduleDate}T${scheduleTime}`
            );

            if (scheduledDateTime.getTime() <= Date.now()) {
                alert("Please choose a future date and time.");
                return;
            }

            const currentChapterNumber =
                localStorage.getItem(
                    "dreavelleVerseCurrentChapter"
                ) || "1";

            const storyId =
                localStorage.getItem("dreavelleVerseStoryId");

            const { data: { session } } =
                await supabaseClient.auth.getSession();

            if (!session || !storyId) {
                alert("Could not schedule chapter.");
                return;
            }

            const { error } =
                await supabaseClient
                    .from("chapters")
                    .update({
                        status: "Scheduled",
                        publish_at: scheduledDateTime.toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .eq("story_id", storyId)
                    .eq("user_id", session.user.id)
                    .eq(
                        "chapter_number",
                        Number(currentChapterNumber)
                    );

            if (error) {
                console.error(
                    "Could not schedule chapter:",
                    error
                );
                alert("Could not schedule chapter.");
                return;
            }

            alert(
                `Chapter ${currentChapterNumber} has been scheduled for ${scheduledDateTime.toLocaleString()}.`
            );

            await updateScheduleButtons();
        }
    );
}
if (rescheduleChapterButton && scheduleDateInput && scheduleTimeInput) {
    rescheduleChapterButton.addEventListener(
        "click",
       async function () {

            const scheduleDate =
                scheduleDateInput.value;

            const scheduleTime =
                scheduleTimeInput.value;

            if (!scheduleDate || !scheduleTime) {
                alert(
                    "Please select both a publish date and time."
                );
                return;
            }

            const scheduledDateTime =
                new Date(
                    `${scheduleDate}T${scheduleTime}`
                );

            if (
                scheduledDateTime.getTime() <= Date.now()
            ) {
                alert(
                    "Please choose a future date and time."
                );
                return;
            }

            const currentChapterNumber =
                localStorage.getItem(
                    "dreavelleVerseCurrentChapter"
                ) || "1";

           const storyId =
    localStorage.getItem("dreavelleVerseStoryId");

const { data: { session } } =
    await supabaseClient.auth.getSession();

if (!session || !storyId) {
    alert("Could not reschedule chapter.");
    return;
}

const { error } =
    await supabaseClient
        .from("chapters")
        .update({
            status: "Scheduled",
            publish_at: scheduledDateTime.toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq("story_id", storyId)
        .eq("user_id", session.user.id)
        .eq(
            "chapter_number",
            Number(currentChapterNumber)
        );

if (error) {
    console.error(
        "Could not reschedule chapter:",
        error
    );
    alert("Could not reschedule chapter.");
    return;
}

            alert(
                `Chapter ${currentChapterNumber} has been rescheduled for ${scheduledDateTime.toLocaleString()}.`
            );

            updateScheduleButtons();
        }
    );
    }

if (cancelScheduleButton) {

    cancelScheduleButton.addEventListener(
        "click",
       async function () {

            const currentChapterNumber =
                localStorage.getItem(
                    "dreavelleVerseCurrentChapter"
                ) || "1";

            const confirmCancel =
                confirm(
                    `Cancel the schedule for Chapter ${currentChapterNumber}?`
                );

            if (!confirmCancel) {
                return;
            }
            const storyId =
    localStorage.getItem("dreavelleVerseStoryId");

const { data: { session } } =
    await supabaseClient.auth.getSession();

if (!session || !storyId) {
    alert("Could not cancel chapter schedule.");
    return;
}

const { error } =
    await supabaseClient
        .from("chapters")
        .update({
            status: "Draft",
            publish_at: null,
            updated_at: new Date().toISOString()
        })
        .eq("story_id", storyId)
        .eq("user_id", session.user.id)
        .eq(
            "chapter_number",
            Number(currentChapterNumber)
        );

if (error) {
    console.error(
        "Could not cancel chapter schedule:",
        error
    );
    alert("Could not cancel chapter schedule.");
    return;
}

            localStorage.setItem(
                "dreavelleVerseChapterStatus",
                "Draft"
            );

            scheduleDateInput.value = "";
            scheduleTimeInput.value = "";

            updateScheduleButtons();

            alert(
                `Chapter ${currentChapterNumber} schedule has been cancelled. The chapter is now a draft.`
            );
        }
    );
}

updateScheduleButtons();

/* Automatically Publish Scheduled Chapter */

async function publishScheduledChapterIfReady() {

   const currentChapterNumber =
    localStorage.getItem(
        "dreavelleVerseCurrentChapter"
    ) || "1";

const storyId =
    localStorage.getItem("dreavelleVerseStoryId");

const { data: { session } } =
    await supabaseClient.auth.getSession();

if (!session || !storyId) {
    return;
}

const { data: scheduledChapter, error: scheduleError } =
    await supabaseClient
        .from("chapters")
        .select("status, publish_at")
        .eq("story_id", storyId)
        .eq("user_id", session.user.id)
        .eq(
            "chapter_number",
            Number(currentChapterNumber)
        )
        .maybeSingle();

if (scheduleError || !scheduledChapter) {
    return;
}

if (
    scheduledChapter.status !== "Scheduled" ||
    !scheduledChapter.publish_at
) {
    return;
}

const publishTime =
    new Date(scheduledChapter.publish_at).getTime();

const currentTime = Date.now();

if (currentTime < publishTime) {
    return;
}

const { error } =
    await supabaseClient
        .from("chapters")
        .update({
            status: "Published",
            publish_at: null,
            updated_at: new Date().toISOString()
        })
        .eq("story_id", storyId)
        .eq("user_id", session.user.id)
        .eq(
            "chapter_number",
            Number(currentChapterNumber)
        );

if (error) {
    console.error(
        "Could not automatically publish chapter:",
        error
    );
    return;
}
   
    const { error: scheduledStoryError } = await supabaseClient
        .from("stories")
        .update({ status: "Published", updated_at: new Date().toISOString() })
        .eq("id", storyId)
        .eq("user_id", session.user.id);
    if (scheduledStoryError) console.error("Scheduled chapter published but story status update failed:", scheduledStoryError);

    /* Create Notification for Automatically Published Chapter */

const { data: { user: scheduledNotificationUser } } =
    await supabaseClient.auth.getUser();

const storyNotificationsEnabled =
    localStorage.getItem(
        "dreavelleVerseStoryNotificationsEnabled_" +
        (scheduledNotificationUser?.id || "guest")
    ) !== "false";

if (storyNotificationsEnabled) {

    const notifications = JSON.parse(
        localStorage.getItem(
           `dreavelleVerseNotifications_${(await supabaseClient.auth.getUser()).data.user?.id}`
        ) || "[]"
    );

    const notificationAlreadyExists =
        notifications.some(
            function (notification) {
                return (
                    Number(notification.chapterNumber) ===
                    Number(currentChapterNumber)
                );
            }
        );

    if (!notificationAlreadyExists) {

       const notificationStoryTitle =
    localStorage.getItem(
        "dreavelleVerseStoryTitle"
    ) || "Untitled Story";

        notifications.unshift({
            storyTitle:
                notificationStoryTitle,

            chapterNumber:
                Number(currentChapterNumber),

            chapterTitle:
              chapterTitle?.value ||
                `Chapter ${currentChapterNumber}`,

            createdAt:
                Date.now(),

            read:
                false
        });

        localStorage.setItem(
            `dreavelleVerseNotifications_${(await supabaseClient.auth.getUser()).data.user?.id}`,
            JSON.stringify(notifications)
        );
    }
}
}

publishScheduledChapterIfReady();

/* Random Bible Verse from Supabase */

const bibleVerseText = document.querySelector("#bible-verse-text");
const bibleVerseReference = document.querySelector("#bible-verse-reference");

async function loadRandomBibleVerse() {
    if (!bibleVerseText || !bibleVerseReference) return;

    try {
        const { data, error } = await supabaseClient
            .from("bible_verses")
            .select("book, chapter, verse, verse_text")
            .eq("is_active", true);

        if (error) {
            console.error("Error loading Bible verses:", error);
            return;
        }

        if (!data || data.length === 0) {
            console.warn("No active Bible verses found.");
            return;
        }

        const randomIndex = Math.floor(Math.random() * data.length);
        const selectedVerse = data[randomIndex];

        bibleVerseText.textContent = `"${selectedVerse.verse_text}"`;

        bibleVerseReference.textContent =
            `— ${selectedVerse.book} ${selectedVerse.chapter}:${selectedVerse.verse}`;

    } catch (error) {
        console.error("Bible verse error:", error);
    }
}

loadRandomBibleVerse();

/* Library Read Again */

const libraryReadingButton = document.querySelector(
    "#library-reading-button"
);

if (libraryReadingButton) {

    libraryReadingButton.addEventListener(
        "click",
        function () {

            const storyCompleted =
                localStorage.getItem(
                    "dreavelleVerseStoryCompleted"
                ) === "true";

            if (storyCompleted) {

                localStorage.setItem(
                    "dreavelleVerseReadingChapter",
                    "1"
                );

                localStorage.setItem(
                    "dreavelleVerseLastReadChapter",
                    "1"
                );
            }
        }
    );
}

/* Reader Chapter Bookmark */

const bookmarkChapterButton = document.querySelector(
    "#bookmark-chapter-button"
);

if (bookmarkChapterButton) {
    const bookmarkStoryId =
        new URLSearchParams(window.location.search).get("id") ||
        localStorage.getItem("dreavelleVerseReadingStoryId");

    const currentReadingChapter = Number(
        new URLSearchParams(window.location.search).get("chapter") ||
        localStorage.getItem("dreavelleVerseReadingChapter") || "1"
    );

    async function loadChapterBookmark() {
        if (!bookmarkStoryId) return;

        const { data: { session }, error: sessionError } =
            await supabaseClient.auth.getSession();

        if (sessionError || !session) return;

        const { data, error } = await supabaseClient
            .from("chapter_bookmarks")
            .select("id")
            .eq("user_id", session.user.id)
            .eq("story_id", bookmarkStoryId)
            .eq("chapter_number", currentReadingChapter)
            .maybeSingle();

        if (error) {
            console.error("Bookmark loading error:", error);
            return;
        }

        bookmarkChapterButton.textContent = data
            ? "✓ Chapter Bookmarked"
            : "Bookmark Chapter";
            bookmarkChapterButton.dataset.bookmarked = data ? "true" : "false";
    }

    bookmarkChapterButton.addEventListener("click", async function () {
        if (!bookmarkStoryId) {
            alert("Story not found.");
            return;
        }

        const { data: { session }, error: sessionError } =
            await supabaseClient.auth.getSession();

        if (sessionError || !session) {
            alert("Please log in to bookmark this chapter.");
            return;
        }

        bookmarkChapterButton.disabled = true;
if (bookmarkChapterButton.dataset.bookmarked === "true") {
    try {
        const { error } = await supabaseClient
            .from("chapter_bookmarks")
            .delete()
            .eq("user_id", session.user.id)
            .eq("story_id", bookmarkStoryId)
            .eq("chapter_number", currentReadingChapter);

        if (error) throw error;

        bookmarkChapterButton.textContent = "Bookmark Chapter";
        bookmarkChapterButton.dataset.bookmarked = "false";
    } catch (error) {
        console.error("Bookmark removal error:", error);
        alert("Unable to remove bookmark.");
    } finally {
        bookmarkChapterButton.disabled = false;
    }

    return;
}
        try {
            const { error } = await supabaseClient
                .from("chapter_bookmarks")
                .upsert(
                    {
                        user_id: session.user.id,
                        story_id: bookmarkStoryId,
                        chapter_number: currentReadingChapter
                    },
                    {
                        onConflict: "user_id,story_id,chapter_number",
                        ignoreDuplicates: true
                    }
                );

            if (error) throw error;

            bookmarkChapterButton.textContent = "✓ Chapter Bookmarked";
bookmarkChapterButton.dataset.bookmarked = "true";
        } catch (error) {
            console.error("Bookmark saving error:", error);
            alert("Unable to save bookmark.");
        } finally {
            bookmarkChapterButton.disabled = false;
        }
    });

    loadChapterBookmark();
}

/* Like Story — Supabase */
const likeStoryButton = document.querySelector("#like-story-button");

if (likeStoryButton) {
    const likeStoryId =
        new URLSearchParams(window.location.search).get("id") ||
        localStorage.getItem("dreavelleVerseReadingStoryId");

    function updateLikeButton(isLiked) {
        likeStoryButton.textContent = isLiked
            ? "♥ Liked"
            : "♡ Like Story";

        likeStoryButton.dataset.liked = isLiked ? "true" : "false";
    }
    async function loadStoryLikeCount() {
    if (!likeStoryId) return;

    const countElement = document.querySelector("#story-like-count");
    if (!countElement) return;

    const { count, error } = await supabaseClient
        .from("story_likes")
        .select("*", { count: "exact", head: true })
        .eq("story_id", likeStoryId);

    if (error) {
        console.error("Error loading story like count:", error);
        return;
    }

    const totalLikes = count ?? 0;
countElement.textContent = `${totalLikes} ${totalLikes === 1 ? "like" : "likes"}`;
}

loadStoryLikeCount();

    async function loadStoryLike() {
        if (!likeStoryId) return;

        const { data: { session }, error: sessionError } =
            await supabaseClient.auth.getSession();

        if (sessionError || !session) {
            updateLikeButton(false);
            return;
        }

        const { data, error } = await supabaseClient
            .from("story_likes")
            .select("id")
            .eq("user_id", session.user.id)
            .eq("story_id", likeStoryId)
            .maybeSingle();

        if (error) {
            console.error("Story like loading error:", error);
            return;
        }

        updateLikeButton(Boolean(data));
    }

    likeStoryButton.addEventListener("click", async function () {
        if (!likeStoryId) {
            alert("Story not found.");
            return;
        }

        const { data: { session }, error: sessionError } =
            await supabaseClient.auth.getSession();

        if (sessionError || !session) {
            alert("Please log in to like this story.");
            return;
        }

        likeStoryButton.disabled = true;

        try {
            if (likeStoryButton.dataset.liked === "true") {
                const { error } = await supabaseClient
                    .from("story_likes")
                    .delete()
                    .eq("user_id", session.user.id)
                    .eq("story_id", likeStoryId);

                if (error) throw error;

               updateLikeButton(false);
await loadStoryLikeCount();
            } else {
                const { error } = await supabaseClient
                    .from("story_likes")
                    .upsert(
                        {
                            user_id: session.user.id,
                            story_id: likeStoryId
                        },
                        {
                            onConflict: "user_id,story_id",
                            ignoreDuplicates: true
                        }
                    );

                if (error) throw error;

                updateLikeButton(true);
            }
        } catch (error) {
            console.error("Story like error:", error);
            alert("Unable to update story like.");
        } finally {
            likeStoryButton.disabled = false;
        }
    });

    loadStoryLike();
}

/* Story Rating - Supabase */
const ratingStars = document.querySelectorAll(".rating-star");
const storyRatingMessage = document.querySelector("#story-rating-message");

function displayStoryRating(rating) {
    ratingStars.forEach(function (star) {
        const starRating = Number(star.dataset.rating);
        star.textContent = starRating <= rating ? "★" : "☆";
    });

    if (storyRatingMessage) {
        storyRatingMessage.textContent =
            rating > 0 ? `Your rating: ${rating} out of 5` : "";
    }
}

if (ratingStars.length > 0) {
    const ratingStoryId =
        new URLSearchParams(window.location.search).get("id") ||
        localStorage.getItem("dreavelleVerseReadingStoryId");

    async function loadStoryRating() {
        if (!ratingStoryId) return;

        const { data: { session }, error: sessionError } =
            await supabaseClient.auth.getSession();

        if (sessionError || !session) {
            displayStoryRating(0);
            return;
        }

        const { data, error } = await supabaseClient
            .from("story_ratings")
            .select("rating")
            .eq("user_id", session.user.id)
            .eq("story_id", ratingStoryId)
            .maybeSingle();

        if (error) {
            console.error("Story rating loading error:", error);
            return;
        }

        displayStoryRating(data ? data.rating : 0);
    }

    ratingStars.forEach(function (star) {
        star.addEventListener("click", async function () {
            if (!ratingStoryId) {
                alert("Story not found.");
                return;
            }

            const selectedRating = Number(this.dataset.rating);

            const { data: { session }, error: sessionError } =
                await supabaseClient.auth.getSession();

            if (sessionError || !session) {
                alert("Please log in to rate this story.");
                return;
            }

            try {
                const { error } = await supabaseClient
                    .from("story_ratings")
                    .upsert(
                        {
                            user_id: session.user.id,
                            story_id: ratingStoryId,
                            rating: selectedRating
                        },
                        {
                            onConflict: "user_id,story_id"
                        }
                    );

                if (error) throw error;

                displayStoryRating(selectedRating);
            } catch (error) {
                console.error("Story rating saving error:", error);
                alert("Unable to save your rating.");
            }
        });
    });

    loadStoryRating();
}

/* Story Review – Supabase */
const storyReviewInput = document.querySelector("#story-review-input");
const saveReviewButton = document.querySelector("#save-review-button");
const storyReviewMessage = document.querySelector("#story-review-message");

if (storyReviewInput && saveReviewButton && storyReviewMessage) {
    const reviewStoryId =
        new URLSearchParams(window.location.search).get("id") ||
        localStorage.getItem("dreavelleVerseReadingStoryId");

    async function loadStoryReview() {
        if (!reviewStoryId) return;

        const { data: { session }, error: sessionError } =
            await supabaseClient.auth.getSession();

        if (sessionError || !session) return;

        const { data, error } = await supabaseClient
            .from("story_reviews")
            .select("review_text")
            .eq("user_id", session.user.id)
            .eq("story_id", reviewStoryId)
            .maybeSingle();

        if (error) {
            console.error("Story review loading error:", error);
            return;
        }

        if (data) {
            storyReviewInput.value = data.review_text;
            storyReviewMessage.textContent = "✓ Your review has been posted.";
            saveReviewButton.textContent = "Update Review";
        }
    }

    saveReviewButton.addEventListener("click", async function () {
        const reviewText = storyReviewInput.value.trim();

        if (!reviewText) {
            storyReviewMessage.textContent = "Please write a review first.";
            return;
        }

        if (!reviewStoryId) {
            storyReviewMessage.textContent = "Story not found.";
            return;
        }

        const { data: { session }, error: sessionError } =
            await supabaseClient.auth.getSession();

        if (sessionError || !session) {
            storyReviewMessage.textContent = "Please log in to review this story.";
            return;
        }

        saveReviewButton.disabled = true;

        try {
            const { error } = await supabaseClient
                .from("story_reviews")
                .upsert(
                    {
                        user_id: session.user.id,
                        story_id: reviewStoryId,
                        review_text: reviewText,
                        updated_at: new Date().toISOString()
                    },
                    {
                        onConflict: "user_id,story_id"
                    }
                );

            if (error) throw error;

            storyReviewMessage.textContent = "✓ Your review has been posted.";
            saveReviewButton.textContent = "Update Review";
        } catch (error) {
            console.error("Story review saving error:", error);
            storyReviewMessage.textContent = "Unable to save review.";
        } finally {
            saveReviewButton.disabled = false;
        }
    });

    loadStoryReview();
}


/* Chapter Comments – Supabase */
const chapterCommentInput = document.querySelector("#chapter-comment-input");
const postChapterCommentButton = document.querySelector("#post-chapter-comment-button");
const chapterCommentMessage = document.querySelector("#chapter-comment-message");
const chapterCommentList = document.querySelector("#chapter-comment-list");

if (chapterCommentInput && postChapterCommentButton && chapterCommentList) {
    const commentStoryId =
        new URLSearchParams(window.location.search).get("id") ||
        localStorage.getItem("dreavelleVerseReadingStoryId");

    const commentChapterNumber = Number(
        new URLSearchParams(window.location.search).get("chapter") ||
        localStorage.getItem("dreavelleVerseReadingChapter") ||
        "1"
    );

    async function displayChapterComments() {
        if (!commentStoryId) return;

        const { data, error } = await supabaseClient
            .from("chapter_comments")
            .select("id, comment_text, created_at")
            .eq("story_id", commentStoryId)
            .eq("chapter_number", commentChapterNumber)
            .order("created_at", { ascending: true });

        if (error) {
            console.error("Chapter comments loading error:", error);
            return;
        }

        chapterCommentList.innerHTML = "";

        (data || []).forEach(function (comment) {
            const commentItem = document.createElement("div");
            commentItem.className = "chapter-comment-item";

            const commentText = document.createElement("p");
            commentText.textContent = comment.comment_text;

            commentItem.appendChild(commentText);
            chapterCommentList.appendChild(commentItem);
        });
    }

    postChapterCommentButton.addEventListener("click", async function () {
        const commentText = chapterCommentInput.value.trim();

        if (!commentText) {
            if (chapterCommentMessage) {
                chapterCommentMessage.textContent =
                    "Please write a comment first.";
            }
            return;
        }

        if (!commentStoryId) {
            alert("Story not found.");
            return;
        }

        const { data: { session }, error: sessionError } =
            await supabaseClient.auth.getSession();

        if (sessionError || !session) {
            alert("Please log in to post a comment.");
            return;
        }

        postChapterCommentButton.disabled = true;

        try {
            const { error } = await supabaseClient
                .from("chapter_comments")
                .insert({
                    user_id: session.user.id,
                    story_id: commentStoryId,
                    chapter_number: commentChapterNumber,
                    comment_text: commentText
                });

            if (error) throw error;

            chapterCommentInput.value = "";

            if (chapterCommentMessage) {
                chapterCommentMessage.textContent = "✓ Comment posted.";
            }

            await displayChapterComments();
        } catch (error) {
            console.error("Chapter comment saving error:", error);

            if (chapterCommentMessage) {
                chapterCommentMessage.textContent =
                    "Unable to post comment.";
            }
        } finally {
            postChapterCommentButton.disabled = false;
        }
    });

    displayChapterComments();
}



/* Reading History — Supabase */

const readingHistoryList = document.querySelector("#reading-history-list");

async function saveReadingHistoryToSupabase() {
    if (!chapterContent) return;

    const storyId =
        new URLSearchParams(window.location.search).get("id") ||
        localStorage.getItem("dreavelleVerseReadingStoryId");

    const chapterNumber = Number(
        new URLSearchParams(window.location.search).get("chapter") ||
        localStorage.getItem("dreavelleVerseReadingChapter") ||
        "1"
    );

    if (!storyId || !Number.isInteger(chapterNumber) || chapterNumber < 1) return;

    const { data: { session }, error: sessionError } =
        await supabaseClient.auth.getSession();

    if (sessionError || !session) return;

    const { error } = await supabaseClient
        .from("reading_history")
        .upsert(
            {
                user_id: session.user.id,
                story_id: storyId,
                chapter_number: chapterNumber,
                last_read_at: new Date().toISOString()
            },
            { onConflict: "user_id,story_id,chapter_number" }
        );

    if (error) console.error("Reading history saving error:", error);
}

async function displayReadingHistoryFromSupabase() {
    if (!readingHistoryList) return;

    const { data: { session }, error: sessionError } =
        await supabaseClient.auth.getSession();

    if (sessionError || !session) {
        readingHistoryList.textContent = "Log in to view your reading history.";
        return;
    }

    const { data, error } = await supabaseClient
        .from("reading_history")
        .select("story_id,chapter_number,last_read_at,stories(title)")
        .eq("user_id", session.user.id)
        .order("last_read_at", { ascending: false });

    if (error) {
        console.error("Reading history loading error:", error);
        readingHistoryList.textContent = "Unable to load reading history.";
        return;
    }

    readingHistoryList.replaceChildren();

    if (!data || data.length === 0) {
        readingHistoryList.textContent = "You haven't read any chapters yet.";
        return;
    }

    data.forEach(function (item) {
        const card = document.createElement("div");
        card.className = "reading-history-item";

        const storyTitle = document.createElement("p");
        storyTitle.className = "reading-history-story";
        storyTitle.textContent = item.stories?.title || "Untitled Story";

        const chapterTitle = document.createElement("h3");
        chapterTitle.textContent = `Chapter ${item.chapter_number}`;

        const button = document.createElement("button");
        button.type = "button";
        button.className = "reading-history-open";
        button.textContent = "Read Chapter";

        button.addEventListener("click", function () {
            localStorage.setItem("dreavelleVerseReadingStoryId", item.story_id);
            localStorage.setItem("dreavelleVerseReadingChapter", String(item.chapter_number));
            window.location.href =
                `read-chapter.html?id=${encodeURIComponent(item.story_id)}&chapter=${item.chapter_number}`;
        });

        card.append(storyTitle, chapterTitle, button);
        readingHistoryList.appendChild(card);
    });
}

saveReadingHistoryToSupabase();
displayReadingHistoryFromSupabase();


/* Follow Story */
const followStoryButton = document.querySelector(
    "#follow-story-button"
);

if (followStoryButton) {
    const followStoryId =
        new URLSearchParams(window.location.search).get("id") ||
        localStorage.getItem("dreavelleVerseReadingStoryId");

    async function loadStoryFollow() {
        if (!followStoryId) return;

        const { data: { session }, error: sessionError } =
            await supabaseClient.auth.getSession();

        if (sessionError || !session) {
            followStoryButton.textContent = "+ Follow Story";
            followStoryButton.dataset.followed = "false";
            return;
        }

        const { data, error } = await supabaseClient
            .from("story_follows")
            .select("id")
            .eq("user_id", session.user.id)
            .eq("story_id", followStoryId)
            .maybeSingle();

        if (error) {
            console.error("Follow loading error:", error);
            return;
        }

        followStoryButton.textContent = data
            ? "✓ Following"
            : "+ Follow Story";

        followStoryButton.dataset.followed = data
            ? "true"
            : "false";
    }

    followStoryButton.addEventListener("click", async function () {
        if (!followStoryId) {
            alert("Story not found.");
            return;
        }

        const { data: { session }, error: sessionError } =
            await supabaseClient.auth.getSession();

        if (sessionError || !session) {
            alert("Please log in to follow this story.");
            return;
        }

        followStoryButton.disabled = true;

        try {
            if (followStoryButton.dataset.followed === "true") {
                const { error } = await supabaseClient
                    .from("story_follows")
                    .delete()
                    .eq("user_id", session.user.id)
                    .eq("story_id", followStoryId);

                if (error) throw error;

                followStoryButton.textContent = "+ Follow Story";
                followStoryButton.dataset.followed = "false";
            } else {
                const { error } = await supabaseClient
                    .from("story_follows")
                    .upsert(
                        {
                            user_id: session.user.id,
                            story_id: followStoryId
                        },
                        {
                            onConflict: "user_id,story_id",
                            ignoreDuplicates: true
                        }
                    );

                if (error) throw error;

                followStoryButton.textContent = "✓ Following";
                followStoryButton.dataset.followed = "true";
            }
        } catch (error) {
            console.error("Follow saving error:", error);
            alert("Unable to update story follow.");
        } finally {
            followStoryButton.disabled = false;
        }
    });

    loadStoryFollow();
}

/* Reader Private Notes */

const readerNotesInput = document.querySelector(
    "#reader-notes-input"
);

const saveReaderNotesButton = document.querySelector(
    "#save-reader-notes-button"
);

const readerNotesMessage = document.querySelector(
    "#reader-notes-message"
);

if (
    readerNotesInput &&
    saveReaderNotesButton
) {

    const notesChapterNumber =
        localStorage.getItem(
            "dreavelleVerseReadingChapter"
        ) || "1";
       const notesStoryId =
    new URLSearchParams(window.location.search).get("id") ||
    localStorage.getItem("dreavelleVerseReadingStoryId");

    const readerNotesKey =
        `dreavelleVerseReaderNotes${notesChapterNumber}`;

    async function loadReaderNoteFromSupabase() {
    if (!notesStoryId) return;

    const { data: { session }, error: sessionError } =
        await supabaseClient.auth.getSession();

    if (sessionError || !session) return;

    const { data, error } = await supabaseClient
        .from("reader_notes")
        .select("note_text")
        .eq("user_id", session.user.id)
        .eq("story_id", notesStoryId)
        .eq("chapter_number", Number(notesChapterNumber))
        .maybeSingle();

    if (error) {
        console.error("Error loading reader note:", error);
        return;
    }

    if (data) {
        readerNotesInput.value = data.note_text || "";
        saveReaderNotesButton.textContent = "Update Note";
    }
}

loadReaderNoteFromSupabase();

    saveReaderNotesButton.addEventListener(
        "click",
     async function () {

            const noteText =
                readerNotesInput.value.trim();

            if (!noteText) {

                if (readerNotesMessage) {
                    readerNotesMessage.textContent =
                        "Please write a note first.";
                }

                return;
            }

           const { data: { session } } =
    await supabaseClient.auth.getSession();

if (!session || !notesStoryId) {
    if (readerNotesMessage) {
        readerNotesMessage.textContent =
            "Please log in and open a story first.";
    }
    return;
}

const { error } = await supabaseClient
    .from("reader_notes")
    .upsert(
        {
            user_id: session.user.id,
            story_id: notesStoryId,
            chapter_number: Number(notesChapterNumber),
            note_text: noteText
        },
        {
            onConflict: "user_id,story_id,chapter_number"
        }
    );

if (error) {
    console.error("Reader note save failed:", error);

    if (readerNotesMessage) {
        readerNotesMessage.textContent =
            "Unable to save your private note.";
    }
    return;
}

            if (readerNotesMessage) {
                readerNotesMessage.textContent =
                    "✓ Private note saved.";
            }

            saveReaderNotesButton.textContent =
                "Update Note";
        }
    );
}

/* Notifications */


const notificationList = document.querySelector("#notification-list");

if (notificationList) {
  (async function () {
    const { data: { user }, error: authError } =
      await supabaseClient.auth.getUser();

    if (authError || !user) {
      notificationList.textContent = "Please log in to view notifications.";
      return;
    }

    const { data: notifications, error } = await supabaseClient
      .from("notifications")
      .select("id, story_id, chapter_number, title, message, is_read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Notifications error:", error.message);
      notificationList.textContent = "Unable to load notifications.";
      return;
    }

    notificationList.replaceChildren();
    const unreadCount = (notifications || []).filter(
  notification => !notification.is_read
).length;

const notificationCount = document.querySelector("#notification-count") || (() => {
  const badge = document.createElement("span");
  badge.id = "notification-count";
  badge.style.cssText = "margin-left:6px;background:#e63946;color:white;border-radius:12px;padding:2px 7px;font-weight:bold;";
  document.querySelector("#notifications-nav-link")?.appendChild(badge);
  return badge;
})();

if (notificationCount) {
  notificationCount.textContent = unreadCount;
  notificationCount.hidden = unreadCount === 0;
}

    if (!notifications || notifications.length === 0) {
      notificationList.innerHTML = `
        <div class="notification-empty">
          <p>🔔 No notifications yet.</p>
          <span>Updates from stories you follow will appear here.</span>
        </div>
      `;
      return;
    }

    notifications.forEach(function (notification) {
      const card = document.createElement("div");
      card.className = "notification-card";

      if (!notification.is_read) {
        const badge = document.createElement("span");
        badge.className = "notification-new-badge";
        badge.textContent = "NEW";
        card.appendChild(badge);
      }

      const title = document.createElement("p");
      title.className = "notification-story-title";
      title.textContent = notification.title;

      const heading = document.createElement("h3");
      const isFollowerNotification = notification.title === "New Follower" && !notification.story_id;
      const isMessageNotification = ["New Message", "New Private Message"].includes((notification.title || "").trim());
      heading.textContent = isFollowerNotification ? "Someone followed you" : (isMessageNotification ? "Private message" : notification.title === "Writer Announcement" ? "Writer announcement" : "New Chapter Published");

      const message = document.createElement("p");
      message.textContent = notification.message;

      const date = document.createElement("p");
      date.textContent = new Date(notification.created_at).toLocaleString();

      const button = document.createElement("button");
      button.type = "button";
      button.className = "notification-read-button";
      button.textContent = isFollowerNotification ? "View Profile" : (isMessageNotification ? "View Message" : notification.title === "Writer Announcement" ? "View Announcements" : "Read Chapter");

      button.addEventListener("click", async function () {
        const { error: updateError } = await supabaseClient
          .from("notifications")
          .update({ is_read: true })
          .eq("id", notification.id)
          .eq("user_id", user.id);

        if (updateError) {
          console.error("Mark notification read:", updateError.message);
          return;
        }

        if (isMessageNotification) { window.location.href = "messages.html"; return; }
        if (notification.title === "Writer Announcement") { window.location.href = "announcements.html"; return; }
        if (isFollowerNotification) {
          // Follower notifications currently store the display name in the message,
          // not the follower ID. Only open a profile if the name resolves uniquely.
          const followerName = (notification.message || "")
            .replace(/ started following you\.$/, "").trim();
          if (followerName) {
            const { data: matches, error: profileError } = await supabaseClient
              .from("profiles")
              .select("id, display_name")
              .eq("display_name", followerName)
              .limit(2);
            if (!profileError && matches?.length === 1) {
              window.location.href = "public-profile.html?id=" +
                encodeURIComponent(matches[0].id);
              return;
            }
          }
          // Duplicate/renamed usernames cannot safely identify an account.
          window.location.href = "discover.html";
          return;
        }
        window.location.href =
          "read-chapter.html?id=" +
          encodeURIComponent(notification.story_id) +
          "&chapter=" +
          encodeURIComponent(notification.chapter_number);
      });

      card.append(title, heading, message, date, button);
      notificationList.appendChild(card);
    });
  })();
}

/* Notification Read Chapter */

const notificationReadButtons =
    document.querySelectorAll(
        ".notification-read-button"
    );

notificationReadButtons.forEach(
    function (button) {

        button.addEventListener(
            "click",
           async function () {

                const chapterNumber =
                    this.dataset.chapter;

                    const notifications = JSON.parse(
    localStorage.getItem(
        `dreavelleVerseNotifications_${(await supabaseClient.auth.getUser()).data.user?.id}`
    ) || "[]"
);

notifications.forEach(
    function (notification) {

        if (
            Number(notification.chapterNumber) ===
            Number(chapterNumber)
        ) {
            notification.read = true;
        }
    }
);

localStorage.setItem(
   `dreavelleVerseNotifications_${(await supabaseClient.auth.getUser()).data.user?.id}`,
    JSON.stringify(notifications)
);

                localStorage.setItem(
                    "dreavelleVerseReadingChapter",
                    chapterNumber
                );

                localStorage.setItem(
                    "dreavelleVerseLastReadChapter",
                    chapterNumber
                );

                window.location.href =
                    "read-chapter.html";
            }
        );
    }
);

/* Unread Notification Count */

const notificationsNavLink =
    document.querySelector(
        "#notifications-nav-link"
    );
const notificationsUserLoggedIn =
    localStorage.getItem(
        "dreavelleVerseLoggedIn"
    ) === "true";

if (
    notificationsNavLink &&
    !notificationsUserLoggedIn
) {
    notificationsNavLink.style.display = "none";
}
if (notificationsNavLink) {
    (async function () {

    const navNotifications = JSON.parse(
        localStorage.getItem(
            `dreavelleVerseNotifications_${(await supabaseClient.auth.getUser()).data.user?.id}`
        ) || "[]"
    );

    const unreadNotificationCount =
        navNotifications.filter(
            function (notification) {
                return notification.read === false;
            }
        ).length;

    if (unreadNotificationCount > 0) {

        notificationsNavLink.textContent =
            `Notifications (${unreadNotificationCount})`;

    } else {

        notificationsNavLink.textContent =
            "Notifications";
    }
})();
}

/* Sign Up Form */

const signupForm = document.querySelector(
    "#signup-form"
);

if (signupForm) {
    signupForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const password =
                document.querySelector(
                    "#signup-password"
                ).value;

            const confirmPassword =
                document.querySelector(
                    "#signup-confirm-password"
                ).value;

            const signupMessage =
                document.querySelector(
                    "#signup-message"
                );

            if (password !== confirmPassword) {
                signupMessage.textContent =
                    "Passwords do not match.";
                return;
            }

            const displayName =
                document.querySelector(
                    "#signup-name"
                ).value.trim();

            const email =
                document.querySelector(
                    "#signup-email"
                ).value.trim();

            signupMessage.textContent =
                "Creating account...";

            const { data, error } =
                await supabaseClient.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: {
                            display_name: displayName
                        }
                    }
                });

            if (error) {
                signupMessage.textContent =
                    error.message;
                return;
            }

            if (data.session) {
    const { error: profileError } =
        await supabaseClient
            .from("profiles")
            .insert({
                id: data.user.id,
                display_name: displayName
            });

    if (profileError) {
        signupMessage.textContent =
            "Account created, but profile could not be saved: " +
            profileError.message;
        return;
    }
}

            signupMessage.textContent =
                "✓ Account created successfully. You can now log in.";
        }
    );
}

/* Log In Form */

const loginForm = document.querySelector(
    "#login-form"
);

if (loginForm) {
    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const loginEmail =
                document.querySelector(
                    "#login-email"
                ).value.trim();

            const loginPassword =
                document.querySelector(
                    "#login-password"
                ).value;

            const loginMessage =
                document.querySelector(
                    "#login-message"
                );

            loginMessage.textContent =
                "Logging in...";

            const { data, error } =
                await supabaseClient.auth.signInWithPassword({
                    email: loginEmail,
                    password: loginPassword
                });

            if (error) {
                loginMessage.textContent =
                    error.message;
                return;
            }

            localStorage.setItem(
                "dreavelleVerseLoggedIn",
                "true"
            );

            loginMessage.textContent =
                "✓ Logged in successfully.";

            setTimeout(
                function () {
                    window.location.href =
                        "index.html";
                },
                800
            );
        }
    );
}

/* Logged In Navigation */

const loginNavLink =
    document.querySelector("#login-nav-link");

const signupNavLink =
    document.querySelector("#signup-nav-link");

const userNav =
    document.querySelector("#user-nav");

const userDisplayName =
    document.querySelector("#user-display-name");

const logoutButton =
    document.querySelector("#logout-button");

if (
    loginNavLink &&
    signupNavLink &&
    userNav &&
    userDisplayName
) {
    async function updateLoggedInNavigation() {

        const { data: { session } } =
            await supabaseClient.auth.getSession();

        if (session && session.user) {

            loginNavLink.style.display = "none";
            signupNavLink.style.display = "none";
            userNav.style.display = "inline";

            const { data: profile } =
                await supabaseClient
                    .from("profiles")
                    .select("display_name")
                    .eq("id", session.user.id)
                    .maybeSingle();

            userDisplayName.textContent =
                profile?.display_name ||
                session.user.user_metadata?.display_name ||
                "User";

        } else {

            loginNavLink.style.display = "";
            signupNavLink.style.display = "";
            userNav.style.display = "none";
        }
    }

    updateLoggedInNavigation();
}

/* Log Out */

if (logoutButton) {
  logoutButton.addEventListener("click", async function (event) {
    event.preventDefault();

    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      console.error("Logout failed:", error.message);
      alert("Logout failed. Please try again.");
      return;
    }

    localStorage.setItem("dreavelleVerseLoggedIn", "false");

    window.location.href = "index.html";
  });
}

/* Protect Start Writing */

const startWritingButton =
    document.querySelector(
        "#start-writing-button"
    );

if (startWritingButton) {

    startWritingButton.addEventListener(
        "click",
        function (event) {

            const userLoggedIn =
                localStorage.getItem(
                    "dreavelleVerseLoggedIn"
                ) === "true";

            if (!userLoggedIn) {

                event.preventDefault();

                window.location.href =
                    "login.html";
            }
        }
    );
}

/* Protect Write Navigation */

const writeNavLink =
    document.querySelector(
        "#write-nav-link"
    );

if (writeNavLink) {

    writeNavLink.addEventListener(
        "click",
        function (event) {

            const userLoggedIn =
                localStorage.getItem(
                    "dreavelleVerseLoggedIn"
                ) === "true";

            if (!userLoggedIn) {

                event.preventDefault();

                window.location.href =
                    "login.html";
            }
        }
    );
}

/* Writer dashboard: list the signed-in writer's stories from Supabase. */
const writerStoryButton = document.querySelector("#writer-story-button");
const writerStoryList =
    document.querySelector("#my-stories-list") ||
    document.querySelector("#writer-story-list");

if (writerStoryList) {
    (async function loadWriterStories() {
        const { data: { session }, error: authError } =
            await supabaseClient.auth.getSession();
        if (authError || !session?.user) {
            writerStoryList.textContent = "Please log in to manage your stories.";
            return;
        }
        const { data: stories, error } = await supabaseClient
            .from("stories")
            .select("*")
            .eq("user_id", session.user.id)
            .order("updated_at", { ascending: false });
        if (error) {
            console.error("Could not load writer stories:", error);
            writerStoryList.textContent = "Could not load your stories. Please try again.";
            return;
        }
        // The separate Create New Story button remains available on Write. 
        writerStoryList.replaceChildren();
        if (!stories?.length) {
            writerStoryList.textContent = "You haven't created a story yet.";
            return;
        }
        const heading = document.createElement("h3");
        heading.textContent = "Your Stories";
        writerStoryList.appendChild(heading);
        for (const story of stories) {
            const item = document.createElement("div");
            item.className = "writer-story-item";
            const cover = document.createElement("img");

cover.className = "writer-story-cover";
cover.alt = story.title || "Story Cover";

const coverUrl =
    story.cover_url ||
    story.cover_image ||
    story.cover ||
    "";

if (coverUrl) {
    cover.src = coverUrl;
    cover.loading = "lazy";
} else {
    cover.style.display = "none";
}

item.appendChild(cover);
            const title = document.createElement("strong");
            title.textContent = story.title || "Untitled Story";
            const description = document.createElement("p");
description.className = "writer-story-description";

const fullDescription = story.description || "";
const previewLength = 180;

if (fullDescription.length > previewLength) {
    const previewText = document.createElement("span");
    const readMore = document.createElement("button");

    readMore.type = "button";
    readMore.className = "manager-read-more";

    let expanded = false;

    function updateDescription() {
        previewText.textContent = expanded
            ? fullDescription
            : fullDescription.slice(0, previewLength).trimEnd() + "... ";

        readMore.textContent = expanded
            ? "Show Less"
            : "Read More";
    }

    readMore.addEventListener("click", () => {
        expanded = !expanded;
        updateDescription();
    });

    updateDescription();
    description.append(previewText, readMore);
} else {
    description.textContent = fullDescription;
}
            const likes = document.createElement("span");
likes.className = "writer-story-likes";
likes.textContent = "♡ — Likes";

const { count: likesCount, error: likesError } =
    await supabaseClient
        .from("story_likes")
        .select("id", { count: "exact", head: true })
        .eq("story_id", story.id);

if (likesError) {
    console.error("Could not load story likes:", likesError);
} else {
    likes.textContent =
        `♡ ${Number(likesCount || 0).toLocaleString()} Likes`;
}
            const reads = document.createElement("span");
reads.className = "writer-story-reads";
reads.textContent = `👁 ${Number(story.total_reads || 0).toLocaleString()} Reads`;
            const completionStatus = document.createElement("span");
completionStatus.className = "writer-story-completion";

completionStatus.textContent =
    story.completion_status === "Completed"
        ? "✓ Completed"
        : "◷ Ongoing";
            const status = document.createElement("span");
            status.textContent = ` (${story.status || "Draft"}) `;
            const manage = document.createElement("button");
            manage.type = "button";
            manage.textContent = "Manage Story";
            manage.addEventListener("click", () => {
                localStorage.setItem("dreavelleVerseStoryId", story.id);
                localStorage.setItem("dreavelleVerseStoryTitle", story.title || "");
                localStorage.removeItem("dreavelleVerseChapterTitle");
                localStorage.removeItem("dreavelleVerseChapterContent");
                localStorage.removeItem("dreavelleVerseChapterStatus");
                localStorage.setItem("dreavelleVerseCurrentChapter", "1");
                window.location.href = "story-manager.html";
            });
         const storyDetails = document.createElement("div");
storyDetails.className = "writer-story-details";

const storyStats = document.createElement("div");
storyStats.className = "writer-story-stats";

storyStats.append(
    status,
    completionStatus,
    reads,
    likes
);

storyDetails.append(
    title,
    storyStats,
    description,
    manage
);

item.appendChild(storyDetails);
            writerStoryList.appendChild(item);
        }
    })();
}

/* Protect Create Story Page */

const createStoryPage =
    document.querySelector("#create-story-page");

if (createStoryPage) {

    const createStoryUserLoggedIn =
        localStorage.getItem(
            "dreavelleVerseLoggedIn"
        ) === "true";

    if (!createStoryUserLoggedIn) {
        window.location.href = "login.html";
    }
}

/* Protect Story Manager Page */

const storyManagerPage =
    document.querySelector("#story-manager-page");

if (storyManagerPage) {

    (async function () {

        const { data: { session } } =
            await supabaseClient.auth.getSession();

        if (!session || !session.user) {
            window.location.href = "login.html";
            return;
        }

        localStorage.setItem(
            "dreavelleVerseLoggedIn",
            "true"
        );

    })();
}

/* Protect Chapter Editor Page */

const chapterEditorPage =
    document.querySelector("#chapter-editor-page");

if (chapterEditorPage) {

    const chapterEditorUserLoggedIn =
        localStorage.getItem(
            "dreavelleVerseLoggedIn"
        ) === "true";

    if (!chapterEditorUserLoggedIn) {
        window.location.href = "login.html";
    }
}

/* Protect Writer Page */

const writerPage =
    document.querySelector("#writer-page");

if (writerPage) {

    const writerPageUserLoggedIn =
        localStorage.getItem(
            "dreavelleVerseLoggedIn"
        ) === "true";

    if (!writerPageUserLoggedIn) {
        window.location.href = "login.html";
    }
}

/* Protect Library Page */

const libraryPage =
    document.querySelector("#library-page");

if (libraryPage) {

    const libraryUserLoggedIn =
        localStorage.getItem(
            "dreavelleVerseLoggedIn"
        ) === "true";

    if (!libraryUserLoggedIn) {
        window.location.href = "login.html";
    }
}

/* Protect Notifications Page */

const notificationsPage =
    document.querySelector("#notifications-page");

if (notificationsPage) {

    const notificationsUserLoggedIn =
        localStorage.getItem(
            "dreavelleVerseLoggedIn"
        ) === "true";

    if (!notificationsUserLoggedIn) {
        window.location.href = "login.html";
    }
}

/* Protect Reading History Page */

const readingHistoryPage =
    document.querySelector("#reading-history-page");

if (readingHistoryPage) {

    const readingHistoryUserLoggedIn =
        localStorage.getItem(
            "dreavelleVerseLoggedIn"
        ) === "true";

    if (!readingHistoryUserLoggedIn) {
        window.location.href = "login.html";
    }
}

/* Profile Page */

const profilePage =
    document.querySelector("#profile-page");

const profileDisplayName =
    document.querySelector("#profile-display-name");

const profileEmail =
    document.querySelector("#profile-email");

if (profilePage) {
    async function loadProfilePage() {
        const { data: { session } } =
            await supabaseClient.auth.getSession();

        if (!session || !session.user) {
            window.location.href = "login.html";
            return;
        }

        const { data: profile } =
            await supabaseClient
                .from("profiles")
                .select("display_name")
                .eq("id", session.user.id)
                .maybeSingle();

        if (profileDisplayName) {
            profileDisplayName.textContent =
                profile?.display_name ||
                session.user.user_metadata?.display_name ||
                "User";
        }
        if (profilePicturePlaceholder && profileDisplayName) {
    const name = profileDisplayName.textContent.trim() || "User";
    const nameParts = name.split(/\s+/).filter(Boolean);

    const initials =
        nameParts.length === 1
            ? nameParts[0][0]
            : nameParts[0][0] +
              nameParts[nameParts.length - 1][0];

    profilePicturePlaceholder.textContent =
        initials.toUpperCase();
}

        if (profileEmail) {
            profileEmail.textContent =
                session.user.email || "";
        }
    }

    loadProfilePage();
}

/* Open Profile From User Name */

if (userDisplayName) {

    userDisplayName.addEventListener(
        "click",
        function () {
            window.location.href = "profile.html";
        }
    );
}

/* Edit Profile — Supabase (no legacy localStorage dependency) */
const editProfileButton = document.querySelector("#edit-profile-button");
const editProfileForm = document.querySelector("#edit-profile-form");
const editDisplayName = document.querySelector("#edit-display-name");
const saveProfileButton = document.querySelector("#save-profile-button");
const cancelProfileButton = document.querySelector("#cancel-profile-button");

if (editProfileButton && editProfileForm && editDisplayName && saveProfileButton && cancelProfileButton) {
    function showProfileEditor() {
        editDisplayName.value = (profileDisplayName?.textContent || "").trim();
        editProfileForm.style.display = "block";
        editProfileButton.style.display = "none";
        editDisplayName.focus();
    }

    function closeProfileEditor() {
        editProfileForm.style.display = "none";
        editProfileButton.style.display = "inline-block";
    }

    // Set onclick on the actual button, not on a missing localStorage account.
    editProfileButton.addEventListener("click", showProfileEditor);
    cancelProfileButton.addEventListener("click", closeProfileEditor);

    saveProfileButton.addEventListener("click", async function (event) {
        event.preventDefault();
        const newDisplayName = editDisplayName.value.trim();
        if (!newDisplayName || newDisplayName.length > 40) {
            alert("Please enter a display name of up to 40 characters.");
            return;
        }

        saveProfileButton.disabled = true;
        const oldLabel = saveProfileButton.textContent;
        saveProfileButton.textContent = "Saving...";
        try {
            const { data: { session }, error: sessionError } =
                await supabaseClient.auth.getSession();
            if (sessionError || !session?.user) {
                throw sessionError || new Error("Please log in again.");
            }

            // The profile page reads its display name from this table.
            const { data: savedRows, error: saveError } = await supabaseClient
                .from("profiles")
                .update({ display_name: newDisplayName })
                .eq("id", session.user.id)
                .select("id, display_name");
            if (saveError) throw saveError;
            if (!savedRows?.length) {
                throw new Error("Your profile could not be updated. Check the profiles table permissions.");
            }

            // Keep Supabase Auth's name in sync as a secondary source.
            const { error: metadataError } = await supabaseClient.auth.updateUser({
                data: { display_name: newDisplayName }
            });
            if (metadataError) {
                console.warn("Display name saved to profiles, but Auth metadata was not updated:", metadataError);
            }

            if (profileDisplayName) profileDisplayName.textContent = newDisplayName;
            if (userDisplayName) userDisplayName.textContent = newDisplayName;
            if (profilePicturePlaceholder && profilePicturePlaceholder.style.display !== "none") {
                const parts = newDisplayName.split(/\s+/);
                profilePicturePlaceholder.textContent =
                    (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0][0]).toUpperCase();
            }
            closeProfileEditor();
            alert("Display name saved successfully.");
        } catch (error) {
            console.error("Could not save display name:", error);
            alert("Could not save your display name: " + (error?.message || "Unknown error"));
        } finally {
            saveProfileButton.disabled = false;
            saveProfileButton.textContent = oldLabel;
        }
    });
}

/* Followers: requires account_follows table and RLS setup */
if (profilePage) {
    (async function loadAccountFollowers() {
        const countElement = document.querySelector("#profile-followers-count");
        if (!countElement) return;
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
        if (sessionError || !session?.user) {
            countElement.textContent = "Sign in to see followers";
            return;
        }
        const user = session.user;
        const { count, error } = await supabaseClient.from("account_follows")
            .select("follower_id", { count: "exact", head: true })
            .eq("followed_id", user.id);
        if (error) {
            console.info("Followers database setup is still needed:", error.message);
            countElement.textContent = "Followers feature being set up";
            return;
        }
        countElement.textContent = `${count ?? 0} follower${count === 1 ? "" : "s"}`;
    })();
}

/* Profile Picture */

const profilePictureInput =
    document.querySelector("#profile-picture-input");

const profilePicture =
    document.querySelector("#profile-picture");

const profilePicturePlaceholder =
    document.querySelector("#profile-picture-placeholder");
if (profilePicturePlaceholder) {
    const name =
        profileDisplayName?.textContent.trim() || "User";

    const nameParts =
        name.split(/\s+/).filter(Boolean);

    const initials =
        nameParts.length === 1
            ? nameParts[0][0]
            : nameParts[0][0] +
              nameParts[nameParts.length - 1][0];

    profilePicturePlaceholder.textContent =
        initials.toUpperCase();
}
if (
    profilePictureInput &&
    profilePicture &&
    profilePicturePlaceholder
) {

    let savedProfilePicture = "";
    (async function () {
const { data: { session } } =
    await supabaseClient.auth.getSession();

if (!session || !session.user) {
    return;
}
const { data: profile, error } =
    await supabaseClient
        .from("profiles")
        .select("avatar_url")
        .eq("id", session.user.id)
        .single();
        if (!error && profile && profile.avatar_url) {
    savedProfilePicture =
        profile.avatar_url;
        if (savedProfilePicture) {
    profilePicture.src =
        savedProfilePicture;

    profilePicture.style.display =
        "block";

    profilePicturePlaceholder.style.display =
        "none";
}
}
})();

  

   profilePictureInput.addEventListener(
    "change",
    async function () {

        const selectedFile =
            profilePictureInput.files[0];

        if (!selectedFile) {
            return;
        }

        const { data: { session } } =
            await supabaseClient.auth.getSession();

        if (!session || !session.user) {
            return;
        }

        const fileExtension =
            selectedFile.name.split(".").pop();

        const filePath =
            session.user.id +
            "/profile." +
            fileExtension;

        const { error: uploadError } =
            await supabaseClient.storage
                .from("profile-images")
                .upload(
                    filePath,
                    selectedFile,
                    {
                        upsert: true
                    }
                );

        if (uploadError) {
            console.error(
                "Profile picture upload error:",
                uploadError
            );
            return;
        }

        const { data: publicUrlData } =
            supabaseClient.storage
                .from("profile-images")
                .getPublicUrl(filePath);

        const imageUrl =
            publicUrlData.publicUrl;

        const { error: profileUpdateError } =
            await supabaseClient
                .from("profiles")
                .update({
                    avatar_url: imageUrl
                })
                .eq("id", session.user.id);

        if (profileUpdateError) {
            console.error(
                "Profile avatar update error:",
                profileUpdateError
            );
            return;
        }

        savedProfilePicture = imageUrl;

        profilePicture.src = imageUrl + "?v=" + Date.now();

        profilePicture.style.display =
            "block";

        profilePicturePlaceholder.style.display =
            "none";
    }
);
}

/* Profile Bio */

const profileBio =
    document.querySelector("#profile-bio");

const editBioButton =
    document.querySelector("#edit-bio-button");

const editBioForm =
    document.querySelector("#edit-bio-form");

const bioInput =
    document.querySelector("#bio-input");

const bioCharacterCount =
    document.querySelector("#bio-character-count");

const saveBioButton =
    document.querySelector("#save-bio-button");

const cancelBioButton =
    document.querySelector("#cancel-bio-button");

if (
    profileBio &&
    editBioButton &&
    editBioForm &&
    bioInput &&
    bioCharacterCount &&
    saveBioButton &&
    cancelBioButton
) {

    let savedBio = "";
    (async function () {
const { data: { session } } =
    await supabaseClient.auth.getSession();
    if (!session || !session.user) {
    return;
}
const { data: profile, error } =
    await supabaseClient
        .from("profiles")
        .select("bio")
        .eq("id", session.user.id)
        .single();
        if (error) {
    console.error(
        "Could not load profile bio:",
        error
    );
    return;
}

savedBio = profile?.bio || "";

if (savedBio) {
    profileBio.textContent = savedBio;
    editBioButton.textContent = "Edit Bio";
} else {
    profileBio.textContent =
        "Tell readers a little about yourself.";
    editBioButton.textContent = "Add Bio";
}
})();

    

    editBioButton.addEventListener(
        "click",
        function () {

            const currentBio =
    savedBio || "";

            bioInput.value =
                currentBio;

            bioCharacterCount.textContent =
                bioInput.value.length;

            editBioForm.style.display =
                "block";

            editBioButton.style.display =
                "none";
        }
    );

    bioInput.addEventListener(
        "input",
        function () {

            bioCharacterCount.textContent =
                bioInput.value.length;
        }
    );

    cancelBioButton.addEventListener(
        "click",
        function () {

            editBioForm.style.display =
                "none";

            editBioButton.style.display =
                "inline-block";
        }
    );

    saveBioButton.addEventListener(
        "click",
       async function () {

            const newBio =
                bioInput.value.trim();

            if (!newBio) {
                return;
            }

           const { data: { session } } =
    await supabaseClient.auth.getSession();

if (!session || !session.user) {
    return;
}

const { error } =
    await supabaseClient
        .from("profiles")
        .update({
            bio: newBio
        })
        .eq("id", session.user.id);
        if (error) {
    console.error(
        "Could not save profile bio:",
        error
    );
    return;
}

savedBio = newBio;

            profileBio.textContent =
                newBio;

            editBioButton.textContent =
                "Edit Bio";

            editBioForm.style.display =
                "none";

            editBioButton.style.display =
                "inline-block";
        }
    );
}

/* Profile Cover Photo */

const profileCoverInput =
    document.querySelector("#profile-cover-input");

const profileCoverPhoto =
    document.querySelector("#profile-cover-photo");

const profileCoverPlaceholder =
    document.querySelector("#profile-cover-placeholder");

const profileCoverButton =
    document.querySelector("#profile-cover-button");

if (
    profileCoverInput &&
    profileCoverPhoto &&
    profileCoverPlaceholder &&
    profileCoverButton
) {

    let savedProfileCover = "";

    (async function () {

        const { data: { session } } =
            await supabaseClient.auth.getSession();

        if (!session || !session.user) {
            return;
        }

        const { data: profile, error } =
            await supabaseClient
                .from("profiles")
                .select("cover_url")
                .eq("id", session.user.id)
                .single();

        if (!error && profile && profile.cover_url) {

            savedProfileCover =
                profile.cover_url;

            profileCoverPhoto.src =
                savedProfileCover;

            profileCoverPhoto.style.display =
                "block";

            profileCoverPlaceholder.style.display =
                "none";

            profileCoverButton.textContent =
                "Change Cover";
        }

    })();

    profileCoverInput.addEventListener(
        "change",
        async function () {

            const selectedCover =
                profileCoverInput.files[0];

            if (!selectedCover) {
                return;
            }

            const { data: { session } } =
                await supabaseClient.auth.getSession();

            if (!session || !session.user) {
                return;
            }

            const fileExtension =
                selectedCover.name.split(".").pop();

            const filePath =
                session.user.id +
                "/cover." +
                fileExtension;

            const { error: uploadError } =
                await supabaseClient.storage
                    .from("profile-images")
                    .upload(
                        filePath,
                        selectedCover,
                        {
                            upsert: true
                        }
                    );

            if (uploadError) {
                console.error(
                    "Cover photo upload error:",
                    uploadError
                );
                return;
            }

            const { data: publicUrlData } =
                supabaseClient.storage
                    .from("profile-images")
                    .getPublicUrl(filePath);

            const coverUrl =
                publicUrlData.publicUrl;

            const { error: profileUpdateError } =
                await supabaseClient
                    .from("profiles")
                    .update({
                        cover_url: coverUrl
                    })
                    .eq("id", session.user.id);

            if (profileUpdateError) {
                console.error(
                    "Profile cover update error:",
                    profileUpdateError
                );
                return;
            }

            savedProfileCover =
                coverUrl;

            profileCoverPhoto.src = coverUrl + "?v=" + Date.now();

            profileCoverPhoto.style.display =
                "block";

            profileCoverPlaceholder.style.display =
                "none";

            profileCoverButton.textContent =
                "Change Cover";
        }
    );
}

/* DreavelleVerse Color Theme */

const savedDreavelleTheme =
    localStorage.getItem(
        "dreavelleVerseTheme"
    ) || "blue";

document.body.setAttribute(
    "data-theme",
    savedDreavelleTheme
);

const themeOptions =
    document.querySelectorAll(
        ".theme-option"
    );

function updateSelectedTheme() {

    themeOptions.forEach(
        function (button) {

            if (
                button.dataset.theme ===
                document.body.getAttribute(
                    "data-theme"
                )
            ) {
                button.classList.add(
                    "selected"
                );
            } else {
                button.classList.remove(
                    "selected"
                );
            }
        }
    );
}

themeOptions.forEach(
    function (button) {

        button.addEventListener(
            "click",
            function () {

                const selectedTheme =
                    button.dataset.theme;

                document.body.setAttribute(
                    "data-theme",
                    selectedTheme
                );

                localStorage.setItem(
                    "dreavelleVerseTheme",
                    selectedTheme
                );

                updateSelectedTheme();
            }
        );
    }
);

updateSelectedTheme();

/* ========================================
   Account Settings
   ======================================== */

const settingsPage =
    document.querySelector("#settings-page");

if (settingsPage) {

    /* Protect Settings Page */

    const settingsUserLoggedIn =
        localStorage.getItem(
            "dreavelleVerseLoggedIn"
        ) === "true";

    if (!settingsUserLoggedIn) {

        window.location.href =
            "login.html";

    } else {
(async function () {

        /* Account Information */

       const settingsDisplayName =
    document.querySelector(
        "#settings-display-name"
    );

const settingsEmail =
    document.querySelector(
        "#settings-email"
    );

const {
    data: { session: settingsSession }
} = await supabaseClient.auth.getSession();

if (settingsSession?.user) {
    if (settingsEmail) {
        settingsEmail.textContent =
            settingsSession.user.email || "—";
    }

    const { data: settingsProfile, error: settingsProfileError } =
        await supabaseClient
            .from("profiles")
            .select("display_name")
            .eq("id", settingsSession.user.id)
            .maybeSingle();

    if (!settingsProfileError && settingsProfile) {
        if (settingsDisplayName) {
            settingsDisplayName.textContent =
                settingsProfile.display_name || "—";
        }
    }
}
})();

       
/* Notification Preference */
const storyNotificationsSetting =
    document.querySelector("#story-notifications-setting");

if (storyNotificationsSetting) {
    (async function () {
        const { data: { user }, error: userError } =
            await supabaseClient.auth.getUser();

        if (userError || !user) {
            storyNotificationsSetting.disabled = true;
            return;
        }

        const preferenceKey =
            "dreavelleVerseStoryNotificationsEnabled_" + user.id;

        const savedLocalPreference =
            localStorage.getItem(preferenceKey);

        const { data: preference, error: loadError } =
            await supabaseClient
                .from("notification_preferences")
                .select("story_updates_enabled")
                .eq("user_id", user.id)
                .maybeSingle();

        if (loadError) {
            console.error("Failed to load notification preference:", loadError);
            storyNotificationsSetting.disabled = true;
            return;
        }

        const enabled = preference
            ? preference.story_updates_enabled
            : savedLocalPreference === null
                ? true
                : savedLocalPreference === "true";

        storyNotificationsSetting.checked = enabled;

        if (!preference) {
            const { error: initialSaveError } =
                await supabaseClient
                    .from("notification_preferences")
                    .upsert({
                        user_id: user.id,
                        story_updates_enabled: enabled
                    }, { onConflict: "user_id" });

            if (initialSaveError) {
                console.error("Failed to save initial preference:", initialSaveError);
                storyNotificationsSetting.disabled = true;
                return;
            }
        }

        storyNotificationsSetting.addEventListener("change", async function () {
            const enabled = storyNotificationsSetting.checked;

            storyNotificationsSetting.disabled = true;

            const { error } = await supabaseClient
                .from("notification_preferences")
                .upsert({
                    user_id: user.id,
                    story_updates_enabled: enabled,
                    updated_at: new Date().toISOString()
                }, { onConflict: "user_id" });

            if (error) {
                console.error("Failed to save notification preference:", error);
                storyNotificationsSetting.checked = !enabled;
                alert("Could not save your notification setting.");
            } else {
                localStorage.setItem(preferenceKey, String(enabled));
            }

            storyNotificationsSetting.disabled = false;
        });
    })();
}


        /* Settings Log Out */

        const settingsLogoutButton =
            document.querySelector(
                "#settings-logout-button"
            );

        if (settingsLogoutButton) {

            settingsLogoutButton.addEventListener(
                "click",
                function () {

                    localStorage.setItem(
                        "dreavelleVerseLoggedIn",
                        "false"
                    );

                    window.location.href =
                        "index.html";
                }
            );
        }
    }
}

/* Reading Preferences */

const saveReadingPreferencesButton =
    document.querySelector(
        "#save-reading-preferences"
    );

const readingPreferencesStatus =
    document.querySelector(
        "#reading-preferences-status"
    );

if (saveReadingPreferencesButton) {

    /* Restore Saved Preferences */

    const savedReadingPreferences =
        JSON.parse(
            localStorage.getItem(
                "dreavelleVerseReadingPreferences"
            ) || "[]"
        );

    const genreCheckboxes =
        document.querySelectorAll(
            ".genre-preferences input[type='checkbox']"
        );

    genreCheckboxes.forEach(
        function (checkbox) {

            if (
                savedReadingPreferences.includes(
                    checkbox.value
                )
            ) {
                checkbox.checked = true;
            }
        }
    );

    /* Save Preferences */

    saveReadingPreferencesButton.addEventListener(
        "click",
        function () {

            const selectedGenres = [];

            genreCheckboxes.forEach(
                function (checkbox) {

                    if (checkbox.checked) {
                        selectedGenres.push(
                            checkbox.value
                        );
                    }
                }
            );

            localStorage.setItem(
                "dreavelleVerseReadingPreferences",
                JSON.stringify(selectedGenres)
            );

            if (readingPreferencesStatus) {
                readingPreferencesStatus.textContent =
                    "Preferences saved!";
            }
        }
    );
}

/* Story Ongoing / Completed Status */

const storyStatusBadge =
    document.querySelector("#story-status-badge");

const storyStatusButton =
    document.querySelector("#story-status-button");

async function loadStoryStatusFromSupabase() {
    const storyId = localStorage.getItem("dreavelleVerseStoryId");

    if (!storyId || !document.querySelector("#story-status-badge")) {
        return;
    }

    try {
        const { data: { session }, error: authError } =
            await supabaseClient.auth.getSession();

        if (authError || !session?.user) {
            return;
        }

        const { data: story, error } = await supabaseClient
            .from("stories")
            .select("completion_status")
            .eq("id", storyId)
            .eq("user_id", session.user.id)
            .single();

        if (error) throw error;

        localStorage.setItem(
            "dreavelleVerseStoryStatus",
            story.completion_status || "Ongoing"
        );

        updateStoryStatusDisplay();

    } catch (error) {
        console.error("Could not load story status:", error);
    }
}
function updateStoryStatusDisplay() {

    if (!storyStatusBadge || !storyStatusButton) {
        return;
    }

    const storyStatus =
        localStorage.getItem(
            "dreavelleVerseStoryStatus"
        ) || "Ongoing";

    storyStatusBadge.textContent = storyStatus;

    storyStatusBadge.classList.remove(
        "ongoing",
        "completed"
    );

    if (storyStatus === "Completed") {

        storyStatusBadge.classList.add("completed");

        storyStatusButton.textContent =
            "Mark as Ongoing";

    } else {

        storyStatusBadge.classList.add("ongoing");

        storyStatusButton.textContent =
            "Mark as Completed";
    }
}


if (storyStatusButton) {
    storyStatusButton.addEventListener("click", async function () {
        const storyId = localStorage.getItem("dreavelleVerseStoryId");

        if (!storyId) {
            alert("Please select a story first.");
            return;
        }

        storyStatusButton.disabled = true;

        try {
            const { data: { session }, error: authError } =
                await supabaseClient.auth.getSession();

            if (authError || !session?.user) {
                throw new Error("Please log in again.");
            }

            const { data: currentStory, error: loadError } =
                await supabaseClient
                    .from("stories")
                    .select("completion_status")
                    .eq("id", storyId)
                    .eq("user_id", session.user.id)
                    .single();

            if (loadError) throw loadError;

            const newStatus =
                currentStory.completion_status === "Completed"
                    ? "Ongoing"
                    : "Completed";

            const { data: updatedStory, error: saveError } =
                await supabaseClient
                    .from("stories")
                    .update({ completion_status: newStatus })
                    .eq("id", storyId)
                    .eq("user_id", session.user.id)
                    .select("completion_status")
                    .single();

            if (saveError) throw saveError;

            localStorage.setItem(
                "dreavelleVerseStoryStatus",
                updatedStory.completion_status
            );

            updateStoryStatusDisplay();
            loadStoryStatusFromSupabase();

            const completionSelect =
                document.getElementById("manager-completion-status");

            if (completionSelect) {
                completionSelect.value = updatedStory.completion_status;
            }

        } catch (error) {
            console.error("Could not update story status:", error);
            alert("Could not save story status. Please try again.");
        } finally {
            storyStatusButton.disabled = false;
        }
    });
}

updateStoryStatusDisplay();

/* Announcement and notification unread badges (all pages) */
(function () {
  const announcementTitles = new Set(["Writer Announcement"]);
  const badgeStyle = "margin-left:6px;background:#e63946;color:#fff;border-radius:12px;padding:2px 7px;font-weight:bold;font-size:12px;";
  function getBadge(link, id) {
    if (!link) return null;
    let badge = document.getElementById(id);
    if (!badge) {
      badge = document.createElement("span");
      badge.id = id;
      badge.style.cssText = badgeStyle;
      badge.hidden = true;
      link.appendChild(badge);
    }
    return badge;
  }
  async function refreshUnreadBadges() {
    if (!window.supabaseClient) return;
    const { data: { user }, error: authError } = await window.supabaseClient.auth.getUser();
    const announcementLinks = Array.from(document.querySelectorAll('a[href^="announcements.html"]'));
    const notificationLinks = Array.from(document.querySelectorAll('a[href^="notifications.html"]'));
    if (authError || !user) {
      for (const link of [...announcementLinks, ...notificationLinks]) {
        const badge = link.querySelector('.dv-unread-badge');
        if (badge) badge.hidden = true;
      }
      return;
    }
    const { data, error } = await window.supabaseClient.from('notifications')
      .select('title').eq('user_id', user.id).eq('is_read', false);
    if (error) { console.warn('Unread badge lookup:', error.message); return; }
    const all = (data || []).length;
    const announcements = (data || []).filter(n => announcementTitles.has((n.title || '').trim())).length;
    function show(link, id, count) {
      const badge = getBadge(link, id);
      if (!badge) return;
      badge.classList.add('dv-unread-badge');
      badge.textContent = String(count);
      badge.hidden = count === 0;
      badge.setAttribute('aria-label', count + ' unread');
    }
    announcementLinks.forEach((link, i) => show(link, 'dv-ann-count-' + i, announcements));
    notificationLinks.forEach((link, i) => {
      const existing = link.querySelector('#notification-count');
      if (existing) {
        existing.textContent = String(all);
        existing.hidden = all === 0;
      } else show(link, 'dv-notification-count-' + i, all);
    });
  }
  window.dvRefreshUnreadBadges = refreshUnreadBadges;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refreshUnreadBadges);
  } else refreshUnreadBadges();
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshUnreadBadges();
  });
  window.addEventListener('dv-announcement-read', refreshUnreadBadges);
  setInterval(() => { if (!document.hidden) refreshUnreadBadges(); }, 30000);
})();


/* My Library - Daily Suggested Stories */

async function loadLibrarySuggestions() {
    const container = document.getElementById("library-suggested-stories");
    if (!container) return;

    const { data: stories, error } = await supabaseClient
        .from("stories")
        .select("id,title,author,cover_url")
        .eq("status", "Published")
        .order("id", { ascending: true })
        .limit(1000);

    if (error) {
        console.error("Unable to load suggested stories:", error);
        container.textContent = "Suggestions are temporarily unavailable.";
        return;
    }

    if (!stories || !stories.length) {
        container.textContent = "No suggested stories available yet.";
        return;
    }
    // Exclude stories already saved in the reader's library.
let availableStories = stories;

const { data: { session }, error: sessionError } =
    await supabaseClient.auth.getSession();

if (sessionError) {
    console.warn("Unable to check library session:", sessionError);
}

if (session?.user) {
    const { data: savedStories, error: savedError } =
        await supabaseClient
            .from("library")
            .select("story_id")
            .eq("user_id", session.user.id);

    if (savedError) {
        console.warn("Unable to check saved stories:", savedError);
    } else {
        const savedIds = new Set(
            (savedStories || []).map(row => String(row.story_id))
        );

        availableStories = stories.filter(
            story => !savedIds.has(String(story.id))
        );
    }
}

if (availableStories.length === 0) {
    container.textContent =
        "You've already saved all available stories. Explore again soon!";
    return;
}

    // Use the UTC date so all readers see the same daily rotation.
    const today = new Date().toISOString().slice(0, 10);
    const dayNumber = Math.floor(
        Date.parse(today + "T00:00:00Z") / 86400000
    );

    // Deterministic daily rotation across the fetched stories.
    const offset = dayNumber % availableStories.length;
const selected = [];

for (let i = 0; i < Math.min(5, availableStories.length); i++) {
    selected.push(
        availableStories[(offset + i) % availableStories.length]
    );
}

    container.replaceChildren();

    for (const story of selected) {
        const card = document.createElement("article");
        card.className = "library-suggestion-card";

        const cover = document.createElement("img");
        cover.className = "library-suggestion-cover";
        cover.alt = `${story.title || "Story"} cover`;
        cover.loading = "lazy";
        if (story.cover_url) {
            cover.src = story.cover_url;
        } else {
            cover.style.display = "none";
        }

        const title = document.createElement("h3");
        title.textContent = story.title || "Untitled Story";

        const author = document.createElement("p");
        author.textContent = `By ${story.author || "Unknown Author"}`;

        const read = document.createElement("a");
        read.className = "start-reading-button";
        read.href = `read-story.html?id=${encodeURIComponent(story.id)}`;
        read.textContent = "Start Reading";

        card.append(cover, title, author, read);
        container.append(card);
    }
}

loadLibrarySuggestions().catch(console.error);


/* DreavelleVerse member follow lists — read-only, no changes to existing follow actions. */
(function () {
  if (window.dvFollowLists) return;
  const css = `.dv-social-root{margin:14px 0;text-align:left}.dv-social-tabs{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px}.dv-social-tabs button{border:1px solid #c84277;border-radius:999px;padding:9px 15px;background:#fff;color:#9b306c;cursor:pointer;font:inherit}.dv-social-tabs button[aria-pressed="true"]{background:#a43caa;color:#fff;border-color:#a43caa}.dv-social-list{display:grid;gap:9px;max-height:330px;overflow-y:auto}.dv-social-person{display:flex;gap:12px;align-items:center;padding:10px;border:1px solid #ecd5e7;border-radius:12px;background:#fff;text-decoration:none;color:#063b54}.dv-social-person:hover{background:#fff5fc}.dv-social-avatar{width:42px;height:42px;flex:none;object-fit:cover;border-radius:50%;background:#eee}.dv-social-initial{display:grid;place-items:center;font-weight:bold;color:#fff;background:#a43caa}.dv-social-empty{color:#666;padding:12px 2px}`;
  const style=document.createElement('style');style.textContent=css;document.head.append(style);
  async function mount(root, accountId) {
    if (!root || !accountId) return;
    root.replaceChildren();
    const tabs=document.createElement('div');tabs.className='dv-social-tabs';
    const list=document.createElement('div');list.className='dv-social-list';list.setAttribute('aria-live','polite');
    root.append(tabs,list);
    let active='followers', seq=0;
    const buttons={};
    for(const key of ['followers','following']){
      const btn=document.createElement('button');btn.type='button';btn.textContent=key==='followers'?'Followers':'Following';
      btn.onclick=()=>load(key);buttons[key]=btn;tabs.append(btn);
    }
    async function load(key){
      active=key;const current=++seq;
      for(const k of Object.keys(buttons))buttons[k].setAttribute('aria-pressed',String(k===key));
      list.textContent='Loading '+key+'…';
      const col=key==='followers'?'followed_id':'follower_id';
      const memberCol=key==='followers'?'follower_id':'followed_id';
      const {data,error}=await supabaseClient.from('account_follows').select('follower_id,followed_id').eq(col,accountId).limit(500);
      if(current!==seq)return;
      if(error){list.textContent='Unable to load '+key+'. Please check account_follows read permissions.';console.error(error);return;}
      const ids=[...new Set((data||[]).map(r=>r[memberCol]).filter(Boolean))];
      buttons[key].textContent=(key==='followers'?'Followers':'Following')+' ('+ids.length+(data?.length===500?'+':'')+')';
      if(!ids.length){list.textContent=key==='followers'?'No followers yet.':'Not following anyone yet.';return;}
      const {data:people,error:peopleError}=await supabaseClient.from('profiles').select('id,display_name,avatar_url').in('id',ids);
      if(current!==seq)return;
      if(peopleError){list.textContent='Unable to load member names.';console.error(peopleError);return;}
      const byId=new Map((people||[]).map(p=>[p.id,p]));list.replaceChildren();
      for(const id of ids){
        const person=byId.get(id);if(!person)continue;
        const a=document.createElement('a');a.className='dv-social-person';a.href='public-profile.html?id='+encodeURIComponent(id);
        const name=person.display_name||'DreavelleVerse Member';
        if(person.avatar_url && /^https:\/\//i.test(person.avatar_url)){
          const img=document.createElement('img');img.className='dv-social-avatar';img.alt='';img.src=person.avatar_url;a.append(img);
        }else{const avatar=document.createElement('span');avatar.className='dv-social-avatar dv-social-initial';avatar.textContent=name.charAt(0).toUpperCase();a.append(avatar);}
        const label=document.createElement('strong');label.textContent=name;a.append(label);list.append(a);
      }
      if(!list.childElementCount)list.textContent='No visible member profiles.';
    }
    // Use the same row query that works when a tab is clicked.
    // This also avoids count-only requests returning no count under some policies.
    await Promise.all(['followers', 'following'].map(async (key) => {
      const column = key === 'followers' ? 'followed_id' : 'follower_id';
      const memberColumn = key === 'followers' ? 'follower_id' : 'followed_id';
      const { data, error } = await supabaseClient.from('account_follows')
        .select('follower_id,followed_id').eq(column, accountId).limit(500);
      if (error) {
        console.error('Could not load ' + key + ' count:', error);
        buttons[key].textContent = (key === 'followers' ? 'Followers' : 'Following') + ' (—)';
      } else {
        const uniqueIds = new Set((data || []).map(row => row[memberColumn]).filter(Boolean));
        buttons[key].textContent = (key === 'followers' ? 'Followers' : 'Following') +
          ' (' + uniqueIds.size + ((data || []).length === 500 ? '+' : '') + ')';
      }
    }));
    await load('followers');
  }
  window.dvFollowLists={mount};
})();

if (document.getElementById('dv-my-social')) {
  (async () => { const {data:{session}}=await supabaseClient.auth.getSession();
    if(session?.user) await window.dvFollowLists.mount(document.getElementById('dv-my-social'),session.user.id);
  })();
}

/* DreavelleVerse — Admin Book Cover Review Queue */
(async function loadAdminCoverReviews() {
    const section = document.getElementById("admin-cover-approvals");
    if (!section) return;

    const count = document.getElementById("admin-cover-pending-count");
    const list = document.getElementById("admin-cover-review-list");

    const { data: { user }, error: authError } =
        await supabaseClient.auth.getUser();

    if (authError || !user) return;

    const { data: isAdmin, error: adminError } =
        await supabaseClient.rpc("is_story_report_admin");

    if (adminError || isAdmin !== true) return;

    section.style.display = "block";
    count.textContent = "Loading pending covers...";

    const { data: reviews, error } = await supabaseClient
        .from("dv_cover_reviews")
        .select("id, story_id, writer_id, storage_path, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: true });

    if (error) {
        count.textContent = "Unable to load pending covers.";
        console.error("Cover review error:", error);
        return;
    }

    count.textContent =
        `${reviews.length} book cover(s) awaiting approval`;

    list.replaceChildren();

    for (const review of reviews) {
        const card = document.createElement("div");
        card.className = "writer-story-card";

        const heading = document.createElement("h3");
        heading.textContent = "Pending Book Cover";

        const story = document.createElement("p");
        story.textContent = `Story ID: ${review.story_id}`;

        const submitted = document.createElement("p");
        submitted.textContent =
            `Submitted: ${new Date(review.created_at).toLocaleString()}`;

        const status = document.createElement("p");
        status.textContent = "Status: Pending administrator review";

        const coverPreview = document.createElement("img");
coverPreview.alt = "Book cover awaiting review";
coverPreview.style.width = "140px";
coverPreview.style.maxHeight = "200px";
coverPreview.style.objectFit = "contain";
coverPreview.style.borderRadius = "8px";

const { data: coverData, error: coverError } =
  await supabaseClient.storage
    .from("pending-story-covers")
    .createSignedUrl(review.storage_path, 300);

if (!coverError && coverData?.signedUrl) {
  coverPreview.src = coverData.signedUrl;
  card.appendChild(coverPreview);
}
        
        const actions = document.createElement("div");
actions.style.display = "flex";
actions.style.gap = "10px";
actions.style.marginTop = "12px";

const approveButton = document.createElement("button");
approveButton.type = "button";
approveButton.textContent = "✓ Approve";
approveButton.addEventListener("click", () => {
    alert("Approve button clicked — staging test only.");
});
const rejectButton = document.createElement("button");
rejectButton.type = "button";
rejectButton.textContent = "✕ Reject";

actions.append(approveButton, rejectButton);
card.appendChild(actions);
        card.append(heading, story, submitted, status);
        list.appendChild(card);
    }
})();

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadAdminCoverReviews);
} else {
    loadAdminCoverReviews();
}
