import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Store } from "lucide-react";
import { slugify } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/seller/onboarding")({
  head: () => ({ meta: [{ title: "Become a Seller — Souqly" }] }),
  component: Onboarding,
});

function Onboarding() {
  const { user, loading, roles } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState(""); const [desc, setDesc] = useState(""); const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (!loading && !user) nav({ to: "/auth", search: { redirect: "/seller/onboarding" } as never }); }, [user, loading, nav]);
  useEffect(() => { if (roles.includes("seller")) nav({ to: "/seller" }); }, [roles, nav]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      const slug = slugify(name) + "-" + Math.random().toString(36).slice(2, 6);
      const { error } = await supabase.from("stores").insert({ owner_id: user.id, name, slug, description: desc });
      if (error) throw error;
      await supabase.from("user_roles").insert({ user_id: user.id, role: "seller" });
      toast.success("Store created! Welcome aboard.");
      window.location.href = "/seller";
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setSubmitting(false); }
  };

  if (!user) return null;
  return (
    <div className="container mx-auto px-4 py-12 max-w-xl">
      <div className="text-center mb-8">
        <div className="size-14 mx-auto rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
          <Store className="size-7 text-primary-foreground" />
        </div>
        <h1 className="font-display text-3xl font-bold mt-4">Open your store</h1>
        <p className="text-muted-foreground">Join thousands of sellers reaching customers worldwide.</p>
      </div>
      <Card className="p-6">
        <form onSubmit={create} className="space-y-4">
          <div><Label>Store name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} /></div>
          <div><Label>Short description</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={4} /></div>
          <Button type="submit" disabled={submitting} className="w-full bg-gradient-primary text-primary-foreground shadow-elegant">
            {submitting ? "Creating..." : "Create store"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
