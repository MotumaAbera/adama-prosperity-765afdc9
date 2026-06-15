
-- Temporarily prefix names to avoid unique constraint collisions during reshuffle
UPDATE public.categories SET name = '__tmp__' || code WHERE code BETWEEN '01' AND '22';

UPDATE public.categories SET name = CASE code
  WHEN '01' THEN 'Karoora Ijaarsaa fi Siyaasaa'
  WHEN '02' THEN 'Karoora Dameelee Waajjira Paartii'
  WHEN '03' THEN 'Karooraa fi Gabaasa Gamtaa'
  WHEN '04' THEN 'Karoora Dhuunfaa'
  WHEN '05' THEN 'Cheeklistiiwwan Adda Addaa'
  WHEN '06' THEN 'Gabaasa Ijaarsaa fi Siyaasaa'
  WHEN '07' THEN 'Gabaasa Dameelee'
  WHEN '08' THEN 'Gabaasa Kutaalee Magaalaa'
  WHEN '09' THEN 'Duubdeebiiwwan adda addaa'
  WHEN '10' THEN 'Kallattiiwwan Adda Addaa'
  WHEN '11' THEN 'Komiiwwan Adda Addaa'
  WHEN '12' THEN 'Ragaa Bu''uuraa'
  WHEN '13' THEN 'Ragaawwan Madaallii'
  WHEN '14' THEN 'Ragaa Koorii fi Adda Duree'
  WHEN '15' THEN 'Ragaa Filannoo'
  WHEN '16' THEN 'Oornela Hooggansaa'
  WHEN '17' THEN 'Qaboo Yaa''iiwwan Adda Addaa'
  WHEN '18' THEN 'Atteendaansiiwwan Adda Addaa'
  WHEN '19' THEN 'Xiinxalawwan Adda Addaa'
  WHEN '20' THEN 'Xaalayaawwan Adda Addaa'
  WHEN '21' THEN 'Dambii fi Qajeelfamoota'
  WHEN '22' THEN 'Moosaajii Miseensaa intgrate'
END
WHERE code BETWEEN '01' AND '22';

INSERT INTO public.categories (code, name) VALUES
  ('23', 'Sanada Leenjii fi Muuxannoo'),
  ('24', 'Ragaawwan Biroo');
