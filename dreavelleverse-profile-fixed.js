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

    const storyId =
        localStorage.getItem(
            "dreavelleVerseStoryId"
        );

    if (!storyId) {
        console.error(
            "Could not upload cover: Story ID not found."
        );
        return;
    }

    const fileExtension =
        selectedStoryCover.name
            .split(".")
            .pop();

    const coverPath =
        `${session.user.id}/${storyId}/cover.${fileExtension}`;

    const { error: coverUploadError } =
        await supabaseClient.storage
            .from("story-covers")
            .upload(
                coverPath,
                selectedStoryCover,
                {
                    upsert: true
                }
            );

    if (coverUploadError) {
        console.error(
            "Could not upload story cover:",
            coverUploadError
        );
        return;
    }

    const { data: coverData } =
        supabaseClient.storage
            .from("story-covers")
            .getPublicUrl(coverPath);

    const coverUrl =
        coverData.publicUrl;

    const { error: coverUpdateError } =
        await supabaseClient
            .from("stories")
            .update({
                cover_url: coverUrl,
                updated_at:
                    new Date().toISOString()
            })
            .eq("id", storyId)
            .eq("user_id", session.user.id);

    if (coverUpdateError) {
        console.error(
            "Could not save story cover URL:",
            coverUpdateError
        );
        return;
    }
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
                    "title, author, description, genre, tags"
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

        managerStoryTitle.textContent =
            story.title || "Untitled Story";

        if (managerStoryDescription) {
            managerStoryDescription.textContent =
                story.description || "";
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

/* Reader Chapter Navigation */

const previousButton = document.querySelector(
    ".reading-navigation button:first-child"
);

const nextButton = document.querySelector(
    ".reading-navigation button:last-child"
);

if (chapterContent) {

    const currentReadingChapter = Number(
        localStorage.getItem(
            "dreavelleVerseReadingChapter"
        ) || "1"
    );

    const totalChapters = Number(
        localStorage.getItem(
            "dreavelleVerseTotalChapters"
        ) || "1"
    );

    let previousPublishedChapter = null;
    let nextPublishedChapter = null;

    /* Find previous published chapter */

    for (
        let i = currentReadingChapter - 1;
        i >= 1;
        i--
    ) {

        const savedChapter = localStorage.getItem(
            `dreavelleVerseChapter${i}`
        );

        if (savedChapter) {

            const chapterData =
                JSON.parse(savedChapter);

            if (
                chapterData.status &&
                chapterData.status.toLowerCase() === "published"
            ) {
                previousPublishedChapter = i;
                break;
            }
        }
    }

    /* Find next published chapter */

    for (
        let i = currentReadingChapter + 1;
        i <= totalChapters;
        i++
    ) {

        const savedChapter = localStorage.getItem(
            `dreavelleVerseChapter${i}`
        );

        if (savedChapter) {

            const chapterData =
                JSON.parse(savedChapter);

            if (
                chapterData.status &&
                chapterData.status.toLowerCase() === "published"
            ) {
                nextPublishedChapter = i;
                break;
            }
        }
    }

    /* Previous Chapter Button */

if (previousButton) {

    if (previousPublishedChapter === null) {

        previousButton.style.display = "none";

    } else {

        previousButton.style.display = "";

        previousButton.onclick = function () {

            localStorage.setItem(
                "dreavelleVerseReadingChapter",
                previousPublishedChapter.toString()
            );

            localStorage.setItem(
                "dreavelleVerseLastReadChapter",
                previousPublishedChapter.toString()
            );

            location.reload();
        };
    }
}
const markCompletedButton = document.querySelector(
    "#mark-completed-button"
);
if (markCompletedButton) {

    const storyCompleted = localStorage.getItem(
        "dreavelleVerseStoryCompleted"
    );

    if (storyCompleted === "true") {
        markCompletedButton.textContent = "✓ Completed";
    }

    markCompletedButton.addEventListener(
        "click",
        function () {

            localStorage.setItem(
                "dreavelleVerseStoryCompleted",
                "true"
            );

            markCompletedButton.textContent =
                "✓ Completed";
        }
    );
}

    /* Next Chapter Button */

if (nextButton) {

    if (nextPublishedChapter === null) {

        nextButton.style.display = "none";
        if (markCompletedButton) {
    markCompletedButton.style.display = "inline-block";
}

    } else {

        nextButton.style.display = "";

        nextButton.onclick = function () {

            localStorage.setItem(
                "dreavelleVerseReadingChapter",
                nextPublishedChapter.toString()
            );

            localStorage.setItem(
                "dreavelleVerseLastReadChapter",
                nextPublishedChapter.toString()
            );

            location.reload();
        };
    }
}
}

/* Discover all public stories that have at least one published chapter. */
const discoverStories = document.querySelector("#discover-stories");
if (discoverStories) {
    (async function loadDiscoverStories() {
        const { data: stories, error } = await supabaseClient
            .from("stories")
            .select("id, title, author, description, genre, tags, cover_url")
            .eq("status", "Published");
        if (error) {
            console.error("Could not load published stories:", error);
            discoverStories.textContent = "Unable to load stories right now.";
            return;
        }
        const preferences = JSON.parse(localStorage.getItem("dreavelleVerseReadingPreferences") || "[]");
        discoverStories.replaceChildren();
        let visibleCount = 0;
        for (const story of stories || []) {
            if (preferences.length && !preferences.includes(story.genre || "")) continue;
            const { data: chapters, error: chapterError } = await supabaseClient
                .from("chapters")
                .select("id")
                .eq("story_id", story.id)
                .eq("status", "Published")
                .limit(1);
            if (chapterError || !chapters?.length) continue;
            const card = document.createElement("div");
            card.className = "story-card";
            if (story.cover_url) {
                const cover = document.createElement("img");
                cover.className = "story-cover-image";
                cover.alt = `${story.title || "Story"} cover`;
                // Accept only expected remote image URLs.
                try {
                    const url = new URL(story.cover_url);
                    if (["https:", "http:"].includes(url.protocol)) {
                        cover.src = url.href;
                        card.appendChild(cover);
                    }
                } catch (_) { /* Ignore malformed cover URLs. */ }
            } else {
                const placeholder = document.createElement("div");
                placeholder.className = "story-cover-placeholder";
                placeholder.textContent = "Story Cover";
                card.appendChild(placeholder);
            }
            function addText(tag, value, className) {
                const element = document.createElement(tag);
                if (className) element.className = className;
                element.textContent = value;
                card.appendChild(element);
            }
            addText("h3", story.title || "Untitled Story");
            addText("p", `By ${story.author || "Unknown Author"}`, "discover-story-author");
            addText("p", story.description || "");
            addText("p", `Genre: ${story.genre || ""}`, "discover-story-genre");
            addText("p", `Tags: ${story.tags || ""}`, "discover-story-tags");
            const readLink = document.createElement("a");
            readLink.href = `read-story.html?id=${encodeURIComponent(story.id)}`;
            readLink.className = "start-reading-button";
            readLink.textContent = "Start Reading";
            card.appendChild(readLink);
            discoverStories.appendChild(card);
            visibleCount++;
        }
        if (!visibleCount) discoverStories.textContent = "No published stories yet.";
    })();
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
            localStorage.getItem(
                "dreavelleVerseStoryId"
            );

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

                    <p>
                        ${story.description || ""}
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

            window.location.href = "read-story.html";
        });
    });


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
    const unreadCount = notifications.filter(
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
      heading.textContent = "New Chapter Published";

      const message = document.createElement("p");
      message.textContent = notification.message;

      const date = document.createElement("p");
      date.textContent = new Date(notification.created_at).toLocaleString();

      const button = document.createElement("button");
      button.type = "button";
      button.className = "notification-read-button";
      button.textContent = "Read Chapter";

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
const writerStoryList = document.querySelector("#writer-story-list");

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
            .select("id, title, status")
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
            const title = document.createElement("strong");
            title.textContent = story.title || "Untitled Story";
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
            item.append(title, status, manage);
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
        savedProfilePicture + (savedProfilePicture.includes("?") ? "&" : "?") + "v=" + Date.now();

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
            "/profile-" + Date.now() + "-" +
            Math.random().toString(36).slice(2, 8) + "." +
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
            alert("Could not save the image: " + uploadError.message);
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
            alert("Could not save the image: " + profileUpdateError.message);
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
                savedProfileCover + (savedProfileCover.includes("?") ? "&" : "?") + "v=" + Date.now();

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
                "/cover-" + Date.now() + "-" +
                Math.random().toString(36).slice(2, 8) + "." +
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
                alert("Could not save the image: " + uploadError.message);
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
                alert("Could not save the image: " + profileUpdateError.message);
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

    storyStatusButton.addEventListener(
        "click",
        function () {

            const currentStatus =
                localStorage.getItem(
                    "dreavelleVerseStoryStatus"
                ) || "Ongoing";

            const newStatus =
                currentStatus === "Completed"
                    ? "Ongoing"
                    : "Completed";

            localStorage.setItem(
                "dreavelleVerseStoryStatus",
                newStatus
            );

            updateStoryStatusDisplay();
        }
    );
}

updateStoryStatusDisplay();