import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Shield, Truck, Headphones, Laptop, Shirt, Home as HomeIcon, Gem, Dumbbell, Book, Gamepad2, ShoppingBasket } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Souqly — Shop Smarter with AI" },
      { name: "description", content: "Discover and compare millions of products from thousands of trusted sellers, with AI guiding every purchase." },
    ],
  }),
  component: HomePage,
});

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  electronics: Laptop, fashion: Shirt, "home-garden": HomeIcon, beauty: Gem,
  sports: Dumbbell, books: Book, toys: Gamepad2, grocery: ShoppingBasket,
};

function HomePage() {
  const { t } = useTranslation();

  const { data: featured = [] } = useQuery({
    queryKey: ["home-featured"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id,slug,title,price,compare_at_price,rating,currency,brand,product_images(url)")
        .eq("status","approved")
        .order("sales_count", { ascending: false })
        .limit(10);
      return (data ?? []).map((p) => ({ ...p, image: p.product_images?.[0]?.url }));
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["home-cats"],
    queryFn: async () => (await supabase.from("categories").select("*").is("parent_id", null)).data ?? [],
  });

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-90" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]" />
        <div className="container mx-auto px-4 py-20 md:py-28 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-3xl text-primary-foreground">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-4 py-1.5 text-sm mb-6">
              <Sparkles className="size-4" /> Powered by AI
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight text-balance">
              {t("home.heroTitle")}
            </h1>
            <p className="mt-4 text-lg md:text-xl text-white/90 max-w-xl text-balance">{t("home.heroSub")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/products"><Button size="lg" className="bg-white text-primary hover:bg-white/90 shadow-elegant">{t("home.shopNow")} <ArrowRight className="size-4 ms-1" /></Button></Link>
              <Link to="/seller/onboarding"><Button size="lg" variant="outline" className="border-white/40 text-primary-foreground hover:bg-white/10">{t("actions.becomeSeller")}</Button></Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* TRUST BADGES */}
      <section className="container mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-6 -mt-8 relative z-10">
        {[
          { icon: Shield, t: "Secure payments" },
          { icon: Truck, t: "Fast shipping" },
          { icon: Headphones, t: "24/7 support" },
          { icon: Sparkles, t: "AI assistant" },
        ].map((b, i) => (
          <div key={i} className="rounded-2xl bg-card shadow-card border border-border/60 p-4 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><b.icon className="size-5" /></div>
            <div className="text-sm font-medium">{b.t}</div>
          </div>
        ))}
      </section>

      {/* CATEGORIES */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="font-display text-2xl md:text-3xl font-bold mb-6">{t("home.categories")}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {categories.map((c: { id: string; slug: string; name: string; icon?: string | null }) => {
            const Icon = CATEGORY_ICONS[c.slug] ?? Laptop;
            return (
              <Link key={c.id} to="/products" search={{ category: c.slug } as never}
                className="group rounded-2xl border border-border/60 bg-card hover:bg-gradient-card hover:shadow-elegant transition-all p-4 text-center">
                <div className="size-12 mx-auto rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-gradient-primary group-hover:text-primary-foreground transition">
                  <Icon className="size-5" />
                </div>
                <div className="mt-2 text-xs font-medium">{c.name}</div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* FEATURED */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex items-end justify-between mb-6">
          <h2 className="font-display text-2xl md:text-3xl font-bold">{t("home.trending")}</h2>
          <Link to="/products" className="text-sm text-primary hover:underline">View all →</Link>
        </div>
        {featured.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center text-muted-foreground">
            No products yet. <Link to="/seller/onboarding" className="text-primary underline">Become the first seller</Link> to list yours.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {featured.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        )}
      </section>

      {/* AI CTA */}
      <section className="container mx-auto px-4 py-16">
        <div className="rounded-3xl bg-gradient-hero p-8 md:p-12 text-primary-foreground relative overflow-hidden shadow-elegant">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_50%,rgba(255,255,255,0.2),transparent_50%)]" />
          <div className="relative max-w-2xl">
            <Sparkles className="size-8 mb-4" />
            <h3 className="font-display text-3xl md:text-4xl font-bold mb-3">Ask the AI assistant anything</h3>
            <p className="text-white/90 mb-6">"Find me a laptop under $500 for programming" — get instant recommendations, comparisons, and answers.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
