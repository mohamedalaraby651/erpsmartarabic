import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Tag, Trash2, Edit, Loader2, Package } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';

interface PriceList {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
}

interface PriceListItem {
  id: string;
  price_list_id: string;
  product_id: string;
  price: number;
  min_quantity: number;
  discount_percentage: number;
  products?: { name: string; selling_price: number | null; sku: string | null } | null;
}

const PriceListsPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [itemsOpen, setItemsOpen] = useState(false);
  const [editingList, setEditingList] = useState<PriceList | null>(null);
  const [selectedList, setSelectedList] = useState<PriceList | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  // Item form
  const [productId, setProductId] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [minQty, setMinQty] = useState('1');
  const [discountPct, setDiscountPct] = useState('0');

  const { data: priceLists = [], isLoading } = useQuery({
    queryKey: ['price-lists'],
    queryFn: async () => {
      const { data } = await supabase.from('price_lists').select('*').order('is_default', { ascending: false }).order('name');
      return (data || []) as PriceList[];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products-for-pricing'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('id, name, selling_price, sku').eq('is_active', true).order('name');
      return data || [];
    },
  });

  const { data: listItems = [], refetch: refetchItems } = useQuery({
    queryKey: ['price-list-items', selectedList?.id],
    queryFn: async () => {
      if (!selectedList) return [];
      const { data } = await supabase
        .from('price_list_items')
        .select('*, products(name, selling_price, sku)')
        .eq('price_list_id', selectedList.id)
        .order('created_at');
      return (data || []) as unknown as PriceListItem[];
    },
    enabled: !!selectedList,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: tenantData } = await supabase.rpc('get_current_tenant');
      const payload = { name, description: description || null, is_default: isDefault, tenant_id: tenantData };
      if (editingList) {
        const { error } = await supabase.from('price_lists').update(payload).eq('id', editingList.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('price_lists').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: editingList ? 'تم تحديث قائمة الأسعار' : 'تم إنشاء قائمة الأسعار' });
      queryClient.invalidateQueries({ queryKey: ['price-lists'] });
      closeForm();
    },
    onError: () => toast({ title: 'خطأ في الحفظ', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('price_lists').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'تم حذف قائمة الأسعار' });
      queryClient.invalidateQueries({ queryKey: ['price-lists'] });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async () => {
      if (!selectedList) return;
      const { data: tenantData } = await supabase.rpc('get_current_tenant');
      const { error } = await supabase.from('price_list_items').insert({
        price_list_id: selectedList.id,
        product_id: productId,
        price: parseFloat(itemPrice),
        min_quantity: parseInt(minQty) || 1,
        discount_percentage: parseFloat(discountPct) || 0,
        tenant_id: tenantData,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'تم إضافة المنتج للقائمة' });
      refetchItems();
      setProductId(''); setItemPrice(''); setMinQty('1'); setDiscountPct('0');
    },
    onError: () => toast({ title: 'خطأ - ربما المنتج مضاف مسبقاً', variant: 'destructive' }),
  });

  const removeItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('price_list_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: 'تم حذف المنتج من القائمة' }); refetchItems(); },
  });

  const openForm = (list?: PriceList) => {
    if (list) { setEditingList(list); setName(list.name); setDescription(list.description || ''); setIsDefault(list.is_default); }
    else { setEditingList(null); setName(''); setDescription(''); setIsDefault(false); }
    setFormOpen(true);
  };

  const closeForm = () => { setFormOpen(false); setEditingList(null); setName(''); setDescription(''); setIsDefault(false); };

  const openItems = (list: PriceList) => { setSelectedList(list); setItemsOpen(true); };

  const selectedProduct = products.find(p => p.id === productId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">قوائم الأسعار</h1>
          <p className="text-muted-foreground">إدارة مستويات التسعير المتعددة (جملة، تجزئة، موزع)</p>
        </div>
        <Button onClick={() => openForm()}><Plus className="h-4 w-4 ml-2" /> قائمة جديدة</Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>
      ) : priceLists.length === 0 ? (
        <EmptyState icon={Tag} title="لا توجد قوائم أسعار" description="أنشئ قائمة أسعار لتعيين أسعار مختلفة لفئات العملاء"
          action={{ label: 'إنشاء قائمة', onClick: () => openForm(), icon: Plus }} />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {priceLists.map(list => (
            <Card key={list.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Tag className="h-5 w-5 text-primary" />
                    {list.name}
                  </CardTitle>
                  <div className="flex gap-1">
                    {list.is_default && <Badge>افتراضية</Badge>}
                    <Badge variant={list.is_active ? 'default' : 'secondary'}>{list.is_active ? 'نشطة' : 'غير نشطة'}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {list.description && <p className="text-sm text-muted-foreground mb-4">{list.description}</p>}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openItems(list)}>
                    <Package className="h-3 w-3 ml-1" /> المنتجات
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openForm(list)}>
                    <Edit className="h-3 w-3" />
                  </Button>
                  {!list.is_default && (
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(list.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingList ? 'تعديل قائمة الأسعار' : 'قائمة أسعار جديدة'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>اسم القائمة *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="مثال: سعر الجملة" /></div>
            <div><Label>الوصف</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="وصف القائمة..." rows={2} /></div>
            <div className="flex items-center justify-between">
              <Label>قائمة افتراضية</Label>
              <Switch checked={isDefault} onCheckedChange={setIsDefault} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>إلغاء</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!name || saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
              {editingList ? 'تحديث' : 'إنشاء'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Items Dialog */}
      <Dialog open={itemsOpen} onOpenChange={setItemsOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader><DialogTitle>منتجات قائمة: {selectedList?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Add item form */}
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
                  <div className="col-span-2">
                    <Label>المنتج</Label>
                    <Select value={productId} onValueChange={v => { setProductId(v); const p = products.find(x => x.id === v); if (p) setItemPrice(String(p.selling_price || 0)); }}>
                      <SelectTrigger><SelectValue placeholder="اختر منتج" /></SelectTrigger>
                      <SelectContent>
                        {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ''}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>السعر</Label><Input type="number" value={itemPrice} onChange={e => setItemPrice(e.target.value)} /></div>
                  <div><Label>الحد الأدنى</Label><Input type="number" value={minQty} onChange={e => setMinQty(e.target.value)} min={1} /></div>
                  <Button onClick={() => addItemMutation.mutate()} disabled={!productId || !itemPrice || addItemMutation.isPending}>
                    <Plus className="h-4 w-4 ml-1" /> إضافة
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Items table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المنتج</TableHead>
                  <TableHead>السعر الأصلي</TableHead>
                  <TableHead>سعر القائمة</TableHead>
                  <TableHead>الحد الأدنى</TableHead>
                  <TableHead>الخصم %</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listItems.map(item => {
                  const prod = item.products as { name: string; selling_price: number | null; sku: string | null } | null;
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{prod?.name}</TableCell>
                      <TableCell className="text-muted-foreground">{Number(prod?.selling_price || 0).toLocaleString()}</TableCell>
                      <TableCell className="font-bold text-primary">{Number(item.price).toLocaleString()}</TableCell>
                      <TableCell>{item.min_quantity}</TableCell>
                      <TableCell>{Number(item.discount_percentage)}%</TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeItemMutation.mutate(item.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {listItems.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">لا توجد منتجات في هذه القائمة</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PriceListsPage;
