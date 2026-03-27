import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useDebounce } from "@/hooks/useDebounce";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Phone, MapPin } from "lucide-react";
import CustomerAvatar from "./CustomerAvatar";
import { cn } from "@/lib/utils";

interface CustomerSearchPreviewProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function CustomerSearchPreview({ value, onChange, className }: CustomerSearchPreviewProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debouncedSearch = useDebounce(value, 200);

  const { data: results = [] } = useQuery({
    queryKey: ['customer-search-preview', debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) return [];
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone, governorate, customer_type, image_url, current_balance, vip_level')
        .or(`name.ilike.%${debouncedSearch}%,phone.ilike.%${debouncedSearch}%`)
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!debouncedSearch && debouncedSearch.length >= 2,
    staleTime: 10000,
  });

  useEffect(() => {
    setIsOpen(isFocused && results.length > 0 && value.length >= 2);
  }, [results, isFocused, value]);

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
      <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="بحث بالاسم، الهاتف، المحافظة..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setTimeout(() => setIsFocused(false), 200)}
        className="pr-10 pl-10"
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
        <div className="absolute top-full mt-1 inset-x-0 z-50 bg-popover border rounded-lg shadow-lg overflow-hidden">
          {results.map((customer) => (
            <button
              key={customer.id}
              className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-right"
              onMouseDown={(e) => {
                e.preventDefault();
                navigate(`/customers/${customer.id}`);
                setIsOpen(false);
              }}
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
          ))}
        </div>
      )}
    </div>
  );
}
