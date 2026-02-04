import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Layers, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const navLinks = [
  { title: 'المميزات', href: '#features' },
  { title: 'الأسعار', href: '#pricing' },
  { title: 'تواصل معنا', href: '#contact' },
];

export function LandingNavbar() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    element?.scrollIntoView({ behavior: 'smooth' });
    setIsOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet-500 shadow-lg shadow-primary/25">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-l from-primary to-violet-500 bg-clip-text text-transparent">
            نظرة
          </span>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <button
              key={link.href}
              onClick={() => scrollToSection(link.href)}
              className="text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              {link.title}
            </button>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate('/auth')}>
            تسجيل الدخول
          </Button>
          <Button 
            onClick={() => navigate('/auth')}
            className="bg-gradient-to-l from-primary to-violet-500 hover:from-primary/90 hover:to-violet-500/90"
          >
            ابدأ مجاناً
          </Button>
        </div>

        {/* Mobile Menu */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px]">
            <div className="flex flex-col gap-6 mt-8">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollToSection(link.href)}
                  className="text-lg font-medium text-right hover:text-primary transition-colors"
                >
                  {link.title}
                </button>
              ))}
              <div className="border-t pt-6 space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => { navigate('/auth'); setIsOpen(false); }}
                >
                  تسجيل الدخول
                </Button>
                <Button 
                  className="w-full bg-gradient-to-l from-primary to-violet-500"
                  onClick={() => { navigate('/auth'); setIsOpen(false); }}
                >
                  ابدأ مجاناً
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}