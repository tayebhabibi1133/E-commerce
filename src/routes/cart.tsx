import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Cart — Souqly" }] }),
  component: CartPage,
});

function CartPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();

  useEffect(() => { if (!loading && !user) nav({ to: "/auth", search: { redirect: "/cart" } as never }); }, [user, loading, nav]);

  const { data: items = [] } = useQuery({
    queryKey: ["cart", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("cart_items")
        .select("id, quantity, product_id, products(id,slug,title,price,currency,stock,product_images(url))")
        .eq("user_id", user.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  const subtotal = items.reduce((s: number, it: { quantity: number; products: { price: number } }) => s + Number(it.products?.price ?? 0) * it.quantity, 0);
  const shipping = subtotal > 50 || subtotal === 0 ? 0 : 9.99;
  const total = subtotal + shipping;

  const update = async (id: string, qty: number) => {
    if (qty < 1) return;
    await supabase.from("cart_items").update({ quantity: qty }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["cart"] }); qc.invalidateQueries({ queryKey: ["cart-count"] });
  };
  const remove = async (id: string) => {
    await supabase.from("cart_items").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["cart"] }); qc.invalidateQueries({ queryKey: ["cart-count"] });
    toast.success("Removed");
  };

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold mb-6">Your cart</h1>
      {items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border p-16 text-center">
          <ShoppingBag className="size-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-4">Your cart is empty.</p>
          <Button asChild className="bg-gradient-primary text-primary-foreground"><Link to="/products">Browse products</Link></Button>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_360px] gap-8">
          <div className="space-y-3">
            {items.map((it: { id: string; quantity: number; products: { id: string; slug: string; title: string; price: number; currency: string; product_images?: { url: string }[] } }) => (
              <div key={it.id} className="flex gap-4 p-4 rounded-2xl border border-border/60 bg-card">
                <Link to="/products/$slug" params={{ slug: it.products.slug }} className="size-24 rounded-lg overflow-hidden bg-muted shrink-0">
                  {it.products.product_images?.[0] && <img src={it.products.product_images[0].url} alt="" className="size-full object-cover" />}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to="/products/$slug" params={{ slug: it.products.slug }} className="font-medium hover:text-primary line-clamp-2">{it.products.title}</Link>
                  <div className="font-display font-bold mt-1">{formatPrice(it.products.price, it.products.currency)}</div>
                  <div className="mt-3 flex items-center gap-2">
                    <Button size="icon" variant="outline" className="size-8" onClick={() => update(it.id, it.quantity - 1)}><Minus className="size-3" /></Button>
                    <span className="w-8 text-center text-sm font-medium">{it.quantity}</span>
                    <Button size="icon" variant="outline" className="size-8" onClick={() => update(it.id, it.quantity + 1)}><Plus className="size-3" /></Button>
                    <Button size="icon" variant="ghost" className="size-8 ms-auto text-destructive" onClick={() => remove(it.id)}><Trash2 className="size-4" /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-6 h-fit shadow-card sticky top-20">
            <h3 className="font-display font-bold text-lg mb-4">Order summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>{shipping === 0 ? "Free" : formatPrice(shipping)}</span></div>
              <div className="border-t border-border pt-2 mt-2 flex justify-between font-display font-bold text-lg"><span>Total</span><span>{formatPrice(total)}</span></div>
            </div>
            <Button asChild size="lg" className="w-full mt-5 bg-gradient-primary text-primary-foreground shadow-elegant"><Link to="/checkout">Checkout</Link></Button>
          </div>
        </div>
      )}
    </div>
  );
}
