
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "announcements_read_all" ON public.announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "announcements_insert_own" ON public.announcements FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "announcements_update_own_or_admin" ON public.announcements FOR UPDATE TO authenticated USING (auth.uid() = author_id OR public.is_admin(auth.uid())) WITH CHECK (auth.uid() = author_id OR public.is_admin(auth.uid()));
CREATE POLICY "announcements_delete_own_or_admin" ON public.announcements FOR DELETE TO authenticated USING (auth.uid() = author_id OR public.is_admin(auth.uid()));
CREATE TRIGGER trg_announcements_updated_at BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.announcement_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES public.announcement_comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcement_comments TO authenticated;
GRANT ALL ON public.announcement_comments TO service_role;
ALTER TABLE public.announcement_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ac_read_all" ON public.announcement_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "ac_insert_own" ON public.announcement_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "ac_update_own" ON public.announcement_comments FOR UPDATE TO authenticated USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE POLICY "ac_delete_own_or_admin" ON public.announcement_comments FOR DELETE TO authenticated USING (auth.uid() = author_id OR public.is_admin(auth.uid()));
CREATE TRIGGER trg_ac_updated_at BEFORE UPDATE ON public.announcement_comments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_ac_announcement ON public.announcement_comments(announcement_id);
CREATE INDEX idx_ac_parent ON public.announcement_comments(parent_comment_id);

CREATE TABLE public.announcement_likes (
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (announcement_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.announcement_likes TO authenticated;
GRANT ALL ON public.announcement_likes TO service_role;
ALTER TABLE public.announcement_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "al_read_all" ON public.announcement_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "al_insert_own" ON public.announcement_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "al_delete_own" ON public.announcement_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);
