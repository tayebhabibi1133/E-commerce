import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";

export function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-border/60 mt-24 bg-muted/30">
      <div className="container mx-auto px-4 py-12 grid gap-8 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="size-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Sparkles className="size-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold">{t("brand")}</span>
          </div>
          <p className="text-sm text-muted-foreground max-w-xs">{t("tagline")}</p>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm">Marketplace</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="/products">All products</a></li>
            <li><a href="/sellers">Top sellers</a></li>
            <li><a href="/seller/onboarding">Sell with us</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm">Help</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Shipping</li><li>Returns</li><li>Contact</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm">Legal</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Privacy</li><li>Terms</li><li>Cookies</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {t("brand")}. All rights reserved.
      </div>
    </footer>
  );
}
