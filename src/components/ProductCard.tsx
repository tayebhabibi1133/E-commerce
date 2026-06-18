import { Link } from "@tanstack/react-router";
import { Star, Heart } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { motion } from "framer-motion";

export interface ProductCardItem {
  id: string;
  slug: string;
  title: string;
  price: number | string;
  compare_at_price?: number | string | null;
  rating?: number | null;
  currency?: string;
  image?: string | null;
  brand?: string | null;
}

export function ProductCard({ p }: { p: ProductCardItem }) {
  const discount = p.compare_at_price && Number(p.compare_at_price) > Number(p.price)
    ? Math.round(100 - (Number(p.price) / Number(p.compare_at_price)) * 100) : 0;
  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
      <Link to="/products/$slug" params={{ slug: p.slug }} className="group block rounded-2xl bg-card shadow-card overflow-hidden border border-border/60 hover:shadow-elegant transition-shadow">
        <div className="relative aspect-square bg-muted overflow-hidden">
          {p.image ? (
            <img src={p.image} alt={p.title} loading="lazy" className="size-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="size-full bg-gradient-to-br from-muted to-secondary" />
          )}
          {discount > 0 && <span className="absolute top-2 start-2 rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">-{discount}%</span>}
          <button className="absolute top-2 end-2 size-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition" onClick={(e) => e.preventDefault()}>
            <Heart className="size-4" />
          </button>
        </div>
        <div className="p-3 space-y-1">
          {p.brand && <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{p.brand}</div>}
          <div className="text-sm font-medium line-clamp-2 min-h-10">{p.title}</div>
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1">
              <span className="font-display font-bold text-base">{formatPrice(p.price, p.currency)}</span>
              {discount > 0 && <span className="text-xs line-through text-muted-foreground">{formatPrice(p.compare_at_price!, p.currency)}</span>}
            </div>
            {!!p.rating && (
              <div className="flex items-center gap-0.5 text-xs">
                <Star className="size-3 fill-accent text-accent" /> {Number(p.rating).toFixed(1)}
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
