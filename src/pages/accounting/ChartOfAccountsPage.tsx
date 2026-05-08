import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  Building2,
  Wallet,
  Scale,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import AccountFormDialog from "@/components/accounting/AccountFormDialog";

type Account = {
  id: string;
  code: string;
  name: string;
  name_en: string | null;
  account_type: string;
  parent_id: string | null;
  is_active: boolean;
  normal_balance: string;
  current_balance: number;
  description: string | null;
};

const accountTypeLabels: Record<string, string> = {
  asset: "أصول",
  liability: "خصوم",
  equity: "حقوق ملكية",
  revenue: "إيرادات",
  expense: "مصروفات",
};

const accountTypeColors: Record<string, string> = {
  asset: "bg-blue-100 text-blue-700",
  liability: "bg-red-100 text-red-700",
  equity: "bg-purple-100 text-purple-700",
  revenue: "bg-green-100 text-green-700",
  expense: "bg-orange-100 text-orange-700",
};

const accountTypeIcons: Record<string, React.ReactNode> = {
  asset: <Building2 className="h-4 w-4" />,
  liability: <Wallet className="h-4 w-4" />,
  equity: <Scale className="h-4 w-4" />,
  revenue: <TrendingUp className="h-4 w-4" />,
  expense: <TrendingDown className="h-4 w-4" />,
};

const ChartOfAccountsPage = () => {
  const { toast } = useToast();
  const { userRole } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());

  const canManage = userRole === "admin" || userRole === "accountant";

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["chart-of-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chart_of_accounts")
        .select("*")
        .order("code");
      if (error) throw error;
      return data as Account[];
    },
  });

  // Build tree structure
  const buildTree = (items: Account[], parentId: string | null = null): Account[] => {
    return items
      .filter((item) => item.parent_id === parentId)
      .map((item) => ({
        ...item,
        children: buildTree(items, item.id),
      }));
  };

  const filteredAccounts = accounts.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.code.includes(searchQuery) ||
      (a.name_en && a.name_en.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const rootAccounts = filteredAccounts.filter((a) => !a.parent_id);

  const getChildren = (parentId: string) =>
    filteredAccounts.filter((a) => a.parent_id === parentId);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedAccounts(newExpanded);
  };

  const handleAdd = (parentId?: string) => {
    if (parentId) {
      const parent = accounts.find((a) => a.id === parentId);
      setSelectedAccount({ parent_id: parentId, account_type: parent?.account_type } as Partial<Account> as Account);
    } else {
      setSelectedAccount(null);
    }
    setDialogOpen(true);
  };

  const handleEdit = (account: Account) => {
    setSelectedAccount(account);
    setDialogOpen(true);
  };

  // Stats
  const stats = {
    total: accounts.length,
    assets: accounts.filter((a) => a.account_type === "asset").length,
    liabilities: accounts.filter((a) => a.account_type === "liability").length,
    revenue: accounts.filter((a) => a.account_type === "revenue").length,
    expenses: accounts.filter((a) => a.account_type === "expense").length,
  };

  const renderAccountRow = (account: Account, level: number = 0): JSX.Element => {
    const children = getChildren(account.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedAccounts.has(account.id);

    return (
      <>
        <TableRow
          key={account.id}
          className="cursor-pointer hover:bg-muted/50"
          onClick={() => hasChildren && toggleExpand(account.id)}
        >
          <TableCell>
            <div className="flex items-center gap-2" style={{ paddingRight: `${level * 24}px` }}>
              {hasChildren ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(account.id);
                  }}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              ) : (
                <div className="w-6" />
              )}
              <span className="font-mono font-bold">{account.code}</span>
            </div>
          </TableCell>
          <TableCell>
            <div className="flex flex-col">
              <span className="font-medium">{account.name}</span>
              {account.name_en && (
                <span className="text-xs text-muted-foreground">{account.name_en}</span>
              )}
            </div>
          </TableCell>
          <TableCell>
            <Badge className={accountTypeColors[account.account_type]}>
              <span className="flex items-center gap-1">
                {accountTypeIcons[account.account_type]}
                {accountTypeLabels[account.account_type]}
              </span>
            </Badge>
          </TableCell>
          <TableCell>
            <Badge variant={account.normal_balance === "debit" ? "outline" : "secondary"}>
              {account.normal_balance === "debit" ? "مدين" : "دائن"}
            </Badge>
          </TableCell>
          <TableCell
            className={`font-mono ${
              account.current_balance < 0 ? "text-destructive" : ""
            }`}
          >
            {Number(account.current_balance).toLocaleString()} ج.م
          </TableCell>
          <TableCell>
            <Badge variant={account.is_active ? "default" : "secondary"}>
              {account.is_active ? "نشط" : "معطل"}
            </Badge>
          </TableCell>
          <TableCell>
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              {canManage && (
                <>
                  <Button variant="ghost" size="sm" onClick={() => handleAdd(account.id)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(account)}>
                    تعديل
                  </Button>
                </>
              )}
            </div>
          </TableCell>
        </TableRow>
        {isExpanded && children.map((child) => renderAccountRow(child, level + 1))}
      </>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">شجرة الحسابات</h1>
          <p className="text-muted-foreground">إدارة دليل الحسابات المحاسبي</p>
        </div>
        {canManage && (
          <Button onClick={() => handleAdd()}>
            <Plus className="h-4 w-4 ml-2" />
            حساب جديد
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">إجمالي الحسابات</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.assets}</p>
                <p className="text-sm text-muted-foreground">أصول</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <Wallet className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.liabilities}</p>
                <p className="text-sm text-muted-foreground">خصوم</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.revenue}</p>
                <p className="text-sm text-muted-foreground">إيرادات</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100">
                <TrendingDown className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.expenses}</p>
                <p className="text-sm text-muted-foreground">مصروفات</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالكود أو الاسم..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة الحسابات</CardTitle>
          <CardDescription>
            اضغط على السهم لعرض الحسابات الفرعية
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">الكود</TableHead>
                  <TableHead>اسم الحساب</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>الطبيعة</TableHead>
                  <TableHead>الرصيد</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="w-24">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rootAccounts.map((account) => renderAccountRow(account))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AccountFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        account={selectedAccount}
        accounts={accounts}
      />
    </div>
  );
};

export default ChartOfAccountsPage;
