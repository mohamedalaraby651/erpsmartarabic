import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import PageHeader from '@/components/navigation/PageHeader';
import { useVoiceSearch } from '@/hooks/useVoiceSearch';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { cn } from '@/lib/utils';
import {
  Search,
  Users,
  Package,
  Receipt,
  FileText,
  Truck,
  Loader2,
  Mic,
  MicOff,
  Clock,
  X,
  Trash2,
} from 'lucide-react';

interface SearchResult {
  id: string;
  type: 'customer' | 'product' | 'invoice' | 'quotation' | 'supplier';
  title: string;
  subtitle?: string;
  href: string;
}

export default function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [showHistory, setShowHistory] = useState(false);

  // Voice search
  const { 
    isListening, 
    transcript, 
    isSupported: voiceSupported, 
    error: voiceError,
    startListening, 
    stopListening,
    resetTranscript,
  } = useVoiceSearch({
    onResult: (text) => {
      setQuery(prev => prev + text);
      setShowHistory(false);
    },
  });

  // Search history
  const { 
    recentQueries, 
    addToHistory, 
    removeFromHistory, 
    clearHistory,
    getSuggestions,
  } = useSearchHistory();

  // Update query from voice transcript
  useEffect(() => {
    if (transcript) {
      setQuery(prev => prev + transcript);
      resetTranscript();
    }
  }, [transcript, resetTranscript]);

  const { data: results, isLoading } = useQuery({
    queryKey: ['global-search', query],
    queryFn: async () => {
      if (!query || query.length < 1) return [];

      const searchResults: SearchResult[] = [];

      // Search customers
      const { data: customers } = await supabase
        .from('customers')
        .select('id, name, phone, email')
        .or(`name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

      customers?.forEach(c => {
        searchResults.push({
          id: c.id,
          type: 'customer',
          title: c.name,
          subtitle: c.phone || c.email || undefined,
          href: `/customers/${c.id}`,
        });
      });

      // Search products
      const { data: products } = await supabase
        .from('products')
        .select('id, name, sku')
        .or(`name.ilike.%${query}%,sku.ilike.%${query}%`)
        .limit(10);

      products?.forEach(p => {
        searchResults.push({
          id: p.id,
          type: 'product',
          title: p.name,
          subtitle: p.sku || undefined,
          href: `/products/${p.id}`,
        });
      });

      // Search invoices
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, invoice_number, customers(name)')
        .ilike('invoice_number', `%${query}%`)
        .limit(10);

      invoices?.forEach(i => {
        searchResults.push({
          id: i.id,
          type: 'invoice',
          title: `فاتورة ${i.invoice_number}`,
          subtitle: (i.customers as any)?.name,
          href: `/invoices?id=${i.id}`,
        });
      });

      // Search quotations
      const { data: quotations } = await supabase
        .from('quotations')
        .select('id, quotation_number, customers(name)')
        .ilike('quotation_number', `%${query}%`)
        .limit(10);

      quotations?.forEach(q => {
        searchResults.push({
          id: q.id,
          type: 'quotation',
          title: `عرض سعر ${q.quotation_number}`,
          subtitle: (q.customers as any)?.name,
          href: `/quotations?id=${q.id}`,
        });
      });

      // Search suppliers
      const { data: suppliers } = await supabase
        .from('suppliers')
        .select('id, name, phone')
        .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
        .limit(10);

      suppliers?.forEach(s => {
        searchResults.push({
          id: s.id,
          type: 'supplier',
          title: s.name,
          subtitle: s.phone || undefined,
          href: `/suppliers?id=${s.id}`,
        });
      });

      // Add to history if results found
      if (searchResults.length > 0) {
        addToHistory(query, searchResults.length);
      }

      return searchResults;
    },
    enabled: query.length >= 1,
    staleTime: 30000,
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'customer': return Users;
      case 'product': return Package;
      case 'invoice': return Receipt;
      case 'quotation': return FileText;
      case 'supplier': return Truck;
      default: return Package;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'customer': return 'عميل';
      case 'product': return 'منتج';
      case 'invoice': return 'فاتورة';
      case 'quotation': return 'عرض سعر';
      case 'supplier': return 'مورد';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'customer': return 'bg-info/10 text-info';
      case 'product': return 'bg-success/10 text-success';
      case 'invoice': return 'bg-primary/10 text-primary';
      case 'quotation': return 'bg-warning/10 text-warning';
      case 'supplier': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const filteredResults = results?.filter(r => 
    activeTab === 'all' || r.type === activeTab
  ) || [];

  const typesCounts = {
    all: results?.length || 0,
    customer: results?.filter(r => r.type === 'customer').length || 0,
    product: results?.filter(r => r.type === 'product').length || 0,
    invoice: results?.filter(r => r.type === 'invoice').length || 0,
    quotation: results?.filter(r => r.type === 'quotation').length || 0,
    supplier: results?.filter(r => r.type === 'supplier').length || 0,
  };

  const handleHistoryClick = (historyQuery: string) => {
    setQuery(historyQuery);
    setShowHistory(false);
  };

  const suggestions = getSuggestions(query);

  return (
    <div className="container max-w-4xl py-6">
      <PageHeader
        title="البحث الشامل"
        description="ابحث في العملاء، المنتجات، الفواتير، وأكثر"
        showBack
      />

      {/* Search Input */}
      <div className="relative mb-6">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="ابحث عن عميل، منتج، فاتورة..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowHistory(e.target.value.length === 0);
          }}
          onFocus={() => query.length === 0 && setShowHistory(true)}
          onBlur={() => setTimeout(() => setShowHistory(false), 200)}
          className="pr-12 pl-24 h-12 text-lg"
          autoFocus
        />
        
        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {isLoading && (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          )}
          
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setQuery('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          
          {voiceSupported && (
            <Button
              variant={isListening ? "destructive" : "ghost"}
              size="icon"
              className={cn("h-8 w-8", isListening && "voice-pulse")}
              onClick={isListening ? stopListening : startListening}
            >
              {isListening ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Voice error */}
      {voiceError && (
        <Card className="mb-4 border-destructive/50 bg-destructive/5">
          <CardContent className="py-3 text-sm text-destructive">
            {voiceError}
          </CardContent>
        </Card>
      )}

      {/* Search History Dropdown */}
      {showHistory && recentQueries.length > 0 && (
        <Card className="mb-4 animate-fade-in">
          <CardContent className="p-2">
            <div className="flex items-center justify-between px-2 py-1 mb-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                عمليات البحث الأخيرة
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={clearHistory}
              >
                <Trash2 className="h-3 w-3 ml-1" />
                مسح
              </Button>
            </div>
            <div className="space-y-1">
              {recentQueries.slice(0, 5).map((q, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-2 py-2 rounded-md hover:bg-muted cursor-pointer group"
                  onClick={() => handleHistoryClick(q)}
                >
                  <span className="text-sm truncate">{q}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromHistory(q);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {query.length >= 1 && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">
              الكل ({typesCounts.all})
            </TabsTrigger>
            <TabsTrigger value="customer">
              العملاء ({typesCounts.customer})
            </TabsTrigger>
            <TabsTrigger value="product">
              المنتجات ({typesCounts.product})
            </TabsTrigger>
            <TabsTrigger value="invoice">
              الفواتير ({typesCounts.invoice})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {filteredResults.length === 0 && !isLoading ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>لم يتم العثور على نتائج لـ "{query}"</p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[calc(100vh-380px)]">
                <div className="space-y-2">
                  {filteredResults.map((result, index) => {
                    const Icon = getIcon(result.type);
                    return (
                      <Card
                        key={`${result.type}-${result.id}`}
                        className="cursor-pointer hover:bg-accent/50 transition-colors stagger-item"
                        onClick={() => navigate(result.href)}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${getTypeColor(result.type)}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{result.title}</p>
                            {result.subtitle && (
                              <p className="text-sm text-muted-foreground truncate">
                                {result.subtitle}
                              </p>
                            )}
                          </div>
                          <Badge variant="secondary" className={getTypeColor(result.type)}>
                            {getTypeLabel(result.type)}
                          </Badge>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Empty State */}
      {query.length < 1 && !showHistory && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>ابدأ الكتابة للبحث</p>
            {voiceSupported && (
              <p className="text-xs mt-2">أو اضغط على أيقونة الميكروفون للبحث الصوتي</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
