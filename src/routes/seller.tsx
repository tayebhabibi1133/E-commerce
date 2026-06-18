import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useEffect } from "react";
import { LayoutDashboard, Package, ShoppingBag, MessageCircle, Tag, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/seller")({
  head: () => ({ meta: [{ title: "Seller Dashboard — Souqly" }] }),
  component: SellerLayout,
});

function SellerLayout() {
  const { user, roles, loading } = useAuth();
  const nav = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (loading) return;
    if (!user) nav({ to: "/auth", search: { redirect: "/seller" } as never });
    else if (!roles.includes("seller")) nav({ to: "/seller/onboarding" });
  }, [user, roles, loading, nav]);

  if (!user || !roles.includes("seller")) return null;
  const links = [
    { to: "/seller", icon: LayoutDashboard, label: "Overview" },
    { to: "/seller/products", icon: Package, label: "Products" },
    { to: "/seller/orders", icon: ShoppingBag, label: "Orders" },
    { to: "/seller/coupons", icon: Tag, label: "Coupons" },
    { to: "/seller/messages", icon: MessageCircle, label: "Messages" },
  ];

  return (
    <div className="container mx-auto px-4 py-6 grid lg:grid-cols-[220px_1fr] gap-6">
      <aside className="space-y-1">
        <div className="font-display font-bold text-lg mb-3 flex items-center gap-2"><BarChart3 className="size-5 text-primary" /> Seller</div>
        {links.map((l) => (
          <Link key={l.to} to={l.to} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${pathname === l.to ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"}`}>
            <l.icon className="size-4" /> {l.label}
          </Link>
        ))}
      </aside>
      <div><Outlet /></div>
    </div>
  );
}
