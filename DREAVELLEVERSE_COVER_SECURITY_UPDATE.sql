-- DreavelleVerse cover-review enforcement, to apply together with the website update.
-- Run on staging first. BACK UP database and policy definitions before production use.
-- Requires COVER_MODERATION_SETUP.sql to have already run.
BEGIN;

-- Prevent regular writers from uploading/replacing objects in the PUBLIC bucket.
-- Do not touch SELECT or DELETE policies: existing covers remain readable.
DROP POLICY IF EXISTS "Give users access to own folder 1vodd2s_1" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1vodd2s_2" ON storage.objects;

-- A new story cannot assign its own public cover URL. The writer's cover is
-- uploaded privately after the story exists and submitted for review.
-- Existing public URLs are preserved on all unrelated story edits.
CREATE OR REPLACE FUNCTION public.dv_guard_story_cover_url()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.cover_url IS NOT NULL AND btrim(NEW.cover_url) <> '' THEN
      RAISE EXCEPTION 'Book covers must be submitted for review';
    END IF;
  ELSIF NEW.cover_url IS DISTINCT FROM OLD.cover_url THEN
    IF NEW.cover_url IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.dv_cover_reviews r
      WHERE r.story_id = NEW.id AND r.writer_id = NEW.user_id
        AND r.status = 'approved'
        AND NEW.cover_url =
          'https://mdsxnmoezhnruojxnhcu.supabase.co/storage/v1/object/public/story-covers/' ||
          r.writer_id::text || '/' || r.story_id::text || '/approved-' || r.id::text || '.' ||
          split_part(r.storage_path,'.',array_length(string_to_array(r.storage_path,'.'),1))
    ) THEN
      RAISE EXCEPTION 'Cover URL can only be changed to an approved cover';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS dv_guard_story_cover_url ON public.stories;
CREATE TRIGGER dv_guard_story_cover_url BEFORE INSERT OR UPDATE OF cover_url
ON public.stories FOR EACH ROW EXECUTE FUNCTION public.dv_guard_story_cover_url();

-- The existing approval RPC is adjusted to mark the review approved BEFORE
-- updating the story, so the guard can validate the approved cover.
CREATE OR REPLACE FUNCTION public.dv_decide_cover_review(review_id uuid, decision text, approved_path text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE r public.dv_cover_reviews%ROWTYPE;
DECLARE expected_path text;
BEGIN
  IF NOT public.is_story_report_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF decision NOT IN ('approve','reject') THEN RAISE EXCEPTION 'Invalid decision'; END IF;
  SELECT * INTO r FROM public.dv_cover_reviews WHERE id=review_id FOR UPDATE;
  IF NOT FOUND OR r.status <> 'pending' THEN RAISE EXCEPTION 'Review not pending'; END IF;
  IF decision = 'approve' THEN
    IF NOT EXISTS (SELECT 1 FROM public.stories s WHERE s.id=r.story_id AND s.user_id=r.writer_id) THEN
      RAISE EXCEPTION 'Story owner mismatch or story missing';
    END IF;
    expected_path := r.writer_id::text || '/' || r.story_id::text || '/approved-' || r.id::text || '.' ||
      split_part(r.storage_path,'.',array_length(string_to_array(r.storage_path,'.'),1));
    IF approved_path IS DISTINCT FROM expected_path THEN RAISE EXCEPTION 'Invalid approved path'; END IF;
    IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id='pending-story-covers' AND name=r.storage_path) THEN
      RAISE EXCEPTION 'Pending image missing';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id='story-covers' AND name=approved_path) THEN
      RAISE EXCEPTION 'Approved image not found';
    END IF;
    UPDATE public.dv_cover_reviews SET status='approved',reviewed_at=now() WHERE id=review_id;
    UPDATE public.stories SET cover_url =
      'https://mdsxnmoezhnruojxnhcu.supabase.co/storage/v1/object/public/story-covers/' || approved_path,
      updated_at=now() WHERE id=r.story_id;
  ELSE
    UPDATE public.dv_cover_reviews SET status='rejected',reviewed_at=now() WHERE id=review_id;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.dv_decide_cover_review(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dv_decide_cover_review(uuid,text,text) TO authenticated;
COMMIT;

-- IMPORTANT: Public approved image is uploaded from the admin browser before RPC.
-- Storage and database are not one atomic transaction. An RPC failure can leave
-- an unreferenced public file. This is NOT a fully tamper-proof moderation gate.
-- For stronger guarantees use a trusted server-side approval function with
-- a controlled storage copy and immutable image verification.
-- IMPORTANT: Inspect all other storage.objects policies for alternative
-- INSERT/UPDATE access. PostgreSQL permissive RLS policies are OR-combined.
-- This script specifically addresses the two policies verified in screenshots.
