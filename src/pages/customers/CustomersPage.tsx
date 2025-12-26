import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Users, Building2, Crown, Eye, Filter, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CustomerFormDialog from "@/components/customers/CustomerFormDialog";
import { ExportWithTemplateButton } from "@/components/export/ExportWithTemplateButton";
import type { Database } from "@/integrations/supabase/types";

type Customer = Database['public']['Tables']['customers']['Row'];
type CustomerCategory = Database['public']['Tables']['customer_categories']['Row'];

const vipColors = {
  regular: "bg-muted text-muted-foreground",
  silver: "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200",
  gold: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  platinum: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

const vipLabels = {
  regular: "عادي",
  silver: "فضي",
  gold: "ذهبي",
  platinum: "بلاتيني",
};

const CustomersPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [vipFilter, setVipFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers', searchQuery, typeFilter, vipFilter],
    queryFn: async () => {
      let query = supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }
      if (typeFilter !== 'all') {
        query = query.eq('customer_type', typeFilter as 'individual' | 'company' | 'farm');
      }
      if (vipFilter !== 'all') {
        query = query.eq('vip_level', vipFilter as 'regular' | 'silver' | 'gold' | 'platinum');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Customer[];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['customer-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as CustomerCategory[];
    },
  });

  const stats = {
    total: customers.length,
    individuals: customers.filter(c => c.customer_type === 'individual').length,
    companies: customers.filter(c => c.customer_type === 'company').length,
    vip: customers.filter(c => c.vip_level !== 'regular').length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">إدارة العملاء</h1>
          <p className="text-muted-foreground">إدارة بيانات العملاء والتصنيفات</p>
        </div>
        <div className="flex gap-2">
          <ExportWithTemplateButton
            section="customers"
            sectionLabel="العملاء"
            data={customers}
            columns={[
              { key: 'name', label: 'الاسم' },
              { key: 'phone', label: 'الهاتف' },
              { key: 'email', label: 'البريد الإلكتروني' },
              { key: 'customer_type', label: 'النوع' },
              { key: 'vip_level', label: 'مستوى VIP' },
              { key: 'current_balance', label: 'الرصيد' },
              { key: 'credit_limit', label: 'حد الائتمان' },
            ]}
          />
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 ml-2" />
            إضافة عميل
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">إجمالي العملاء</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <Users className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.individuals}</p>
                <p className="text-sm text-muted-foreground">أفراد</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary">
                <Building2 className="h-5 w-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.companies}</p>
                <p className="text-sm text-muted-foreground">شركات</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Crown className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.vip}</p>
                <p className="text-sm text-muted-foreground">عملاء VIP</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم أو الهاتف أو البريد..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="نوع العميل" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="individual">فرد</SelectItem>
                <SelectItem value="company">شركة</SelectItem>
              </SelectContent>
            </Select>
            <Select value={vipFilter} onValueChange={setVipFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="مستوى VIP" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="regular">عادي</SelectItem>
                <SelectItem value="silver">فضي</SelectItem>
                <SelectItem value="gold">ذهبي</SelectItem>
                <SelectItem value="platinum">بلاتيني</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة العملاء</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">لا يوجد عملاء</p>
              <Button variant="link" onClick={() => setDialogOpen(true)}>
                إضافة عميل جديد
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الاسم</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>الهاتف</TableHead>
                    <TableHead>مستوى VIP</TableHead>
                    <TableHead>الرصيد</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="text-left">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          {customer.email && (
                            <p className="text-sm text-muted-foreground">{customer.email}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {customer.customer_type === 'company' ? (
                            <><Building2 className="h-3 w-3 ml-1" /> شركة</>
                          ) : (
                            <><Users className="h-3 w-3 ml-1" /> فرد</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>{customer.phone || '-'}</TableCell>
                      <TableCell>
                        <Badge className={vipColors[customer.vip_level as keyof typeof vipColors]}>
                          <Crown className="h-3 w-3 ml-1" />
                          {vipLabels[customer.vip_level as keyof typeof vipLabels]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={Number(customer.current_balance) > 0 ? 'text-destructive' : 'text-success'}>
                          {Number(customer.current_balance).toLocaleString()} ج.م
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={customer.is_active ? "default" : "secondary"}>
                          {customer.is_active ? "نشط" : "غير نشط"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/customers/${customer.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Customer Dialog */}
      <CustomerFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
};

export default CustomersPage;
