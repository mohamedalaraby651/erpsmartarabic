import { Layers } from 'lucide-react';

export function LandingFooter() {
  const currentYear = new Date().getFullYear();

  const links = {
    product: [
      { title: 'المميزات', href: '#features' },
      { title: 'الأسعار', href: '#pricing' },
      { title: 'التحديثات', href: '#' },
    ],
    support: [
      { title: 'مركز المساعدة', href: '#' },
      { title: 'الوثائق', href: '#' },
      { title: 'تواصل معنا', href: '#contact' },
    ],
    legal: [
      { title: 'سياسة الخصوصية', href: '#' },
      { title: 'شروط الاستخدام', href: '#' },
    ],
  };

  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-lg shadow-primary/25">
                <Layers className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-l from-primary to-violet-500 bg-clip-text text-transparent">
                نظرة
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              نظام إدارة الأعمال الذكي - منصة ERP متكاملة للشركات العربية
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-bold mb-4">المنتج</h4>
            <ul className="space-y-2">
              {links.product.map((link) => (
                <li key={link.title}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">الدعم</h4>
            <ul className="space-y-2">
              {links.support.map((link) => (
                <li key={link.title}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">قانوني</h4>
            <ul className="space-y-2">
              {links.legal.map((link) => (
                <li key={link.title}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t mt-12 pt-8 text-center text-sm text-muted-foreground">
          <p>© {currentYear} نظرة. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </footer>
  );
}