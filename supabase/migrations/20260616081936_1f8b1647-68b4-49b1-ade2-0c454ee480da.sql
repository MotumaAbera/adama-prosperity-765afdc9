
-- Helper: do two users share their top (most privileged) role?
CREATE OR REPLACE FUNCTION public.users_share_top_role(_a uuid, _b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ranked AS (
    SELECT user_id, role,
      CASE role
        WHEN 'super_admin' THEN 1
        WHEN 'city_admin' THEN 2
        WHEN 'subcity_admin' THEN 3
        WHEN 'woreda_officer' THEN 4
        WHEN 'viewer' THEN 5
      END AS rnk
    FROM public.user_roles
    WHERE user_id IN (_a, _b)
  ),
  top AS (
    SELECT DISTINCT ON (user_id) user_id, role
    FROM ranked
    ORDER BY user_id, rnk
  )
  SELECT (SELECT role FROM top WHERE user_id = _a)
       = (SELECT role FROM top WHERE user_id = _b)
     AND (SELECT role FROM top WHERE user_id = _a) IS NOT NULL;
$$;

DROP POLICY IF EXISTS documents_read_scoped ON public.documents;

CREATE POLICY documents_read_scoped ON public.documents
FOR SELECT
USING (
  public.is_admin(auth.uid())
  OR uploaded_by = auth.uid()
  OR confidentiality_level = 'Public'
  OR (
    confidentiality_level = 'Internal'
    AND subcity_id IS NOT NULL
    AND subcity_id = public.get_user_subcity(auth.uid())
  )
  OR (
    confidentiality_level IN ('Confidential', 'Top Secret')
    AND public.users_share_top_role(auth.uid(), uploaded_by)
    AND (
      (woreda_id IS NOT NULL AND woreda_id = public.get_user_woreda(auth.uid()))
      OR (woreda_id IS NULL AND subcity_id IS NOT NULL AND subcity_id = public.get_user_subcity(auth.uid()))
    )
  )
);
