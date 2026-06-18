import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

const resources = {
  en: { translation: {
    brand: "Souqly",
    tagline: "The AI-powered multi-vendor marketplace",
    nav: { home: "Home", products: "Products", deals: "Deals", sellers: "Sellers", orders: "Orders" },
    actions: { signIn: "Sign in", signOut: "Sign out", signUp: "Sign up", search: "Search products, brands, sellers...", addToCart: "Add to cart", buyNow: "Buy now", checkout: "Checkout", continue: "Continue", save: "Save", cancel: "Cancel", askAi: "Ask AI", becomeSeller: "Become a seller" },
    home: {
      heroTitle: "Discover. Compare. Buy. Smarter.",
      heroSub: "Thousands of sellers, millions of products, one intelligent assistant guiding every purchase.",
      shopNow: "Shop now", exploreCategories: "Browse categories",
      featured: "Featured products", trending: "Trending now", forYou: "Recommended for you",
      categories: "Shop by category",
    },
    auth: { welcome: "Welcome back", create: "Create your account", email: "Email", password: "Password", fullName: "Full name", or: "or continue with", google: "Continue with Google", haveAccount: "Already have an account?", noAccount: "Don't have an account?" },
    cart: { title: "Your cart", empty: "Your cart is empty.", subtotal: "Subtotal", shipping: "Shipping", total: "Total", remove: "Remove" },
    seller: { dashboard: "Seller dashboard", revenue: "Revenue", orders: "Orders", products: "Products", visitors: "Visitors", topProducts: "Top selling products", newProduct: "New product" },
    admin: { dashboard: "Admin dashboard", users: "Users", sellers: "Sellers", pendingProducts: "Pending products", approve: "Approve", reject: "Reject" },
    ai: { title: "AI Shopping Assistant", placeholder: "Find me a laptop under $500 for programming...", greeting: "Hi! I can help you find the perfect product. What are you shopping for today?" },
    common: { loading: "Loading...", error: "Something went wrong", price: "Price", rating: "Rating", inStock: "In stock", outOfStock: "Out of stock" },
  }},
  ar: { translation: {
    brand: "سوقلي",
    tagline: "سوق متعدد البائعين مدعوم بالذكاء الاصطناعي",
    nav: { home: "الرئيسية", products: "المنتجات", deals: "العروض", sellers: "البائعون", orders: "الطلبات" },
    actions: { signIn: "تسجيل الدخول", signOut: "خروج", signUp: "إنشاء حساب", search: "ابحث عن منتجات، علامات، بائعين...", addToCart: "أضف إلى السلة", buyNow: "اشترِ الآن", checkout: "إتمام الشراء", continue: "متابعة", save: "حفظ", cancel: "إلغاء", askAi: "اسأل الذكاء", becomeSeller: "كن بائعًا" },
    home: { heroTitle: "اكتشف. قارن. اشترِ بذكاء.", heroSub: "آلاف البائعين، ملايين المنتجات، ومساعد ذكي يرشدك في كل عملية شراء.", shopNow: "تسوق الآن", exploreCategories: "تصفح الفئات", featured: "منتجات مميزة", trending: "الأكثر رواجًا", forYou: "موصى لك", categories: "تسوق حسب الفئة" },
    auth: { welcome: "مرحبًا بعودتك", create: "أنشئ حسابك", email: "البريد الإلكتروني", password: "كلمة المرور", fullName: "الاسم الكامل", or: "أو تابع باستخدام", google: "تابع باستخدام Google", haveAccount: "لديك حساب؟", noAccount: "لا تملك حسابًا؟" },
    cart: { title: "سلتك", empty: "سلتك فارغة.", subtotal: "المجموع الفرعي", shipping: "الشحن", total: "المجموع", remove: "حذف" },
    seller: { dashboard: "لوحة البائع", revenue: "الإيرادات", orders: "الطلبات", products: "المنتجات", visitors: "الزوار", topProducts: "الأكثر مبيعًا", newProduct: "منتج جديد" },
    admin: { dashboard: "لوحة المشرف", users: "المستخدمون", sellers: "البائعون", pendingProducts: "منتجات قيد المراجعة", approve: "موافقة", reject: "رفض" },
    ai: { title: "مساعد التسوق الذكي", placeholder: "ابحث لي عن لابتوب بأقل من 500 دولار للبرمجة...", greeting: "مرحبًا! يمكنني مساعدتك في العثور على المنتج المثالي. ما الذي تبحث عنه؟" },
    common: { loading: "جارٍ التحميل...", error: "حدث خطأ ما", price: "السعر", rating: "التقييم", inStock: "متوفر", outOfStock: "غير متوفر" },
  }},
  fa: { translation: {
    brand: "سوقلی",
    tagline: "بازارگاه چندفروشنده با هوش مصنوعی",
    nav: { home: "خانه", products: "محصولات", deals: "تخفیف‌ها", sellers: "فروشندگان", orders: "سفارش‌ها" },
    actions: { signIn: "ورود", signOut: "خروج", signUp: "ثبت‌نام", search: "محصولات، برندها، فروشندگان...", addToCart: "افزودن به سبد", buyNow: "خرید فوری", checkout: "تسویه حساب", continue: "ادامه", save: "ذخیره", cancel: "لغو", askAi: "از هوش بپرس", becomeSeller: "فروشنده شوید" },
    home: { heroTitle: "کشف کن. مقایسه کن. هوشمندانه بخر.", heroSub: "هزاران فروشنده، میلیون‌ها محصول، یک دستیار هوشمند برای هر خرید.", shopNow: "شروع خرید", exploreCategories: "مرور دسته‌ها", featured: "محصولات ویژه", trending: "پرطرفدار", forYou: "پیشنهاد برای شما", categories: "خرید بر اساس دسته" },
    auth: { welcome: "خوش آمدید", create: "حساب بسازید", email: "ایمیل", password: "گذرواژه", fullName: "نام کامل", or: "یا با", google: "ادامه با گوگل", haveAccount: "حساب دارید؟", noAccount: "حساب ندارید؟" },
    cart: { title: "سبد خرید", empty: "سبد شما خالی است.", subtotal: "جمع جزء", shipping: "ارسال", total: "مجموع", remove: "حذف" },
    seller: { dashboard: "پنل فروشنده", revenue: "درآمد", orders: "سفارش‌ها", products: "محصولات", visitors: "بازدیدکنندگان", topProducts: "پرفروش‌ترین‌ها", newProduct: "محصول جدید" },
    admin: { dashboard: "پنل مدیر", users: "کاربران", sellers: "فروشندگان", pendingProducts: "محصولات در انتظار", approve: "تأیید", reject: "رد" },
    ai: { title: "دستیار خرید هوشمند", placeholder: "یک لپ‌تاپ زیر ۵۰۰ دلار برای برنامه‌نویسی پیدا کن...", greeting: "سلام! می‌توانم در یافتن بهترین محصول کمکتان کنم. دنبال چه هستید؟" },
    common: { loading: "در حال بارگذاری...", error: "خطایی رخ داد", price: "قیمت", rating: "امتیاز", inStock: "موجود", outOfStock: "ناموجود" },
  }},
};

if (!i18n.isInitialized) {
  i18n.use(LanguageDetector).use(initReactI18next).init({
    resources, fallbackLng: "en",
    supportedLngs: ["en","ar","fa"],
    interpolation: { escapeValue: false },
    detection: { order: ["localStorage","navigator"], caches: ["localStorage"] },
  });
}

export const RTL_LANGS = ["ar","fa"];
export function applyDirection(lng: string) {
  if (typeof document === "undefined") return;
  const dir = RTL_LANGS.includes(lng) ? "rtl" : "ltr";
  document.documentElement.setAttribute("dir", dir);
  document.documentElement.setAttribute("lang", lng);
}

export default i18n;
