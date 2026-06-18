
CREATE TYPE public.app_role AS ENUM ('customer','seller','admin');
CREATE TYPE public.product_status AS ENUM ('draft','pending','approved','rejected','archived');
CREATE TYPE public.order_status AS ENUM ('pending','paid','processing','shipped','delivered','cancelled','refunded');
CREATE TYPE public.payment_method AS ENUM ('stripe','paypal','wallet');
CREATE TYPE public.notification_type AS ENUM ('order','chat','system','promo');
CREATE TYPE public.txn_type AS ENUM ('credit','debit','refund','payout');

CREATE OR REPLACE FUNCTION public.tg_set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT, avatar_url TEXT, phone TEXT, locale TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles read all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles update own" ON public.profiles FOR UPDATE USING (auth.uid()=id);
CREATE POLICY "profiles insert own" ON public.profiles FOR INSERT WITH CHECK (auth.uid()=id);
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles read own" ON public.user_roles FOR SELECT USING (auth.uid()=user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role)
$$;
CREATE POLICY "user_roles admin manage" ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- WALLETS (first, before handle_new_user references it)
CREATE TABLE public.wallets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallet own" ON public.wallets FOR SELECT USING (auth.uid()=user_id);

CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type txn_type NOT NULL, amount NUMERIC(12,2) NOT NULL,
  balance_after NUMERIC(12,2) NOT NULL,
  description TEXT, ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_wtx_user ON public.wallet_transactions(user_id, created_at DESC);
GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wtx own" ON public.wallet_transactions FOR SELECT USING (auth.uid()=user_id);

-- HANDLE NEW USER
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.profiles(id, full_name, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT DO NOTHING;
  INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'customer') ON CONFLICT DO NOTHING;
  INSERT INTO public.wallets(user_id, balance) VALUES (NEW.id, 0) ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ADDRESSES
CREATE TABLE public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT, full_name TEXT, phone TEXT,
  line1 TEXT NOT NULL, line2 TEXT, city TEXT NOT NULL, state TEXT, postal_code TEXT, country TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;
