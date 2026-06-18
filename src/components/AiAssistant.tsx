import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useTranslation } from "react-i18next";

export function AiAssistant({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { messages, sendMessage, status } = useChat({
    id: "ai-assistant",
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const loading = status === "submitted" || status === "streaming";

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0 gap-0">
        <SheetHeader className="border-b border-border p-4 bg-gradient-primary">
          <SheetTitle className="flex items-center gap-2 text-primary-foreground">
            <Sparkles className="size-5" /> {t("ai.title")}
          </SheetTitle>
        </SheetHeader>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="rounded-2xl bg-muted/50 p-4 text-sm">{t("ai.greeting")}</div>
          )}
          {messages.map((m) => {
            const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
            return (
              <div key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
                <div className={m.role === "user" ? "rounded-2xl bg-primary text-primary-foreground px-4 py-2 max-w-[85%]" : "max-w-[85%] prose prose-sm dark:prose-invert"}>
                  {m.role === "user" ? text : <ReactMarkdown>{text}</ReactMarkdown>}
                </div>
              </div>
            );
          })}
          {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Thinking...</div>}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (!input.trim() || loading) return; sendMessage({ text: input }); setInput(""); }}
          className="border-t border-border p-3 flex gap-2">
          <Input autoFocus value={input} onChange={(e) => setInput(e.target.value)} placeholder={t("ai.placeholder")} disabled={loading} />
          <Button type="submit" size="icon" disabled={loading || !input.trim()}><Send className="size-4" /></Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
