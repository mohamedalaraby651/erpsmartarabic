import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useDebounce } from "@/hooks/useDebounce";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Phone, MapPin } from "lucide-react";
import CustomerAvatar from "./CustomerAvatar";
import { cn } from "@/lib/utils";
import { customerRepository } from "@/lib/repositories/customerRepository";

interface CustomerSearchPreviewProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  mobileStyle?: boolean;
}

export function CustomerSearchPreview({ value, onChange, className, mobileStyle }: CustomerSearchPreviewProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debouncedSearch = useDebounce(value, 350);

  const { data: results = [] } = useQuery({
    queryKey: ['customer-search-preview', debouncedSearch],
    queryFn: () => customerRepository.searchPreview(debouncedSearch),
    enabled: !!debouncedSearch && debouncedSearch.length >= 2,
    staleTime: 30000,
  });

  const showNoResults = isFocused && value.length >= 2 && debouncedSearch === value && results.length === 0;

  useEffect(() => {
    setIsOpen(isFocused && value.length >= 2 && (results.length > 0 || showNoResults));
  }, [results, isFocused, value, showNoResults]);

  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  useEffect(() => { setHighlightedIndex(-1); }, [results]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev <= 0 ? results.length - 1 : prev - 1));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      navigate(`/customers/${results[highlightedIndex].id}`);
      setIsOpen(false);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }, [isOpen, results, highlightedIndex, navigate]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className={cn("relative flex-1", className)}>
      <Search className={cn(
        "absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4",
        mobileStyle ? "text-muted-foreground/60" : "text-muted-foreground",
      )} />
      <Input
        placeholder="بحث بالاسم، الهاتف، المحافظة..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setTimeout(() => setIsFocused(false), 200)}
        onKeyDown={handleKeyDown}
        className={cn(
          "pr-10 pl-10",
          mobileStyle && "h-11 rounded-xl bg-muted/50 border-transparent shadow-inner focus-visible:bg-background focus-visible:border-input",
        )}
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8"
          onClick={() => onChange('')}
        >
          <X className="h-4 w-4" />
        </Button>
      )}

      {isOpen && (
        <div className="absolute top-full mt-1 inset-x-0 z-50 bg-popover border rounded-xl shadow-lg overflow-hidden" role="listbox">
          {results.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              لا توجد نتائج مطابقة
            </div>
          ) : (
            results.map((customer, index) => (
              <button
                key={customer.id}
                role="option"
                aria-selected={highlightedIndex === index}
                className={cn(
                  "w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-right",
                  highlightedIndex === index && "bg-muted/50"
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  navigate(`/customers/${customer.id}`);
                  setIsOpen(false);
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <CustomerAvatar
                  name={customer.name}
                  imageUrl={customer.image_url}
                  customerType={customer.customer_type}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{customer.name}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {customer.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {customer.phone}
                      </span>
                    )}
                    {customer.governorate && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {customer.governorate}
                      </span>
                    )}
                  </div>
                </div>
                <span className={cn(
                  "text-sm font-bold",
                  Number(customer.current_balance) > 0 ? 'text-destructive' : 'text-emerald-600'
                )}>
                  {Number(customer.current_balance || 0).toLocaleString()}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