GRANT ALL ON public.addresses TO service_role;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "addr own" ON public.addresses FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- STORES
CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
  description TEXT, logo_url TEXT, banner_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  rating NUMERIC(3,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.stores TO anon, authenticated;
GRANT INSERT, UPDATE ON public.stores TO authenticated;
GRANT ALL ON public.stores TO service_role;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stores read all" ON public.stores FOR SELECT USING (true);
CREATE POLICY "stores owner manage" ON public.stores FOR ALL USING (auth.uid()=owner_id) WITH CHECK (auth.uid()=owner_id);
CREATE POLICY "stores admin manage" ON public.stores FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER stores_updated BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- CATEGORIES
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cats read all" ON public.categories FOR SELECT USING (true);
CREATE POLICY "cats admin manage" ON public.categories FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- PRODUCTS
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, description TEXT,
  brand TEXT,
  price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  compare_at_price NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'USD',
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  sku TEXT,
  status product_status NOT NULL DEFAULT 'pending',
  rating NUMERIC(3,2) DEFAULT 0,
  reviews_count INTEGER NOT NULL DEFAULT 0,
  sales_count INTEGER NOT NULL DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  attributes JSONB DEFAULT '{}',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_products_store ON public.products(store_id);
CREATE INDEX idx_products_cat ON public.products(category_id);
CREATE INDEX idx_products_status ON public.products(status);
CREATE INDEX idx_products_search ON public.products USING gin(to_tsvector('simple', coalesce(title,'')||' '||coalesce(description,'')||' '||coalesce(brand,'')));
GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products read approved" ON public.products FOR SELECT
USING ((status='approved' AND deleted_at IS NULL) OR EXISTS(SELECT 1 FROM public.stores s WHERE s.id=store_id AND s.owner_id=auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "products seller manage" ON public.products FOR ALL
USING (EXISTS(SELECT 1 FROM public.stores s WHERE s.id=store_id AND s.owner_id=auth.uid()))
WITH CHECK (EXISTS(SELECT 1 FROM public.stores s WHERE s.id=store_id AND s.owner_id=auth.uid()));
CREATE POLICY "products admin manage" ON public.products FOR ALL
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- PRODUCT IMAGES
CREATE TABLE public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url TEXT NOT NULL, position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.product_images TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_images TO authenticated;
GRANT ALL ON public.product_images TO service_role;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pimg read all" ON public.product_images FOR SELECT USING (true);
CREATE POLICY "pimg seller manage" ON public.product_images FOR ALL
USING (EXISTS(SELECT 1 FROM public.products p JOIN public.stores s ON s.id=p.store_id WHERE p.id=product_id AND s.owner_id=auth.uid()))
WITH CHECK (EXISTS(SELECT 1 FROM public.products p JOIN public.stores s ON s.id=p.store_id WHERE p.id=product_id AND s.owner_id=auth.uid()));

-- CART
CREATE TABLE public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;
GRANT ALL ON public.cart_items TO service_role;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cart own" ON public.cart_items FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- WISHLIST
CREATE TABLE public.wishlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);
GRANT SELECT, INSERT, DELETE ON public.wishlist_items TO authenticated;
GRANT ALL ON public.wishlist_items TO service_role;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wish own" ON public.wishlist_items FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- RECENTLY VIEWED
CREATE TABLE public.recently_viewed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recently_viewed TO authenticated;
GRANT ALL ON public.recently_viewed TO service_role;
ALTER TABLE public.recently_viewed ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rv own" ON public.recently_viewed FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- ORDERS
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL UNIQUE DEFAULT ('ORD-'||to_char(now(),'YYYYMMDD')||'-'||substr(gen_random_uuid()::text,1,8)),
  status order_status NOT NULL DEFAULT 'pending',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  shipping NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_method payment_method, payment_ref TEXT,
  shipping_address JSONB, coupon_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders own" ON public.orders FOR SELECT USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "orders insert own" ON public.orders FOR INSERT WITH CHECK (auth.uid()=user_id);
CREATE POLICY "orders update own" ON public.orders FOR UPDATE USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ORDER ITEMS
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  quantity INTEGER NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_oi_order ON public.order_items(order_id);
CREATE INDEX idx_oi_store ON public.order_items(store_id);
GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "oi read related" ON public.order_items FOR SELECT
USING (
  EXISTS(SELECT 1 FROM public.orders o WHERE o.id=order_id AND o.user_id=auth.uid())
  OR EXISTS(SELECT 1 FROM public.stores s WHERE s.id=store_id AND s.owner_id=auth.uid())
  OR public.has_role(auth.uid(),'admin')
);
CREATE POLICY "oi insert via order" ON public.order_items FOR INSERT
WITH CHECK (EXISTS(SELECT 1 FROM public.orders o WHERE o.id=order_id AND o.user_id=auth.uid()));

-- REVIEWS
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT, body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, user_id)
);
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews read all" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews own" ON public.reviews FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- CHAT
CREATE TABLE public.chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(customer_id, store_id)
);
GRANT SELECT, INSERT, UPDATE ON public.chat_threads TO authenticated;
GRANT ALL ON public.chat_threads TO service_role;
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_threads participants" ON public.chat_threads FOR ALL
USING (auth.uid()=customer_id OR EXISTS(SELECT 1 FROM public.stores s WHERE s.id=store_id AND s.owner_id=auth.uid()))
WITH CHECK (auth.uid()=customer_id OR EXISTS(SELECT 1 FROM public.stores s WHERE s.id=store_id AND s.owner_id=auth.uid()));

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL, read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_msgs_thread ON public.chat_messages(thread_id, created_at);
GRANT SELECT, INSERT, UPDATE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_msgs participants" ON public.chat_messages FOR SELECT
USING (EXISTS(SELECT 1 FROM public.chat_threads t WHERE t.id=thread_id AND (t.customer_id=auth.uid() OR EXISTS(SELECT 1 FROM public.stores s WHERE s.id=t.store_id AND s.owner_id=auth.uid()))));
CREATE POLICY "chat_msgs send" ON public.chat_messages FOR INSERT
WITH CHECK (auth.uid()=sender_id AND EXISTS(SELECT 1 FROM public.chat_threads t WHERE t.id=thread_id AND (t.customer_id=auth.uid() OR EXISTS(SELECT 1 FROM public.stores s WHERE s.id=t.store_id AND s.owner_id=auth.uid()))));
CREATE POLICY "chat_msgs update own" ON public.chat_messages FOR UPDATE USING (auth.uid()=sender_id);

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL DEFAULT 'system',
  title TEXT NOT NULL, body TEXT, data JSONB DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notif_user ON public.notifications(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif own" ON public.notifications FOR SELECT USING (auth.uid()=user_id);
CREATE POLICY "notif update own" ON public.notifications FOR UPDATE USING (auth.uid()=user_id);

-- COUPONS
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  discount_percent INTEGER CHECK (discount_percent BETWEEN 1 AND 100),
  discount_amount NUMERIC(12,2),
  min_subtotal NUMERIC(12,2) DEFAULT 0,
  expires_at TIMESTAMPTZ, usage_limit INTEGER,
  times_used INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coupons TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coupons read active" ON public.coupons FOR SELECT USING (is_active=true);
CREATE POLICY "coupons seller manage" ON public.coupons FOR ALL
USING (store_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.stores s WHERE s.id=store_id AND s.owner_id=auth.uid()))
WITH CHECK (store_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.stores s WHERE s.id=store_id AND s.owner_id=auth.uid()));
CREATE POLICY "coupons admin" ON public.coupons FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- AUDIT LOGS
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, entity TEXT, entity_id TEXT,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit admin read" ON public.audit_logs FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "audit insert any auth" ON public.audit_logs FOR INSERT WITH CHECK (auth.uid()=actor_id);

-- REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- SEED categories
INSERT INTO public.categories(name, slug, icon) VALUES
  ('Electronics','electronics','laptop'),
  ('Fashion','fashion','shirt'),
  ('Home & Garden','home-garden','home'),
  ('Beauty','beauty','sparkles'),
  ('Sports','sports','dumbbell'),
  ('Books','books','book'),
  ('Toys','toys','gamepad-2'),
  ('Grocery','grocery','shopping-basket')
ON CONFLICT (slug) DO NOTHING;
