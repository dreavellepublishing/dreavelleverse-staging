-- STAGING ONLY. Run in staging Supabase SQL Editor before testing.
-- Chapter stars: server-enforced one per reader per published chapter; no self-voting.
CREATE TABLE IF NOT EXISTS public.dv_chapter_stars (
 story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
 chapter_number integer NOT NULL,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (story_id, chapter_number, user_id)
);
CREATE INDEX IF NOT EXISTS dv_chapter_stars_story_idx ON public.dv_chapter_stars(story_id,chapter_number);
ALTER TABLE public.dv_chapter_stars ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS dv_stars_read ON public.dv_chapter_stars;
CREATE POLICY dv_stars_read ON public.dv_chapter_stars FOR SELECT TO anon,authenticated USING (true);
DROP POLICY IF EXISTS dv_stars_insert ON public.dv_chapter_stars;
CREATE POLICY dv_stars_insert ON public.dv_chapter_stars FOR INSERT TO authenticated
WITH CHECK (user_id=(select auth.uid()) AND EXISTS (
 SELECT 1 FROM public.chapters c WHERE c.story_id=dv_chapter_stars.story_id
 AND c.chapter_number=dv_chapter_stars.chapter_number AND c.status='Published'
 AND c.user_id<>(select auth.uid())));
DROP POLICY IF EXISTS dv_stars_delete ON public.dv_chapter_stars;
CREATE POLICY dv_stars_delete ON public.dv_chapter_stars FOR DELETE TO authenticated
USING (user_id=(select auth.uid()));
GRANT SELECT ON public.dv_chapter_stars TO anon,authenticated;
GRANT INSERT,DELETE ON public.dv_chapter_stars TO authenticated;
CREATE OR REPLACE FUNCTION public.dv_chapter_star_count(p_story_id uuid,p_chapter_number integer)
RETURNS bigint LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
 SELECT count(*) FROM public.dv_chapter_stars WHERE story_id=p_story_id AND chapter_number=p_chapter_number;
$$;
CREATE OR REPLACE FUNCTION public.dv_story_star_total(p_story_id uuid)
RETURNS bigint LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
 SELECT count(*) FROM public.dv_chapter_stars WHERE story_id=p_story_id;
$$;
GRANT EXECUTE ON FUNCTION public.dv_chapter_star_count(uuid,integer) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dv_story_star_total(uuid) TO anon,authenticated;
-- Mature chapter flags are author-managed metadata. Client-side confirmation is not verified age assurance.
CREATE TABLE IF NOT EXISTS public.dv_chapter_warnings (
 story_id uuid NOT NULL,
 chapter_number integer NOT NULL,
 warning_level text NOT NULL DEFAULT 'none' CHECK (warning_level IN ('none','mature','r18')),
 warning_topics text[] NOT NULL DEFAULT '{}',
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (story_id,chapter_number)
);
ALTER TABLE public.dv_chapter_warnings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS dv_warnings_read ON public.dv_chapter_warnings;
CREATE POLICY dv_warnings_read ON public.dv_chapter_warnings FOR SELECT TO anon,authenticated USING (true);
DROP POLICY IF EXISTS dv_warnings_insert ON public.dv_chapter_warnings;
CREATE POLICY dv_warnings_insert ON public.dv_chapter_warnings FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.stories s WHERE s.id=dv_chapter_warnings.story_id AND s.user_id=(select auth.uid())));
DROP POLICY IF EXISTS dv_warnings_update ON public.dv_chapter_warnings;
CREATE POLICY dv_warnings_update ON public.dv_chapter_warnings FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.stories s WHERE s.id=dv_chapter_warnings.story_id AND s.user_id=(select auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM public.stories s WHERE s.id=dv_chapter_warnings.story_id AND s.user_id=(select auth.uid())));
GRANT SELECT ON public.dv_chapter_warnings TO anon,authenticated;
GRANT INSERT,UPDATE ON public.dv_chapter_warnings TO authenticated;
