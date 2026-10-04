import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@/lib/router-compat";
import { useDebounce } from "@/hooks/useDebounce";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Phone, MapPin, Loader2 } from "lucide-react";
import CustomerAvatar from "@/components/customers/shared/CustomerAvatar";
import { cn } from "@/lib/utils";
import { customerSearchRepo } from "@/application/queries/customer-search";

interface CustomerSearchPreviewProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  mobileStyle?: boolean;
  isFetching?: boolean;
}

export function CustomerSearchPreview({ value, onChange, className, mobileStyle, isFetching = false }: CustomerSearchPreviewProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debouncedSearch = useDebounce(value, 350);

  const { data: results = [], isFetching: isPreviewFetching } = useQuery({
    queryKey: ['customer-search-preview', debouncedSearch],
    queryFn: () => customerSearchRepo.searchPreview(debouncedSearch),
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
    if (e.key === 'Escape') {
      e.preventDefault();
      if (isOpen) setIsOpen(false);
      else onChange('');
      return;
    }
    if (e.key === 'Enter' && (!isOpen || highlightedIndex < 0)) {
      setIsOpen(false);
      return;
    }
    if (!isOpen || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev <= 0 ? results.length - 1 : prev - 1));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      const selected = results[highlightedIndex];
      if (!selected) return;
      navigate(`/customers/${selected.id}`);
      setIsOpen(false);
    }
  }, [isOpen, results, highlightedIndex, navigate, onChange]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsFocused(false);
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
        placeholder="ابحث بالاسم، الهاتف، البريد أو الرقم الضريبي..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onKeyDown={handleKeyDown}
        aria-label="البحث في العملاء"
        aria-controls={isOpen ? 'customer-search-suggestions' : undefined}
        aria-expanded={isOpen}
        aria-autocomplete="list"
        className={cn(
          "pr-10 pl-10",
          mobileStyle && "h-11 rounded-xl bg-muted/50 border-transparent shadow-inner focus-visible:bg-background focus-visible:border-input",
        )}
      />
      {(isFetching || isPreviewFetching) && (
        <Loader2 className="absolute left-10 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-label="جارٍ تحديث النتائج" />
      )}
      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8"
          onClick={() => onChange('')}
          aria-label="مسح البحث"
        >
          <X className="h-4 w-4" />
        </Button>
      )}

      {isOpen && (
        <div id="customer-search-suggestions" className="absolute top-full mt-1 inset-x-0 z-50 bg-popover border rounded-xl shadow-lg overflow-hidden" role="listbox" aria-label="اقتراحات العملاء">
          {results.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <p>لم نجد عملاء مطابقين.</p>
              <Button
                type="button"
                variant="link"
                size="sm"
                onMouseDown={(event) => { event.preventDefault(); onChange(''); setIsOpen(false); }}
              >
                مسح البحث
              </Button>
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
