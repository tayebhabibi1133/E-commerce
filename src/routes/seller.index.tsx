import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { formatPrice } from "@/lib/format";
import { DollarSign, ShoppingBag, Package, Star } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";

export const Route = createFileRoute("/seller/")({
  component: SellerHome,
});

function SellerHome() {
  const { user } = useAuth();
  const { data: store } = useQuery({
    queryKey: ["my-store", user?.id],
    queryFn: async () => (await supabase.from("stores").select("*").eq("owner_id", user!.id).single()).data,
    enabled: !!user,
  });
  const { data: stats } = useQuery({
    queryKey: ["seller-stats", store?.id],
    queryFn: async () => {
      if (!store) return null;
      const [{ count: productCount }, { data: items }] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }).eq("store_id", store.id),
        supabase.from("order_items").select("unit_price, quantity, created_at").eq("store_id", store.id),
      ]);
      const revenue = (items ?? []).reduce((s, x) => s + Number(x.unit_price) * x.quantity, 0);
      const orders = new Set((items ?? []).map((x) => x.created_at.slice(0, 10))).size;
      const byDay = (items ?? []).reduce((acc: Record<string, number>, x) => {
        const d = x.created_at.slice(5, 10); acc[d] = (acc[d] ?? 0) + Number(x.unit_price) * x.quantity; return acc;
      }, {});
      return { revenue, orders, productCount: productCount ?? 0, chart: Object.entries(byDay).slice(-14).map(([d, v]) => ({ d, v })) };
    },
    enabled: !!store,
  });

  return (
    <div>
      <h1 className="font-display text-3xl font-bold mb-1">{store?.name ?? "Your store"}</h1>
      <p className="text-muted-foreground mb-6">Welcome back. Here's a quick overview.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: DollarSign, label: "Revenue", value: formatPrice(stats?.revenue ?? 0), color: "text-success" },
          { icon: ShoppingBag, label: "Orders", value: stats?.orders ?? 0, color: "text-primary" },
          { icon: Package, label: "Products", value: stats?.productCount ?? 0, color: "text-accent" },
          { icon: Star, label: "Rating", value: store?.rating ? Number(store.rating).toFixed(1) : "—", color: "text-warning" },
        ].map((s, i) => (
          <Card key={i} className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</div>
                <div className="font-display text-2xl font-bold mt-1">{s.value}</div>
              </div>
              <s.icon className={`size-8 ${s.color}`} />
            </div>
          </Card>
        ))}
      </div>
      <Card className="p-5 mt-6">
        <h3 className="font-display font-bold mb-4">Sales (last 14 days)</h3>
        <div className="h-64">
          <ResponsiveContainer>
            <AreaChart data={stats?.chart ?? []}>
              <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4}/><stop offset="100%" stopColor="var(--primary)" stopOpacity={0}/></linearGradient></defs>
              <XAxis dataKey="d" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip />
              <Area type="monotone" dataKey="v" stroke="var(--primary)" strokeWidth={2} fill="url(#g)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
