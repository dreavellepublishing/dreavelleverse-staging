-- Run once in Supabase SQL Editor. Does not modify existing chapters or ticket systems.
CREATE TABLE IF NOT EXISTS public.dv_chapter_engagement (
  story_id uuid NOT NULL,
  chapter_number integer NOT NULL,
  author_note text,
  poll_question text,
  poll_options jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (story_id, chapter_number),
  CONSTRAINT dv_note_word_limit CHECK (coalesce(array_length(regexp_split_to_array(trim(coalesce(author_note,'')), '\s+'),1),0) <= 300 OR trim(coalesce(author_note,'')) = ''),
  CONSTRAINT dv_poll_valid CHECK (
    (poll_question IS NULL AND poll_options = '[]'::jsonb)
    OR (poll_question IS NOT NULL AND length(trim(poll_question)) BETWEEN 1 AND 200 AND jsonb_typeof(poll_options)='array' AND jsonb_array_length(poll_options) BETWEEN 2 AND 4)
  )
);
CREATE TABLE IF NOT EXISTS public.dv_chapter_poll_votes (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  story_id uuid NOT NULL,
  chapter_number integer NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_index integer NOT NULL CHECK (option_index BETWEEN 0 AND 3),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (story_id, chapter_number, user_id),
  FOREIGN KEY (story_id, chapter_number) REFERENCES public.dv_chapter_engagement(story_id,chapter_number) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS dv_votes_chapter_idx ON public.dv_chapter_poll_votes(story_id,chapter_number);
ALTER TABLE public.dv_chapter_engagement ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dv_chapter_poll_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dv_engagement_read ON public.dv_chapter_engagement;
CREATE POLICY dv_engagement_read ON public.dv_chapter_engagement FOR SELECT TO anon,authenticated
USING (
 EXISTS (SELECT 1 FROM public.chapters c WHERE c.story_id=dv_chapter_engagement.story_id AND c.chapter_number=dv_chapter_engagement.chapter_number AND (c.status='Published' OR c.user_id=(select auth.uid())))
);
DROP POLICY IF EXISTS dv_engagement_insert ON public.dv_chapter_engagement;
CREATE POLICY dv_engagement_insert ON public.dv_chapter_engagement FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.chapters c WHERE c.story_id=dv_chapter_engagement.story_id AND c.chapter_number=dv_chapter_engagement.chapter_number AND c.user_id=(select auth.uid())));
DROP POLICY IF EXISTS dv_engagement_update ON public.dv_chapter_engagement;
CREATE POLICY dv_engagement_update ON public.dv_chapter_engagement FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.chapters c WHERE c.story_id=dv_chapter_engagement.story_id AND c.chapter_number=dv_chapter_engagement.chapter_number AND c.user_id=(select auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM public.chapters c WHERE c.story_id=dv_chapter_engagement.story_id AND c.chapter_number=dv_chapter_engagement.chapter_number AND c.user_id=(select auth.uid())));
DROP POLICY IF EXISTS dv_votes_read ON public.dv_chapter_poll_votes;
CREATE POLICY dv_votes_read ON public.dv_chapter_poll_votes FOR SELECT TO anon,authenticated
USING (EXISTS (SELECT 1 FROM public.chapters c WHERE c.story_id=dv_chapter_poll_votes.story_id AND c.chapter_number=dv_chapter_poll_votes.chapter_number AND (c.status='Published' OR c.user_id=(select auth.uid()))));
DROP POLICY IF EXISTS dv_votes_insert ON public.dv_chapter_poll_votes;
CREATE POLICY dv_votes_insert ON public.dv_chapter_poll_votes FOR INSERT TO authenticated
WITH CHECK (
 user_id=(select auth.uid())
 AND EXISTS (SELECT 1 FROM public.chapters c WHERE c.story_id=dv_chapter_poll_votes.story_id AND c.chapter_number=dv_chapter_poll_votes.chapter_number AND c.status='Published')
 AND EXISTS (SELECT 1 FROM public.dv_chapter_engagement e WHERE e.story_id=dv_chapter_poll_votes.story_id AND e.chapter_number=dv_chapter_poll_votes.chapter_number AND e.poll_question IS NOT NULL AND option_index < jsonb_array_length(e.poll_options))
);
GRANT SELECT ON public.dv_chapter_engagement TO anon,authenticated;
GRANT INSERT,UPDATE ON public.dv_chapter_engagement TO authenticated;
GRANT SELECT ON public.dv_chapter_poll_votes TO anon,authenticated;
GRANT INSERT ON public.dv_chapter_poll_votes TO authenticated;
GRANT USAGE,SELECT ON SEQUENCE public.dv_chapter_poll_votes_id_seq TO authenticated;
