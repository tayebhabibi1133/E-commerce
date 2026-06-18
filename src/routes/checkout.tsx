import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { formatPrice } from "@/lib/format";
import { CreditCard, Wallet, Lock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — Souqly" }] }),
  component: Checkout,
});

function Checkout() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  useEffect(() => { if (!loading && !user) nav({ to: "/auth", search: { redirect: "/checkout" } as never }); }, [user, loading, nav]);

  const [coupon, setCoupon] = useState("");
  const [discountPct, setDiscountPct] = useState(0);
  const [method, setMethod] = useState<"stripe"|"wallet"|"paypal">("stripe");
  const [addr, setAddr] = useState({ full_name: "", line1: "", city: "", country: "", postal_code: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);

  const { data: items = [] } = useQuery({
    queryKey: ["checkout-cart", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("cart_items").select("quantity, products(id,title,price,currency,store_id,product_images(url))").eq("user_id", user.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: wallet } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () => (await supabase.from("wallets").select("*").eq("user_id", user!.id).maybeSingle()).data,
    enabled: !!user,
  });

  const subtotal = items.reduce((s: number, it: { quantity: number; products: { price: number } }) => s + Number(it.products.price) * it.quantity, 0);
  const shipping = subtotal > 50 ? 0 : 9.99;
  const discount = subtotal * (discountPct / 100);
  const total = Math.max(0, subtotal + shipping - discount);

  const applyCoupon = async () => {
    if (!coupon) return;
    const { data } = await supabase.from("coupons").select("*").eq("code", coupon.trim().toUpperCase()).eq("is_active", true).maybeSingle();
    if (!data) { toast.error("Invalid coupon"); setDiscountPct(0); return; }
    setDiscountPct(data.discount_percent ?? 0);
    toast.success(`Coupon applied: ${data.discount_percent}% off`);
  };

  const placeOrder = async () => {
    if (!user || items.length === 0) return;
    if (!addr.line1 || !addr.city || !addr.country) { toast.error("Fill shipping address"); return; }
    setSubmitting(true);
    try {
      if (method === "wallet" && (wallet?.balance ?? 0) < total) { toast.error("Insufficient wallet balance"); setSubmitting(false); return; }

      const { data: order, error } = await supabase.from("orders").insert({
        user_id: user.id, status: "paid", subtotal, shipping, discount, total,
        payment_method: method, payment_ref: `SIM-${Date.now()}`,
        shipping_address: addr, coupon_code: coupon || null,
      }).select().single();
      if (error) throw error;

      const orderItems = items.map((it: { quantity: number; products: { id: string; title: string; price: number; store_id: string; product_images?: { url: string }[] } }) => ({
        order_id: order.id, product_id: it.products.id, store_id: it.products.store_id,
        title: it.products.title, unit_price: it.products.price, quantity: it.quantity,
        image_url: it.products.product_images?.[0]?.url ?? null,
      }));
      await supabase.from("order_items").insert(orderItems);
      await supabase.from("cart_items").delete().eq("user_id", user.id);
      await supabase.from("notifications").insert({ user_id: user.id, type: "order", title: "Order placed", body: `Order ${order.order_number} confirmed.` });
      qc.invalidateQueries();
      toast.success("Order placed!");
      nav({ to: "/orders" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Checkout failed");
    } finally { setSubmitting(false); }
  };

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="font-display text-3xl font-bold mb-6">Checkout</h1>
      <div className="grid lg:grid-cols-[1fr_360px] gap-8">
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="font-display font-bold mb-4">Shipping address</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2"><Label>Full name</Label><Input value={addr.full_name} onChange={(e) => setAddr({...addr, full_name: e.target.value})} /></div>
              <div className="sm:col-span-2"><Label>Address line</Label><Input value={addr.line1} onChange={(e) => setAddr({...addr, line1: e.target.value})} /></div>
              <div><Label>City</Label><Input value={addr.city} onChange={(e) => setAddr({...addr, city: e.target.value})} /></div>
              <div><Label>Country</Label><Input value={addr.country} onChange={(e) => setAddr({...addr, country: e.target.value})} /></div>
              <div><Label>Postal code</Label><Input value={addr.postal_code} onChange={(e) => setAddr({...addr, postal_code: e.target.value})} /></div>
              <div><Label>Phone</Label><Input value={addr.phone} onChange={(e) => setAddr({...addr, phone: e.target.value})} /></div>
            </div>
          </Card>
          <Card className="p-6">
            <h3 className="font-display font-bold mb-4">Payment method</h3>
            <div className="grid sm:grid-cols-3 gap-3">
              {([
                { id: "stripe", icon: CreditCard, label: "Card (Stripe)" },
                { id: "paypal", icon: CreditCard, label: "PayPal" },
                { id: "wallet", icon: Wallet, label: `Wallet (${formatPrice(wallet?.balance ?? 0)})` },
              ] as const).map((m) => (
                <button key={m.id} onClick={() => setMethod(m.id)}
                  className={`rounded-xl border-2 p-4 text-start transition ${method === m.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
                  <m.icon className="size-5 mb-2 text-primary" />
                  <div className="text-sm font-medium">{m.label}</div>
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground flex items-center gap-1"><Lock className="size-3" /> Sandbox simulation — no real charges in this demo.</p>
          </Card>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-6 h-fit shadow-card sticky top-20">
          <h3 className="font-display font-bold mb-4">Order summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
            <div className="flex justify-between"><span>Shipping</span><span>{shipping === 0 ? "Free" : formatPrice(shipping)}</span></div>
            {discount > 0 && <div className="flex justify-between text-success"><span>Discount</span><span>-{formatPrice(discount)}</span></div>}
            <div className="border-t border-border pt-2 mt-2 flex justify-between font-display font-bold text-lg"><span>Total</span><span>{formatPrice(total)}</span></div>
          </div>
          <div className="mt-4 flex gap-2">
            <Input placeholder="Coupon code" value={coupon} onChange={(e) => setCoupon(e.target.value)} />
            <Button variant="outline" onClick={applyCoupon}>Apply</Button>
          </div>
          <Button onClick={placeOrder} disabled={submitting || items.length === 0} className="w-full mt-4 bg-gradient-primary text-primary-foreground shadow-elegant">
            {submitting ? "Processing..." : `Pay ${formatPrice(total)}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
