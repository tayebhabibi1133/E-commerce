import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — Souqly" }] }),
  component: Profile,
});

function Profile() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => { if (!loading && !user) nav({ to: "/auth", search: { redirect: "/profile" } as never }); }, [user, loading, nav]);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).single()).data,
    enabled: !!user,
  });
  const [name, setName] = useState(""); const [phone, setPhone] = useState("");
  useEffect(() => { if (profile) { setName(profile.full_name ?? ""); setPhone(profile.phone ?? ""); } }, [profile]);

  const save = async () => {
    const { error } = await supabase.from("profiles").update({ full_name: name, phone }).eq("id", user!.id);
    if (error) toast.error(error.message); else toast.success("Profile updated");
  };

  if (!user) return null;
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="font-display text-3xl font-bold mb-6">Profile</h1>
      <Card className="p-6 space-y-4">
        <div><Label>Email</Label><Input value={user.email ?? ""} disabled /></div>
        <div><Label>Full name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        <Button onClick={save} className="bg-gradient-primary text-primary-foreground">Save</Button>
      </Card>
    </div>
  );
}
