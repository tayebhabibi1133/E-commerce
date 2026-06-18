import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

export const Route = createFileRoute("/messages/$id")({
  head: () => ({ meta: [{ title: "Messages — Souqly" }] }),
  component: MessageThread,
});

function MessageThread() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [user, loading, nav]);

  const { data: msgs = [] } = useQuery({
    queryKey: ["chat", id],
    queryFn: async () => (await supabase.from("chat_messages").select("*").eq("thread_id", id).order("created_at")).data ?? [],
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`thread-${id}`).on("postgres_changes",
      { event: "INSERT", schema: "public", table: "chat_messages", filter: `thread_id=eq.${id}` },
      () => qc.invalidateQueries({ queryKey: ["chat", id] })
    ).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, user, qc]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [msgs]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !user) return;
    await supabase.from("chat_messages").insert({ thread_id: id, sender_id: user.id, body: text });
    await supabase.from("chat_threads").update({ last_message_at: new Date().toISOString() }).eq("id", id);
    setText("");
  };

  if (!user) return null;
  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl flex flex-col h-[calc(100vh-8rem)]">
      <h1 className="font-display text-xl font-bold mb-3">Conversation</h1>
      <div ref={scrollRef} className="flex-1 overflow-y-auto rounded-2xl border border-border/60 bg-card p-4 space-y-3">
        {msgs.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Say hello to start the conversation.</p>}
        {msgs.map((m: { id: string; sender_id: string; body: string }) => (
          <div key={m.id} className={m.sender_id === user.id ? "flex justify-end" : ""}>
            <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${m.sender_id === user.id ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{m.body}</div>
          </div>
        ))}
      </div>
      <form onSubmit={send} className="mt-3 flex gap-2">
        <Input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message..." />
        <Button type="submit" size="icon"><Send className="size-4" /></Button>
      </form>
    </div>
  );
}
