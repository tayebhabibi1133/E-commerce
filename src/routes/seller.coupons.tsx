import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/seller/coupons")({ component: Coupons });

function Coupons() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [code, setCode] = useState(""); const [pct, setPct] = useState("10");
  const { data: store } = useQuery({
    queryKey: ["my-store", user?.id],
    queryFn: async () => (await supabase.from("stores").select("id").eq("owner_id", user!.id).single()).data,
    enabled: !!user,
  });
  const { data: list = [] } = useQuery({
    queryKey: ["coupons", store?.id],
    queryFn: async () => (await supabase.from("coupons").select("*").eq("store_id", store!.id)).data ?? [],
    enabled: !!store,
  });
  const create = async () => {
    if (!store || !code) return;
    const { error } = await supabase.from("coupons").insert({ code: code.toUpperCase(), store_id: store.id, discount_percent: Number(pct) });
    if (error) toast.error(error.message); else { setCode(""); qc.invalidateQueries({ queryKey: ["coupons"] }); toast.success("Coupon created"); }
  };
  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-4">Coupons</h1>
      <Card className="p-4 flex flex-wrap items-end gap-3 mb-4">
        <div><Label>Code</Label><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="SAVE10" /></div>
        <div><Label>% off</Label><Input type="number" value={pct} onChange={(e) => setPct(e.target.value)} className="w-24" /></div>
        <Button onClick={create} className="bg-gradient-primary text-primary-foreground"><Plus className="size-4 me-1" /> Create</Button>
      </Card>
      <div className="space-y-2">
        {list.map((c: { id: string; code: string; discount_percent: number; times_used: number }) => (
          <Card key={c.id} className="p-3 flex items-center gap-3">
            <div className="font-mono font-bold text-primary">{c.code}</div>
            <div className="text-sm">{c.discount_percent}% off</div>
            <div className="text-xs text-muted-foreground ms-auto">Used {c.times_used} times</div>
            <Button size="icon" variant="ghost" onClick={async () => { await supabase.from("coupons").delete().eq("id", c.id); qc.invalidateQueries({ queryKey: ["coupons"] }); }} className="text-destructive"><Trash2 className="size-4" /></Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
