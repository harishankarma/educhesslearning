-- Allow students to read their assigned coach's profile
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT
TO authenticated USING (
  id = auth.uid()
  OR public.is_owner()
  OR id IN (SELECT public.my_students())
  OR id IN (SELECT public.my_coaches())
);
