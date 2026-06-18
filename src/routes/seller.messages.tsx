import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { MessageCircle } from "lucide-react";

export const Route = createFileRoute("/seller/messages")({ component: SellerMessages });

function SellerMessages() {
  const { user } = useAuth();
  const { data: store } = useQuery({
    queryKey: ["my-store", user?.id],
    queryFn: async () => (await supabase.from("stores").select("id").eq("owner_id", user!.id).single()).data,
    enabled: !!user,
  });
  const { data: threads = [] } = useQuery({
    queryKey: ["seller-threads", store?.id],
    queryFn: async () => (await supabase.from("chat_threads").select("*, profiles!chat_threads_customer_id_fkey(full_name, avatar_url)").eq("store_id", store!.id).order("last_message_at", { ascending: false })).data ?? [],
    enabled: !!store,
  });
  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-4">Messages</h1>
      <div className="space-y-2">
        {threads.length === 0 && <Card className="p-8 text-center text-muted-foreground"><MessageCircle className="size-8 mx-auto mb-2" /> No conversations yet.</Card>}
        {threads.map((t: { id: string; last_message_at: string; profiles?: { full_name: string | null } | null }) => (
          <Link key={t.id} to="/messages/$id" params={{ id: t.id }}>
            <Card className="p-4 flex items-center gap-3 hover:bg-muted/50 transition">
              <div className="size-10 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center font-bold">{(t.profiles?.full_name ?? "?").charAt(0).toUpperCase()}</div>
              <div className="flex-1"><div className="font-medium">{t.profiles?.full_name ?? "Customer"}</div><div className="text-xs text-muted-foreground">{new Date(t.last_message_at).toLocaleString()}</div></div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
