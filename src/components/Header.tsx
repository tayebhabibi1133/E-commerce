import { Link, useNavigate } from "@tanstack/react-router";
import { Search, ShoppingCart, Heart, User as UserIcon, Sparkles, Moon, Sun, Globe, Store, LayoutDashboard } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth-context";
import { applyDirection } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export function Header({ onOpenAi }: { onOpenAi: () => void }) {
  const { t, i18n } = useTranslation();
  const { user, roles, signOut } = useAuth();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [theme, setTheme] = useState<"light"|"dark">(() => (typeof window !== "undefined" && localStorage.getItem("theme") as "light"|"dark") || "light");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const { data: cartCount } = useQuery({
    queryKey: ["cart-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase.from("cart_items").select("*", { count: "exact", head: true }).eq("user_id", user.id);
      return count ?? 0;
    },
    enabled: !!user,
  });

  const setLang = (lng: string) => { i18n.changeLanguage(lng); applyDirection(lng); };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center gap-3 px-4">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="size-9 rounded-xl bg-gradient-primary shadow-glow flex items-center justify-center">
            <Sparkles className="size-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight hidden sm:inline">{t("brand")}</span>
        </Link>

        <form
          onSubmit={(e) => { e.preventDefault(); nav({ to: "/products", search: { q } as never }); }}
          className="relative flex-1 max-w-2xl"
        >
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("actions.search")} className="ps-9 h-10 bg-muted/50 border-transparent focus-visible:bg-background" />
        </form>

        <Button variant="ghost" size="sm" onClick={onOpenAi} className="gap-2 hidden md:flex">
          <Sparkles className="size-4 text-primary" /> {t("actions.askAi")}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon"><Globe className="size-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setLang("en")}>English</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLang("ar")}>العربية</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLang("fa")}>دری</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>

        <Link to="/wishlist"><Button variant="ghost" size="icon"><Heart className="size-4" /></Button></Link>
        <Link to="/cart">
          <Button variant="ghost" size="icon" className="relative">
            <ShoppingCart className="size-4" />
            {!!cartCount && <span className="absolute -top-1 -end-1 size-4 rounded-full bg-accent text-[10px] font-bold text-accent-foreground flex items-center justify-center">{cartCount}</span>}
          </Button>
        </Link>

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon"><UserIcon className="size-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => nav({ to: "/orders" })}>{t("nav.orders")}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => nav({ to: "/profile" })}>Profile</DropdownMenuItem>
              {roles.includes("seller") && (
                <DropdownMenuItem onClick={() => nav({ to: "/seller" })}><LayoutDashboard className="size-4 me-2" />{t("seller.dashboard")}</DropdownMenuItem>
              )}
              {!roles.includes("seller") && (
                <DropdownMenuItem onClick={() => nav({ to: "/seller/onboarding" })}><Store className="size-4 me-2" />{t("actions.becomeSeller")}</DropdownMenuItem>
              )}
              {roles.includes("admin") && (
                <DropdownMenuItem onClick={() => nav({ to: "/admin" })}><LayoutDashboard className="size-4 me-2" />{t("admin.dashboard")}</DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={async () => { await signOut(); nav({ to: "/" }); }}>{t("actions.signOut")}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link to="/auth"><Button size="sm" className="bg-gradient-primary text-primary-foreground shadow-elegant">{t("actions.signIn")}</Button></Link>
        )}
      </div>
    </header>
  );
}
