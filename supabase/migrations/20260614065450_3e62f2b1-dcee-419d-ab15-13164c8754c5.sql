
-- 1. Profiles: restrict SELECT to self only (admins already covered by profiles_admin_all)
DROP POLICY IF EXISTS profiles_read ON public.profiles;
CREATE POLICY profiles_read_self ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- 2. Documents storage: enforce same scoping as documents table
DROP POLICY IF EXISTS documents_storage_read ON storage.objects;
CREATE POLICY documents_storage_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.file_path = storage.objects.name
        AND (
          public.is_admin(auth.uid())
          OR (public.has_role(auth.uid(), 'subcity_admin'::public.app_role) AND d.subcity_id = public.get_user_subcity(auth.uid()))
          OR (public.has_role(auth.uid(), 'woreda_officer'::public.app_role) AND d.woreda_id = public.get_user_woreda(auth.uid()))
          OR (public.has_role(auth.uid(), 'viewer'::public.app_role) AND (
            (public.get_user_woreda(auth.uid()) IS NOT NULL AND d.woreda_id = public.get_user_woreda(auth.uid()))
            OR (public.get_user_woreda(auth.uid()) IS NULL AND public.get_user_subcity(auth.uid()) IS NOT NULL AND d.subcity_id = public.get_user_subcity(auth.uid()))
          ))
          OR d.uploaded_by = auth.uid()
        )
    )
  );

-- 3. Scope documents_read_scoped to authenticated explicitly
DROP POLICY IF EXISTS documents_read_scoped ON public.documents;
CREATE POLICY documents_read_scoped ON public.documents
  FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR (public.has_role(auth.uid(), 'subcity_admin'::public.app_role) AND subcity_id = public.get_user_subcity(auth.uid()))
    OR (public.has_role(auth.uid(), 'woreda_officer'::public.app_role) AND woreda_id = public.get_user_woreda(auth.uid()))
    OR (public.has_role(auth.uid(), 'viewer'::public.app_role) AND (
      (public.get_user_woreda(auth.uid()) IS NOT NULL AND woreda_id = public.get_user_woreda(auth.uid()))
      OR (public.get_user_woreda(auth.uid()) IS NULL AND public.get_user_subcity(auth.uid()) IS NOT NULL AND subcity_id = public.get_user_subcity(auth.uid()))
    ))
    OR uploaded_by = auth.uid()
  );

-- 4. Revoke EXECUTE on SECURITY DEFINER helpers from anon/PUBLIC
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_subcity(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_woreda(uuid) FROM PUBLIC, anon;

-- 5. Pin search_path on set_updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
