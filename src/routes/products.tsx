import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/ProductCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useState } from "react";
import { z } from "zod";
import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

const searchSchema = z.object({
  q: z.string().optional(), category: z.string().optional(), max: z.coerce.number().optional(),
});

export const Route = createFileRoute("/products")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({ meta: [{ title: "All Products — Souqly" }, { name: "description", content: "Browse all products from thousands of trusted sellers." }] }),
  component: ProductsPage,
});

function ProductsPage() {
  const sp = Route.useSearch();
  const [q, setQ] = useState(sp.q ?? "");
  const [maxPrice, setMaxPrice] = useState(sp.max ?? 5000);

  const { data: categories = [] } = useQuery({
    queryKey: ["cats-all"],
    queryFn: async () => (await supabase.from("categories").select("*")).data ?? [],
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", sp.category, q, maxPrice],
    queryFn: async () => {
      let req = supabase.from("products")
        .select("id,slug,title,price,compare_at_price,rating,currency,brand,category_id,product_images(url)")
        .eq("status","approved").lte("price", maxPrice).limit(60);
      if (sp.category) {
        const cat = categories.find((c: { slug: string; id: string }) => c.slug === sp.category);
        if (cat) req = req.eq("category_id", cat.id);
      }
      if (q) req = req.ilike("title", `%${q}%`);
      const { data } = await req;
      return (data ?? []).map((p) => ({ ...p, image: p.product_images?.[0]?.url }));
    },
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid lg:grid-cols-[260px_1fr] gap-8">
        <aside className="space-y-6">
          <div>
            <Label className="text-sm font-semibold mb-2 flex items-center gap-2"><SlidersHorizontal className="size-4" /> Filters</Label>
            <div className="relative mt-3">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search..." className="ps-9" />
            </div>
          </div>
          <div>
            <Label className="text-sm font-semibold">Max price</Label>
            <Slider value={[maxPrice]} onValueChange={(v) => setMaxPrice(v[0])} max={5000} step={50} className="mt-3" />
            <div className="text-xs text-muted-foreground mt-1">Up to ${maxPrice}</div>
          </div>
          <div>
            <Label className="text-sm font-semibold mb-2 block">Categories</Label>
            <div className="space-y-1">
              <Link to="/products" className="block text-sm py-1 px-2 rounded hover:bg-muted">All</Link>
              {categories.map((c: { id: string; slug: string; name: string }) => (
                <Link key={c.id} to="/products" search={{ category: c.slug } as never}
                  className={`block text-sm py-1 px-2 rounded hover:bg-muted ${sp.category === c.slug ? "bg-primary/10 text-primary font-medium" : ""}`}>
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        </aside>
        <div>
          <div className="flex items-center justify-between mb-4">
            <h1 className="font-display text-2xl font-bold">{sp.category ? categories.find((c: { slug: string; name: string }) => c.slug === sp.category)?.name : "All Products"}</h1>
            <span className="text-sm text-muted-foreground">{products.length} results</span>
          </div>
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-[3/4] rounded-2xl bg-muted animate-pulse" />)}
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center">
              <p className="text-muted-foreground mb-3">No products match your filters.</p>
              <Button asChild variant="outline"><Link to="/products">Clear filters</Link></Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
