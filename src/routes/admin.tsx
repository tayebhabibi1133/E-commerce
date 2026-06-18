import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Store, Package, DollarSign, Check, X } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Souqly" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { user, roles, loading } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  useEffect(() => {
    if (loading) return;
    if (!user) nav({ to: "/auth", search: { redirect: "/admin" } as never });
    else if (!roles.includes("admin")) nav({ to: "/" });
  }, [user, roles, loading, nav]);

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [u, s, p, o] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("stores").select("*", { count: "exact", head: true }),
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("total"),
      ]);
      const revenue = (o.data ?? []).reduce((sum, x) => sum + Number(x.total), 0);
      return { users: u.count ?? 0, stores: s.count ?? 0, products: p.count ?? 0, revenue };
    },
    enabled: roles.includes("admin"),
  });

  const { data: pending = [] } = useQuery({
    queryKey: ["admin-pending"],
    queryFn: async () => (await supabase.from("products").select("*, stores(name)").eq("status", "pending").limit(20)).data ?? [],
    enabled: roles.includes("admin"),
  });

  const decide = async (id: string, status: "approved" | "rejected") => {
    await supabase.from("products").update({ status }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-pending"] }); toast.success(status);
  };

  if (!roles.includes("admin")) return null;
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold mb-6">Admin dashboard</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Users, label: "Users", value: stats?.users ?? 0 },
          { icon: Store, label: "Sellers", value: stats?.stores ?? 0 },
          { icon: Package, label: "Products", value: stats?.products ?? 0 },
          { icon: DollarSign, label: "Revenue", value: formatPrice(stats?.revenue ?? 0) },
        ].map((s, i) => (
          <Card key={i} className="p-5"><div className="flex items-center justify-between"><div><div className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</div><div className="font-display text-2xl font-bold mt-1">{s.value}</div></div><s.icon className="size-8 text-primary" /></div></Card>
        ))}
      </div>
      <Card className="p-5">
        <h3 className="font-display font-bold mb-3">Pending products ({pending.length})</h3>
        {pending.length === 0 ? <p className="text-sm text-muted-foreground">Nothing to review.</p> : (
          <div className="space-y-2">
            {pending.map((p: { id: string; title: string; price: number; stores: { name: string } }) => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                <div className="flex-1"><div className="font-medium">{p.title}</div><div className="text-xs text-muted-foreground">{p.stores.name} · {formatPrice(p.price)}</div></div>
                <Button size="sm" onClick={() => decide(p.id, "approved")} className="bg-success text-success-foreground"><Check className="size-4 me-1" /> Approve</Button>
                <Button size="sm" variant="destructive" onClick={() => decide(p.id, "rejected")}><X className="size-4" /></Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
