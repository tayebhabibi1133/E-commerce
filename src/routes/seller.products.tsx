import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { slugify, formatPrice } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/seller/products")({
  component: SellerProducts,
});

function SellerProducts() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", brand: "", price: "", compare_at_price: "", stock: "10", category_id: "" });
  const [imageFile, setImageFile] = useState<File | null>(null);

  const { data: store } = useQuery({
    queryKey: ["my-store", user?.id],
    queryFn: async () => (await supabase.from("stores").select("*").eq("owner_id", user!.id).single()).data,
    enabled: !!user,
  });
  const { data: cats = [] } = useQuery({ queryKey: ["cats"], queryFn: async () => (await supabase.from("categories").select("*")).data ?? [] });
  const { data: products = [] } = useQuery({
    queryKey: ["seller-products", store?.id],
    queryFn: async () => (await supabase.from("products").select("*, product_images(url)").eq("store_id", store!.id).order("created_at", { ascending: false })).data ?? [],
    enabled: !!store,
  });

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;
    try {
      const slug = slugify(form.title) + "-" + Math.random().toString(36).slice(2, 6);
      const { data: p, error } = await supabase.from("products").insert({
        store_id: store.id, title: form.title, slug, description: form.description, brand: form.brand,
        price: Number(form.price), compare_at_price: form.compare_at_price ? Number(form.compare_at_price) : null,
        stock: Number(form.stock), category_id: form.category_id || null, status: "approved",
      }).select().single();
      if (error) throw error;
      if (imageFile && p) {
        const path = `${store.id}/${p.id}/${Date.now()}-${imageFile.name}`;
        const { error: upErr } = await supabase.storage.from("products").upload(path, imageFile);
        if (!upErr) {
          const { data: pub } = supabase.storage.from("products").getPublicUrl(path);
          await supabase.from("product_images").insert({ product_id: p.id, url: pub.publicUrl, position: 0 });
        }
      }
      toast.success("Product created");
      setOpen(false); setForm({ title: "", description: "", brand: "", price: "", compare_at_price: "", stock: "10", category_id: "" }); setImageFile(null);
      qc.invalidateQueries({ queryKey: ["seller-products"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  const remove = async (id: string) => {
    await supabase.from("products").update({ deleted_at: new Date().toISOString(), status: "archived" }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["seller-products"] }); toast.success("Archived");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl font-bold">Products</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-gradient-primary text-primary-foreground"><Plus className="size-4 me-1" /> New product</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New product</DialogTitle></DialogHeader>
            <form onSubmit={create} className="space-y-3">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} required /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} rows={3} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Brand</Label><Input value={form.brand} onChange={(e) => setForm({...form, brand: e.target.value})} /></div>
                <div><Label>Stock</Label><Input type="number" value={form.stock} onChange={(e) => setForm({...form, stock: e.target.value})} /></div>
                <div><Label>Price (USD)</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({...form, price: e.target.value})} required /></div>
                <div><Label>Compare at</Label><Input type="number" step="0.01" value={form.compare_at_price} onChange={(e) => setForm({...form, compare_at_price: e.target.value})} /></div>
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category_id} onValueChange={(v) => setForm({...form, category_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Choose..." /></SelectTrigger>
                  <SelectContent>{cats.map((c: { id: string; name: string }) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Image</Label>
                <label className="mt-1 flex items-center gap-2 rounded-lg border-2 border-dashed border-border p-3 cursor-pointer hover:bg-muted/50">
                  <Upload className="size-4 text-muted-foreground" />
                  <span className="text-sm">{imageFile?.name ?? "Click to upload"}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
                </label>
              </div>
              <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground">Create product</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="space-y-3">
        {products.length === 0 && <Card className="p-8 text-center text-muted-foreground">No products yet — click "New product" to add your first.</Card>}
        {products.map((p: { id: string; title: string; price: number; stock: number; status: string; product_images: { url: string }[] }) => (
          <Card key={p.id} className="p-4 flex items-center gap-4">
            <div className="size-16 rounded-lg bg-muted overflow-hidden shrink-0">
              {p.product_images?.[0] && <img src={p.product_images[0].url} alt="" className="size-full object-cover" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{p.title}</div>
              <div className="text-sm text-muted-foreground">{formatPrice(p.price)} · Stock: {p.stock}</div>
            </div>
            <Badge variant={p.status === "approved" ? "secondary" : "outline"}>{p.status}</Badge>
            <Button size="icon" variant="ghost" onClick={() => remove(p.id)} className="text-destructive"><Trash2 className="size-4" /></Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
