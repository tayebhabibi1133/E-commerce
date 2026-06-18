import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { Heart, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/wishlist")({
  head: () => ({ meta: [{ title: "Wishlist — Souqly" }] }),
  component: Wishlist,
});

function Wishlist() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  useEffect(() => { if (!loading && !user) nav({ to: "/auth", search: { redirect: "/wishlist" } as never }); }, [user, loading, nav]);

  const { data: items = [] } = useQuery({
    queryKey: ["wishlist", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("wishlist_items")
        .select("id, products(id,slug,title,price,currency,product_images(url))")
        .eq("user_id", user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold mb-6 flex items-center gap-2"><Heart className="size-7 text-accent" /> Your wishlist</h1>
      {items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border p-16 text-center text-muted-foreground">
          Nothing here yet. <Link to="/products" className="text-primary underline">Browse products</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((it: { id: string; products: { id: string; slug: string; title: string; price: number; currency: string; product_images?: { url: string }[] } }) => (
            <div key={it.id} className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-card group">
              <Link to="/products/$slug" params={{ slug: it.products.slug }} className="block aspect-square bg-muted">
                {it.products.product_images?.[0] && <img src={it.products.product_images[0].url} alt="" className="size-full object-cover" />}
              </Link>
              <div className="p-3">
                <Link to="/products/$slug" params={{ slug: it.products.slug }} className="font-medium text-sm line-clamp-2 hover:text-primary">{it.products.title}</Link>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-display font-bold">{formatPrice(it.products.price, it.products.currency)}</span>
                  <Button size="icon" variant="ghost" className="size-8 text-destructive" onClick={async () => {
                    await supabase.from("wishlist_items").delete().eq("id", it.id);
                    qc.invalidateQueries({ queryKey: ["wishlist"] }); toast.success("Removed");
                  }}><Trash2 className="size-4" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
