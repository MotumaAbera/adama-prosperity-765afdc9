ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS code TEXT;

WITH numbered AS (
  SELECT id, LPAD(row_number() OVER (ORDER BY created_at)::text, 2, '0') as new_code
  FROM public.categories
)
UPDATE public.categories c
SET code = n.new_code
FROM numbered n
WHERE c.id = n.id;