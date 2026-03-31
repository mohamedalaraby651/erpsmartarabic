import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/usePageTitle";

const NotFound = () => {
  const location = useLocation();
  usePageTitle('الصفحة غير موجودة');

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.error("404:", location.pathname);
    }
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4" dir="rtl">
      <div className="text-center max-w-md">
        {/* Large 404 with gradient */}
        <div className="relative mb-6">
          <span className="text-[120px] md:text-[160px] font-black leading-none bg-gradient-to-br from-primary via-primary/70 to-primary/30 bg-clip-text text-transparent select-none">
            404
          </span>
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">
          الصفحة غير موجودة
        </h1>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          عذراً، لم نتمكن من العثور على الصفحة المطلوبة.
          <br />
          قد تكون محذوفة أو تم نقلها إلى عنوان آخر.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" className="gap-2">
            <a href="/">
              <Home className="h-4 w-4" />
              العودة للرئيسية
            </a>
          </Button>
          <Button asChild variant="outline" size="lg" className="gap-2">
            <a href="/search">
              <Search className="h-4 w-4" />
              البحث
            </a>
          </Button>
        </div>

        {import.meta.env.DEV && (
          <p className="mt-6 text-xs text-muted-foreground/50 font-mono">
            {location.pathname}
          </p>
        )}
      </div>
    </div>
  );
};

export default NotFound;
