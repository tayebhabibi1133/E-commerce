import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Heart, ShoppingCart, Truck, Shield, MessageCircle } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/products/$slug")({
  head: ({ params }) => ({ meta: [{ title: `${params.slug} — Souqly` }] }),
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [activeImg, setActiveImg] = useState(0);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*, product_images(url, position), stores(id, slug, name, rating, owner_id), reviews(id, rating, title, body, created_at, user_id)")
        .eq("slug", slug).maybeSingle();
      return data;
    },
  });

  if (isLoading) return <div className="container mx-auto px-4 py-12 text-center text-muted-foreground">Loading...</div>;
  if (!product) return <div className="container mx-auto px-4 py-12 text-center"><p>Product not found.</p><Link to="/products" className="text-primary underline">Browse products</Link></div>;

  const images = (product.product_images ?? []).sort((a: { position: number }, b: { position: number }) => a.position - b.position);
  const reviews = product.reviews ?? [];

  const addToCart = async () => {
    if (!user) { nav({ to: "/auth" }); return; }
    const { error } = await supabase.from("cart_items").upsert({ user_id: user.id, product_id: product.id, quantity: 1 }, { onConflict: "user_id,product_id" });
    if (error) toast.error(error.message); else { toast.success("Added to cart"); qc.invalidateQueries({ queryKey: ["cart-count"] }); }
  };
  const addToWishlist = async () => {
    if (!user) { nav({ to: "/auth" }); return; }
    const { error } = await supabase.from("wishlist_items").upsert({ user_id: user.id, product_id: product.id }, { onConflict: "user_id,product_id" });
    if (error) toast.error(error.message); else toast.success("Added to wishlist");
  };
  const chatSeller = async () => {
    if (!user) { nav({ to: "/auth" }); return; }
    const { data: existing } = await supabase.from("chat_threads").select("id").eq("customer_id", user.id).eq("store_id", product.stores.id).maybeSingle();
    let id = existing?.id;
    if (!id) {
      const { data } = await supabase.from("chat_threads").insert({ customer_id: user.id, store_id: product.stores.id }).select("id").single();
      id = data?.id;
    }
    if (id) nav({ to: "/messages/$id", params: { id } });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <div className="aspect-square rounded-2xl overflow-hidden bg-muted shadow-card">
            {images[activeImg]?.url ? <img src={images[activeImg].url} alt={product.title} className="size-full object-cover" /> : <div className="size-full bg-gradient-to-br from-muted to-secondary" />}
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {images.map((img: { url: string }, i: number) => (
                <button key={i} onClick={() => setActiveImg(i)} className={`size-16 rounded-lg overflow-hidden border-2 shrink-0 ${activeImg === i ? "border-primary" : "border-transparent"}`}>
                  <img src={img.url} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          {product.brand && <div className="text-sm uppercase tracking-wide text-muted-foreground mb-1">{product.brand}</div>}
          <h1 className="font-display text-3xl font-bold">{product.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1 text-sm"><Star className="size-4 fill-accent text-accent" /> {Number(product.rating).toFixed(1)} <span className="text-muted-foreground">({product.reviews_count})</span></div>
            <Link to="/sellers/$slug" params={{ slug: product.stores.slug }} className="text-sm text-primary hover:underline">{product.stores.name}</Link>
          </div>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="font-display text-4xl font-bold">{formatPrice(product.price, product.currency)}</span>
            {product.compare_at_price && Number(product.compare_at_price) > Number(product.price) && (
              <span className="text-lg line-through text-muted-foreground">{formatPrice(product.compare_at_price, product.currency)}</span>
            )}
          </div>
          <div className="mt-2">
            {product.stock > 0
              ? <Badge variant="secondary" className="bg-success/15 text-success border-0">In stock ({product.stock} left)</Badge>
              : <Badge variant="destructive">Out of stock</Badge>}
          </div>
          <p className="mt-6 text-muted-foreground leading-relaxed">{product.description}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" onClick={addToCart} disabled={product.stock === 0} className="bg-gradient-primary text-primary-foreground shadow-elegant flex-1 min-w-44">
              <ShoppingCart className="size-4 me-2" /> Add to cart
            </Button>
            <Button size="lg" variant="outline" onClick={addToWishlist}><Heart className="size-4" /></Button>
            <Button size="lg" variant="outline" onClick={chatSeller}><MessageCircle className="size-4 me-2" /> Chat seller</Button>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border/60 p-3 flex items-center gap-2 text-sm"><Truck className="size-4 text-primary" /> Free shipping over $50</div>
            <div className="rounded-xl border border-border/60 p-3 flex items-center gap-2 text-sm"><Shield className="size-4 text-primary" /> Buyer protection</div>
          </div>
        </div>
      </div>

      <section className="mt-16">
        <h2 className="font-display text-2xl font-bold mb-4">Reviews ({reviews.length})</h2>
        {reviews.length === 0 ? (
          <p className="text-muted-foreground">No reviews yet. Be the first to review this product.</p>
        ) : (
          <div className="space-y-3">
            {reviews.map((r: { id: string; rating: number; title: string | null; body: string | null }) => (
              <div key={r.id} className="rounded-xl border border-border/60 p-4">
                <div className="flex items-center gap-1 mb-1">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`size-4 ${i < r.rating ? "fill-accent text-accent" : "text-muted"}`} />)}
                </div>
                {r.title && <div className="font-medium">{r.title}</div>}
                {r.body && <p className="text-sm text-muted-foreground mt-1">{r.body}</p>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
