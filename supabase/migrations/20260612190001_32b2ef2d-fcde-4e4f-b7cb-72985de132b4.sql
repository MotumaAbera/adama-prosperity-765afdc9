
-- Enums
CREATE TYPE public.app_role AS ENUM ('super_admin','city_admin','subcity_admin','woreda_officer','viewer');
CREATE TYPE public.confidentiality_level AS ENUM ('Public','Internal','Restricted','Confidential','Top Secret');

-- Utility: updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Subcities
CREATE TABLE public.subcities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subcities TO authenticated;
GRANT ALL ON public.subcities TO service_role;
ALTER TABLE public.subcities ENABLE ROW LEVEL SECURITY;

-- Woredas
CREATE TABLE public.woredas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcity_id UUID NOT NULL REFERENCES public.subcities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (subcity_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.woredas TO authenticated;
GRANT ALL ON public.woredas TO service_role;
ALTER TABLE public.woredas ENABLE ROW LEVEL SECURITY;

-- Categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  subcity_id UUID REFERENCES public.subcities(id) ON DELETE SET NULL,
  woreda_id UUID REFERENCES public.woredas(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('super_admin','city_admin'));
$$;

CREATE OR REPLACE FUNCTION public.get_user_subcity(_user_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT subcity_id FROM public.profiles WHERE id = _user_id;
$$;

CREATE OR REPLACE FUNCTION public.get_user_woreda(_user_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT woreda_id FROM public.profiles WHERE id = _user_id;
$$;

-- Documents
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  document_number TEXT,
  description TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  subcity_id UUID REFERENCES public.subcities(id) ON DELETE SET NULL,
  woreda_id UUID REFERENCES public.woredas(id) ON DELETE SET NULL,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  document_date DATE,
  confidentiality_level public.confidentiality_level NOT NULL DEFAULT 'Internal',
  tags TEXT[] DEFAULT '{}',
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  file_type TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX documents_subcity_idx ON public.documents(subcity_id);
CREATE INDEX documents_woreda_idx ON public.documents(woreda_id);
CREATE INDEX documents_category_idx ON public.documents(category_id);
CREATE INDEX documents_created_idx ON public.documents(created_at DESC);

-- Activity logs
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX activity_logs_created_idx ON public.activity_logs(created_at DESC);

-- RLS policies
-- Subcities: all authenticated read; admins write
CREATE POLICY "subcities_read" ON public.subcities FOR SELECT TO authenticated USING (true);
CREATE POLICY "subcities_admin_write" ON public.subcities FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Woredas
CREATE POLICY "woredas_read" ON public.woredas FOR SELECT TO authenticated USING (true);
CREATE POLICY "woredas_admin_write" ON public.woredas FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'subcity_admin'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'subcity_admin'));

-- Categories
CREATE POLICY "categories_read" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "categories_admin_write" ON public.categories FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Profiles: users read all (for display), edit own; admins edit all
CREATE POLICY "profiles_read" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- User roles: users read own; admins manage all
CREATE POLICY "user_roles_self_read" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "user_roles_admin_write" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Documents: scoped read by role/assignment; insert by authenticated; update/delete by uploader or admin
CREATE POLICY "documents_read_scoped" ON public.documents FOR SELECT TO authenticated USING (
  public.is_admin(auth.uid())
  OR (public.has_role(auth.uid(),'subcity_admin') AND subcity_id = public.get_user_subcity(auth.uid()))
  OR (public.has_role(auth.uid(),'woreda_officer') AND woreda_id = public.get_user_woreda(auth.uid()))
  OR (public.has_role(auth.uid(),'viewer'))
  OR uploaded_by = auth.uid()
);
CREATE POLICY "documents_insert" ON public.documents FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid());
CREATE POLICY "documents_update" ON public.documents FOR UPDATE TO authenticated
  USING (uploaded_by = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (uploaded_by = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "documents_delete" ON public.documents FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid() OR public.is_admin(auth.uid()));

-- Activity logs: insert own; admins read all; users read own
CREATE POLICY "activity_logs_insert" ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "activity_logs_read" ON public.activity_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- New user trigger: create profile + first user becomes super_admin, others default viewer
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_count INT;
  assigned_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  SELECT COUNT(*) INTO user_count FROM public.user_roles;
  IF user_count = 0 THEN
    assigned_role := 'super_admin';
  ELSE
    assigned_role := 'viewer';
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, assigned_role);
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage RLS for documents bucket (bucket created via tool)
CREATE POLICY "documents_storage_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents');
CREATE POLICY "documents_storage_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND owner = auth.uid());
CREATE POLICY "documents_storage_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND (owner = auth.uid() OR public.is_admin(auth.uid())));

-- Seed subcities
INSERT INTO public.subcities (name) VALUES
  ('Boku'),('Geda'),('Dabe'),('Hidhabu Abote'),('Melka Adama'),('Lugo')
ON CONFLICT DO NOTHING;

-- Seed categories
INSERT INTO public.categories (name) VALUES
  ('Karoora Ijaarsaa fi Siyaasaa'),
  ('Karoora Dameelee Paartii'),
  ('Cheeklistiiwwan Adda Addaa'),
  ('Gabaasa Kutaalee Magaalaa'),
  ('Gabaasa Ijaarsaa fi Siyaasaa'),
  ('Gabaasa Dameelee Waajjira Paartii'),
  ('Karoora Dhuunfaa'),
  ('Atteendaansiiwwan Adda Addaa'),
  ('Duubdeebiiwwan Kennaman'),
  ('Qajeelfamoota fi Dambiiwwan'),
  ('Karoora fi Gabaasa Gamtaa'),
  ('Kallattiiwwan Adda Addaa'),
  ('Ragaa Madaallii'),
  ('Xiinxalawwan Adda Addaa'),
  ('Komiiwwan'),
  ('Duubdeebii Hojii Guyyaa Guyyaa'),
  ('Oornela Hooggansaa'),
  ('Ragaa Koorii fi Adda Duree'),
  ('Xaalayaawwan Adda Addaa'),
  ('Qaboo Yaa''iiwwan Adda Addaa'),
  ('Ragaa Bu''uuraa'),
  ('Ragaa Filannoo Bara 2018')
ON CONFLICT DO NOTHING;
