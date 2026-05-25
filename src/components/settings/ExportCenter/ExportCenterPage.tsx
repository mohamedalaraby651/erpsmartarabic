import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, FileText, FileSpreadsheet, Database, ListChecks, RotateCcw, ExternalLink, Palette, History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PdfEngineSettings } from '@/components/settings/PdfEngineSettings';
import { BackupTab } from '@/components/settings/BackupTab';
import { SettingsExportImport } from '@/components/settings/SettingsExportImport';
import { FormatPreferencesSection } from './FormatPreferencesSection';
import { RenderProfileSection } from './RenderProfileSection';
import { AuditTimelinePanel } from './AuditTimelinePanel';
import { useExportSettings } from '@/hooks/useExportSettings';

interface JobRow {
  id: string;
  doc_type: string;
  status: string;
  created_at: string;
  file_url: string | null;
}

function statusBadge(s: string) {
  const tone =
    s === 'done'
      ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30'
      : s === 'failed'
      ? 'bg-destructive/15 text-destructive border-destructive/30'
      : s === 'running'
      ? 'bg-sky-500/15 text-sky-700 border-sky-500/30'
      : 'bg-muted text-muted-foreground';
  return <Badge variant="outline" className={tone}>{s}</Badge>;
}

export function ExportCenterPage() {
  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin';
  const { reset } = useExportSettings();
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const { data } = await supabase
          .from('pdf_export_jobs' as never)
          .select('id, doc_type, status, created_at, file_url')
          .order('created_at', { ascending: false })
          .limit(10);
        if (alive && data) setJobs(data as unknown as JobRow[]);
      } catch {
        /* table may not be visible to non-admins */
      } finally {
        if (alive) setLoadingJobs(false);
      }
    };
    load();
    const id = setInterval(load, 8000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const handleReset = () => {
    if (!window.confirm('سيتم إعادة كل إعدادات التصدير إلى الافتراضي. متابعة؟')) return;
    reset();
    toast.success('تمت إعادة إعدادات التصدير إلى الافتراضي');
  };

  const todayJobs = jobs.filter((j) => {
    const d = new Date(j.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });
  const doneCount = todayJobs.filter((j) => j.status === 'done').length;
  const successRate = todayJobs.length
    ? Math.round((doneCount / todayJobs.length) * 100)
    : 100;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Download className="h-6 w-6 text-primary" />
            مركز التصدير
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            كل ما يخصّ تصدير PDF و Excel و النسخ الاحتياطي في مكان واحد.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 ml-1" />
          إعادة للإعدادات الافتراضية
        </Button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">تصديرات اليوم</p>
          <p className="text-2xl font-bold mt-1">{todayJobs.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">معدّل النجاح</p>
          <p className="text-2xl font-bold mt-1 text-emerald-600">{successRate}%</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">قيد التنفيذ</p>
          <p className="text-2xl font-bold mt-1 text-sky-600">
            {jobs.filter((j) => j.status === 'running' || j.status === 'queued').length}
          </p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">فشل</p>
          <p className="text-2xl font-bold mt-1 text-destructive">
            {jobs.filter((j) => j.status === 'failed').length}
          </p>
        </CardContent></Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 h-auto">
          <TabsTrigger value="profile" className="gap-2 py-2.5">
            <Palette className="h-4 w-4" /> هوية المستندات
          </TabsTrigger>
          <TabsTrigger value="pdf" className="gap-2 py-2.5">
            <FileText className="h-4 w-4" /> محرك PDF
          </TabsTrigger>
          <TabsTrigger value="format" className="gap-2 py-2.5">
            <FileSpreadsheet className="h-4 w-4" /> التنسيقات
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2 py-2.5">
            <History className="h-4 w-4" /> سجل التغييرات
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="backup" className="gap-2 py-2.5">
              <Database className="h-4 w-4" /> النسخ الاحتياطي
            </TabsTrigger>
          )}
          <TabsTrigger value="jobs" className="gap-2 py-2.5">
            <ListChecks className="h-4 w-4" /> المهام
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <RenderProfileSection />
        </TabsContent>

        <TabsContent value="pdf" className="space-y-6">
          <PdfEngineSettings />
        </TabsContent>

        <TabsContent value="format" className="space-y-6">
          <FormatPreferencesSection />
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <AuditTimelinePanel />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="backup" className="space-y-6">
            <BackupTab />
            <SettingsExportImport />
          </TabsContent>
        )}

        <TabsContent value="jobs" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-2">
              <div>
                <CardTitle>آخر مهام التصدير</CardTitle>
                <CardDescription>أحدث 10 مهام خلفية لتوليد PDF.</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/dev/pdf-jobs">
                  <ExternalLink className="h-4 w-4 ml-1" />
                  اللوحة الكاملة
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {loadingJobs ? (
                <p className="text-sm text-muted-foreground text-center py-6">جارٍ التحميل...</p>
              ) : jobs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">لا توجد مهام بعد.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground border-b">
                      <tr className="text-right">
                        <th className="py-2 px-2">النوع</th>
                        <th className="py-2 px-2">الحالة</th>
                        <th className="py-2 px-2">التاريخ</th>
                        <th className="py-2 px-2">الملف</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.map((j) => (
                        <tr key={j.id} className="border-b last:border-0">
                          <td className="py-2 px-2 font-medium">{j.doc_type}</td>
                          <td className="py-2 px-2">{statusBadge(j.status)}</td>
                          <td className="py-2 px-2 text-muted-foreground" dir="ltr">
                            {new Date(j.created_at).toLocaleString('ar')}
                          </td>
                          <td className="py-2 px-2">
                            {j.file_url ? (
                              <a href={j.file_url} target="_blank" rel="noreferrer" className="text-primary underline">تحميل</a>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ExportCenterPage;
