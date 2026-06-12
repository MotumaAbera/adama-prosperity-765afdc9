DROP POLICY IF EXISTS documents_read_scoped ON public.documents;

CREATE POLICY documents_read_scoped ON public.documents
FOR SELECT
USING (
  -- City-level and super admins see everything
  public.is_admin(auth.uid())
  -- Subcity admins see their own subcity (including all woredas within it)
  OR (
    public.has_role(auth.uid(), 'subcity_admin'::public.app_role)
    AND subcity_id = public.get_user_subcity(auth.uid())
  )
  -- Woreda officers see only their own woreda
  OR (
    public.has_role(auth.uid(), 'woreda_officer'::public.app_role)
    AND woreda_id = public.get_user_woreda(auth.uid())
  )
  -- Viewers are scoped to their assigned woreda/subcity (hierarchical)
  OR (
    public.has_role(auth.uid(), 'viewer'::public.app_role)
    AND (
      (public.get_user_woreda(auth.uid()) IS NOT NULL AND woreda_id = public.get_user_woreda(auth.uid()))
      OR (public.get_user_woreda(auth.uid()) IS NULL
          AND public.get_user_subcity(auth.uid()) IS NOT NULL
          AND subcity_id = public.get_user_subcity(auth.uid()))
    )
  )
  -- Uploader always sees own documents
  OR uploaded_by = auth.uid()
);