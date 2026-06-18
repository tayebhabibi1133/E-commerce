import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/format";
import { Package } from "lucide-react";

export const Route = createFileRoute("/orders")({
  head: () => ({ meta: [{ title: "Orders — Souqly" }] }),
  component: OrdersPage,
});

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground", paid: "bg-primary/15 text-primary",
  processing: "bg-warning/20 text-foreground", shipped: "bg-primary/15 text-primary",
  delivered: "bg-success/15 text-success", cancelled: "bg-destructive/15 text-destructive",
  refunded: "bg-muted text-muted-foreground",
};

function OrdersPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => { if (!loading && !user) nav({ to: "/auth", search: { redirect: "/orders" } as never }); }, [user, loading, nav]);

  const { data: orders = [] } = useQuery({
    queryKey: ["orders", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("orders")
        .select("*, order_items(id, title, quantity, unit_price, image_url)")
        .eq("user_id", user!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="font-display text-3xl font-bold mb-6">Your orders</h1>
      {orders.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border p-16 text-center">
          <Package className="size-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-3">No orders yet.</p>
          <Link to="/products" className="text-primary underline">Start shopping</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o: { id: string; order_number: string; status: string; total: number; created_at: string; order_items: { id: string; title: string; quantity: number; unit_price: number; image_url: string | null }[] }) => (
            <div key={o.id} className="rounded-2xl border border-border/60 bg-card p-5 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div>
                  <div className="font-mono text-xs text-muted-foreground">{o.order_number}</div>
                  <div className="text-sm text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</div>
                </div>
                <Badge className={STATUS_COLORS[o.status] ?? ""}>{o.status}</Badge>
                <div className="font-display font-bold text-lg">{formatPrice(o.total)}</div>
              </div>
              <div className="space-y-2">
                {o.order_items.map((it) => (
                  <div key={it.id} className="flex items-center gap-3 text-sm">
                    <div className="size-12 rounded bg-muted shrink-0 overflow-hidden">{it.image_url && <img src={it.image_url} alt="" className="size-full object-cover" />}</div>
                    <div className="flex-1 line-clamp-1">{it.title}</div>
                    <div className="text-muted-foreground">×{it.quantity}</div>
                    <div className="font-medium">{formatPrice(it.unit_price)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
