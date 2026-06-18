
-- Lock down SECURITY DEFINER helpers (RLS still works because policies inline-call them)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- Storage policies: public read for products/stores/avatars, owner write
CREATE POLICY "public read products" ON storage.objects FOR SELECT USING (bucket_id='products');
CREATE POLICY "public read stores" ON storage.objects FOR SELECT USING (bucket_id='stores');
CREATE POLICY "public read avatars" ON storage.objects FOR SELECT USING (bucket_id='avatars');

CREATE POLICY "sellers upload products" ON storage.objects FOR INSERT
WITH CHECK (bucket_id='products' AND auth.role()='authenticated');
CREATE POLICY "sellers update own products" ON storage.objects FOR UPDATE
USING (bucket_id='products' AND owner=auth.uid());
CREATE POLICY "sellers delete own products" ON storage.objects FOR DELETE
USING (bucket_id='products' AND owner=auth.uid());

CREATE POLICY "sellers upload stores" ON storage.objects FOR INSERT
WITH CHECK (bucket_id='stores' AND auth.role()='authenticated');
CREATE POLICY "sellers update own stores" ON storage.objects FOR UPDATE
USING (bucket_id='stores' AND owner=auth.uid());

CREATE POLICY "users upload avatar" ON storage.objects FOR INSERT
WITH CHECK (bucket_id='avatars' AND auth.role()='authenticated');
CREATE POLICY "users update own avatar" ON storage.objects FOR UPDATE
USING (bucket_id='avatars' AND owner=auth.uid());
