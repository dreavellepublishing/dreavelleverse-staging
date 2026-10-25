DreavelleVerse staging — unified story statistics update (2026-10-25)

Changes:
- My Stories: Reads, Likes, Stars, Follows on each story card.
- Manage Story: Chapter Stars now appears in the main dashboard row.
- Discover: four read-only statistics on Featured and Suggested story cards.
- Story Details: four statistics together in Reads, Likes, Stars, Follows order.
- Uses existing story_likes, story_follows and dv_story_star_total; no new SQL required.
- Does not change chapter voting, R18 warning, or book cover moderation.

Deploy only to dreavelleverse-staging and test with the two staging accounts.
If a counter shows a dash (—), check the browser console and Supabase RLS for that table.
Do not deploy to live until all staging tests pass.
