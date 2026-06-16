## Goal

Make document visibility driven by `confidentiality_level` (in addition to the existing location scoping), enforced at the database via RLS so every part of the app (Documents, Dashboard, Audit, search) follows it automatically.

## Access rules


| &nbsp;           | &nbsp;                                                                                                                       | &nbsp;         |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------- |
| &nbsp;           | &nbsp;                                                                                                                       | &nbsp;         |
| &nbsp;           | &nbsp;                                                                                                                       | &nbsp;         |
| &nbsp;           | &nbsp;                                                                                                                       | &nbsp;         |
| &nbsp;           | &nbsp;                                                                                                                       | &nbsp;         |
| &nbsp;           | &nbsp;                                                                                                                       | &nbsp;         |
| &nbsp;           | &nbsp;                                                                                                                       | &nbsp;         |
| &nbsp;           | Level                                                                                                                        | Who can see it |
| **Public**       | Every authenticated user, anywhere in the system                                                                             | &nbsp;         |
| **Internal**     | Uploader + all users in the uploader's subcity (including its woredas) + admins                                              | &nbsp;         |
| **Restricted**   | Uploader only + admins                                                                                                       | &nbsp;         |
| **Confidential** | Uploader + users with the **same role** in the **same location** (woreda if uploader is woreda-level, else subcity) + admins | &nbsp;         |
| **Top Secret**   | Uploader + users with the **same role** in the **same location** + super_admin / city_admin                                  | &nbsp;         |
| &nbsp;           | &nbsp;                                                                                                                       | &nbsp;         |
| &nbsp;           | &nbsp;                                                                                                                       | &nbsp;         |
| &nbsp;           | &nbsp;                                                                                                                       | &nbsp;         |
| &nbsp;           | &nbsp;                                                                                                                       | &nbsp;         |


Admins (`super_admin`, `city_admin`) retain full visibility — they are the auditors of the system. (If you want Top Secret hidden even from city_admin, say the word and I'll tighten it.)

## Changes

### 1. Database (migration)

Replace the `documents_read_scoped` SELECT policy with one that combines confidentiality + location:

```text
is_admin(uid)
OR uploaded_by = uid
OR confidentiality_level = 'Public'
OR (confidentiality_level = 'Internal'
      AND subcity_id = get_user_subcity(uid))
OR (confidentiality_level IN ('Confidential','Top Secret')
      AND same_role_as_uploader(uid, uploaded_by)
      AND (
            (woreda_id IS NOT NULL AND woreda_id = get_user_woreda(uid))
         OR (woreda_id IS NULL  AND subcity_id = get_user_subcity(uid))
      ))
-- 'Restricted' falls through → uploader/admin only
```

Add a small SECURITY DEFINER helper `users_share_top_role(a uuid, b uuid)` that returns true when two users' highest role matches, so the policy stays readable and avoids recursion.

UPDATE/DELETE policies stay as-is (uploader or admin).

### 2. Upload page (`src/routes/_authenticated/upload.tsx`)

- Keep the existing confidentiality dropdown but add a short helper text under it describing who will see the document at each level (so users pick correctly).

### 3. Documents page (`src/routes/_authenticated/documents.tsx`)

- Add a confidentiality filter chip row (All / Public / Internal / Restricted / Confidential / Top Secret) alongside the existing search & subcity filter.
- Show a colored confidentiality badge on each document row (Public=green, Internal=blue, Restricted=amber, Confidential=orange, Top Secret=red). Folder grid already exists — unchanged.

### 4. No code changes needed for enforcement

Because Documents/Dashboard/Audit all read through Supabase with RLS, the new policy automatically hides rows the user shouldn't see — no client-side filtering required.

## Technical notes

- One migration: drop old SELECT policy, create helper function, create new SELECT policy. GRANTs already exist on `documents`.
- Helper uses `SECURITY DEFINER` + `SET search_path = public` and reads `user_roles` only — same pattern as `has_role`/`is_admin`, no recursion risk.
- Existing rows keep their current `confidentiality_level` (default `Internal`), so behavior for already-uploaded docs is predictable.