import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/seller/orders")({ component: SellerOrders });

function SellerOrders() {
  const { user } = useAuth();
  const { data: store } = useQuery({
    queryKey: ["my-store", user?.id],
    queryFn: async () => (await supabase.from("stores").select("id").eq("owner_id", user!.id).single()).data,
    enabled: !!user,
  });
  const { data: items = [] } = useQuery({
    queryKey: ["seller-orders", store?.id],
    queryFn: async () => (await supabase.from("order_items").select("*, orders(order_number, status, created_at)").eq("store_id", store!.id).order("created_at", { ascending: false })).data ?? [],
    enabled: !!store,
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-4">Orders</h1>
      <div className="space-y-3">
        {items.length === 0 && <Card className="p-8 text-center text-muted-foreground">No orders yet.</Card>}
        {items.map((it: { id: string; title: string; quantity: number; unit_price: number; image_url: string | null; orders: { order_number: string; status: string; created_at: string } }) => (
          <Card key={it.id} className="p-4 flex items-center gap-4">
            <div className="size-14 rounded-lg bg-muted overflow-hidden shrink-0">{it.image_url && <img src={it.image_url} alt="" className="size-full object-cover" />}</div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{it.title}</div>
              <div className="text-xs text-muted-foreground font-mono">{it.orders.order_number} · {new Date(it.orders.created_at).toLocaleDateString()}</div>
            </div>
            <Badge>{it.orders.status}</Badge>
            <div className="text-end"><div className="text-sm">×{it.quantity}</div><div className="font-bold">{formatPrice(Number(it.unit_price) * it.quantity)}</div></div>
          </Card>
        ))}
      </div>
    </div>
  );
}
