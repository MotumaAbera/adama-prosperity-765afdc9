# Hierarchical Document Visibility

Make document access follow the org chart: a document is visible to its own level and every level above it.

## Visibility Matrix

| Document uploaded at | Visible to |
|---|---|
| Woreda (has `woreda_id` + `subcity_id`) | That woreda's officers + that subcity's admins + City/Super admins |
| Subcity (has `subcity_id`, no `woreda_id`) | That subcity's admins + City/Super admins (NOT the woredas inside it) |
| City level (no `subcity_id`, no `woreda_id`) | City/Super admins only |

Additional rules:
- The uploader always sees their own document.
- `viewer` role is scoped to whatever their profile is assigned to (woreda if set, else subcity, else nothing).
- Confidentiality level is enforced as today (separate concern from org scope).

## Changes

### 1. Database — replace `documents_read_scoped` RLS policy

New SELECT policy on `public.documents` with this logic:

```text
allow if:
  is_admin(uid)                                      -- city/super admin: all
  OR uploaded_by = uid                               -- own uploads
  OR ( has_role(uid,'subcity_admin')
       AND subcity_id = get_user_subcity(uid) )      -- own subcity + its woredas
  OR ( has_role(uid,'woreda_officer')
       AND woreda_id = get_user_woreda(uid) )        -- own woreda only
  OR ( has_role(uid,'viewer')
       AND (
         (get_user_woreda(uid) IS NOT NULL AND woreda_id = get_user_woreda(uid))
         OR (get_user_woreda(uid) IS NULL
             AND get_user_subcity(uid) IS NOT NULL
             AND subcity_id = get_user_subcity(uid))
       ) )
```

Because subcity admins match on `subcity_id` alone, any woreda upload (which carries the parent `subcity_id`) is automatically included — that's the hierarchy.

### 2. Upload form — enforce scope on insert

In `src/routes/_authenticated/upload.tsx`:
- Woreda officers: lock `subcity_id` and `woreda_id` to their profile values (hidden or read-only).
- Subcity admins: lock `subcity_id` to their profile; `woreda_id` optional (subcity-level doc) or any woreda within their subcity.
- City/Super admins: free choice.
- Validate server-side intent on the client (RLS INSERT policy already requires `uploaded_by = auth.uid()`; org-scope checks added in UI to prevent mis-tagging).

### 3. No changes needed to

- Storage bucket policies (already private + signed URLs).
- `documents` table columns.
- Other pages (documents list, dashboard) — they query through RLS so they'll automatically reflect the new scope.

## Notes

- Existing rows with mismatched `subcity_id`/`woreda_id` will follow the new rules immediately. If any woreda upload was saved without a `subcity_id`, the subcity admin won't see it; we can backfill `subcity_id` from `woreda_id` in the same migration if you want.
- Confidentiality-based restrictions (e.g. hiding "Top Secret" from lower roles) are not in scope here — say the word and I'll layer that on next.
