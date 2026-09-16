#!/usr/bin/env node
/**
 * Operational Product Audit (Phase 2 — Product Continuity track)
 *
 * Measurement-only. Scans the LIVE source tree of this repository and produces an
 * operational matrix of what the user can actually do, plus a P0..P3 classified backlog.
 *
 * No source mutation. Outputs:
 *   scripts/audits/output/operational-product-audit.json
 *   scripts/audits/output/operational-product-matrix.csv
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const OUT_DIR = path.join(ROOT, 'scripts/audits/output');

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', '__snapshots__'].includes(e.name)) continue;
      walk(p, acc);
    } else if (/\.(tsx|ts)$/.test(e.name) && !/\.(test|spec)\.tsx?$/.test(e.name)) {
      acc.push(p);
    }
  }
  return acc;
}

const files = walk(SRC);
const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/');

// ── Routes ───────────────────────────────────────────────────────────────────
const appSrc = fs.readFileSync(path.join(SRC, 'App.tsx'), 'utf8');
const routes = [];
const routeRe = /<Route\s+([^>]*?)\/?>/gs;
let m;
while ((m = routeRe.exec(appSrc))) {
  const attrs = m[1];
  const pathM = /path=\{?"([^"]+)"\}?/.exec(attrs);
  const elemM = /element=\{<\s*([A-Za-z0-9_]+)/.exec(attrs);
  if (!pathM && !elemM) continue;
  routes.push({ path: pathM ? pathM[1] : '(index)', element: elemM ? elemM[1] : null });
}
const guardedCount = (appSrc.match(/<RoleGuard/g) || []).length;

// ── Per-file operational signals ─────────────────────────────────────────────
const PATTERNS = {
  // A Button with no onClick, no type=submit, no asChild and no form binding is a candidate dead action.
  buttonTotal: /<Button[\s>]/g,
  buttonWired: /<Button(?=[^>]*(onClick|asChild|type="submit"|type='submit'|form=))/g,
  todo: /(?:\/\/|\/\*|\{\s*\/\*)\s*(TODO|FIXME|HACK|XXX)\b/g,
  notImplemented: /(not implemented|notImplemented|coming soon|قريبًا|قريباً|قيد التطوير|غير متاح حالي)/gi,
  emptyHandler: /on[A-Z]\w+=\{\s*\(\s*\)\s*=>\s*\{\s*\}\s*\}/g,
  consoleOnlyHandler: /on[A-Z]\w+=\{\s*\(\s*\)\s*=>\s*console\.\w+/g,
  directSupabase: /from ['"]@\/integrations\/supabase\/client['"]/g,
  repoImport: /from ['"]@\/lib\/repositories/g,
  rpcCall: /\.rpc\(/g,
  toastUse: /(useToast|toast\()/g,
  loadingState: /(isPending|isLoading|isSubmitting|loading)/g,
  confirmDialog: /(AlertDialog|ConfirmDialog|window\.confirm)/g,
  printSurface: /(window\.print|useReactToPrint|@media print|generatePdf|exportPdf|PdfEngine|printDocument)/gi,
  formSurface: /(useForm|handleSubmit|useFormDialog)/g,
  disabledState: /disabled=\{/g,
};

const count = (src, re) => (src.match(re) || []).length;

const fileRows = [];
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const r = rel(f);
  const row = { file: r };
  for (const [k, re] of Object.entries(PATTERNS)) row[k] = count(src, re);
  row.buttonUnwired = Math.max(0, row.buttonTotal - row.buttonWired);
  row.isPage = /^src\/pages\//.test(r);
  row.isUi = /^src\/(pages|components|ui)\//.test(r);
  fileRows.push(row);
}

const sum = (k, filter = () => true) => fileRows.filter(filter).reduce((a, b) => a + (b[k] || 0), 0);

// ── Findings ─────────────────────────────────────────────────────────────────
const findings = [];
const add = (id, severity, area, title, detail, evidence) =>
  findings.push({ id, severity, area, title, detail, evidence });

// P1: UI actions with no handler at all
const unwired = fileRows
  .filter((r) => r.isUi && r.buttonUnwired > 0)
  .sort((a, b) => b.buttonUnwired - a.buttonUnwired);
if (unwired.length) {
  add(
    'OPA-ACT-001', 'P1', 'actions',
    'أزرار بلا معالج مباشر تحتاج تحققًا يدويًا',
    'أزرار لا تحمل onClick/asChild/type=submit/form — بعضها مشروع (داخل نموذج) والبعض قد يكون إجراءً معطلًا.',
    { totalCandidates: sum('buttonUnwired', (r) => r.isUi), topFiles: unwired.slice(0, 25).map((r) => ({ file: r.file, count: r.buttonUnwired })) }
  );
}

// P1: empty / console-only handlers → action visibly does nothing
const dead = fileRows.filter((r) => r.emptyHandler + r.consoleOnlyHandler > 0);
if (dead.length) {
  add(
    'OPA-ACT-002', 'P1', 'actions',
    'معالجات فارغة أو تكتب في console فقط',
    'الزر يستجيب ظاهريًا لكنه لا ينفّذ أي عملية أعمال.',
    { files: dead.map((r) => ({ file: r.file, empty: r.emptyHandler, consoleOnly: r.consoleOnlyHandler })) }
  );
}

// P1/P2: declared-unavailable features
const notImpl = fileRows.filter((r) => r.notImplemented > 0);
if (notImpl.length) {
  add(
    'OPA-GAP-001', 'P1', 'workflow',
    'وظائف معلنة كغير متاحة / قيد التطوير داخل الواجهة',
    'نصوص "قريبًا"/"not implemented" تعني طريقًا مسدودًا محتملًا في رحلة المستخدم.',
    { files: notImpl.map((r) => ({ file: r.file, hits: r.notImplemented })) }
  );
}

// P2: TODO markers
const todos = fileRows.filter((r) => r.todo > 0);
add('OPA-GAP-002', 'P2', 'workflow', 'علامات TODO/FIXME في الشيفرة النشطة',
  'تحتاج فرزًا: بعضها نواقص تشغيلية وبعضها ملاحظات.',
  { total: sum('todo'), files: todos.slice(0, 40).map((r) => ({ file: r.file, count: r.todo })) });

// P3: architecture debt — direct DB access from UI
const uiDirect = fileRows.filter((r) => r.isUi && r.directSupabase > 0);
add('OPA-ARC-001', 'P3', 'architecture', 'وصول مباشر لقاعدة البيانات من طبقة الواجهة',
  'دين معماري (نطاق F2 غير المصرّح به) — يُعالج أثناء تعديل الميزة نفسها، لا كحملة منفصلة.',
  { files: uiDirect.length, callSites: sum('directSupabase', (r) => r.isUi), list: uiDirect.map((r) => r.file) });

// Printing surface
const printFiles = fileRows.filter((r) => r.printSurface > 0);
add('OPA-PRN-001', 'P2', 'printing', 'سطح الطباعة/التصدير الحالي',
  'حصر الملفات التي تنتج مستندات مطبوعة أو PDF لتقييم تطابقها مع حالة العمل.',
  { files: printFiles.map((r) => r.file) });

// Backup surface
const backupFiles = files.filter((f) => /backup|restore|export/i.test(rel(f))).map(rel);
add('OPA-BAK-001', backupFiles.length ? 'P2' : 'P1', 'backup', 'سطح النسخ الاحتياطي والاسترجاع',
  'لا يكفي اعتماد نسخ المزوّد: نحتاج إجراء استرجاع موثّقًا ومُثبتًا.',
  { files: backupFiles });

// Feedback quality on pages
const pagesNoToast = fileRows.filter((r) => r.isPage && r.formSurface > 0 && r.toastUse === 0);
if (pagesNoToast.length) {
  add('OPA-UX-001', 'P2', 'ux', 'شاشات بها نماذج بلا رسائل نجاح/خطأ ظاهرة',
    'المستخدم لا يعرف هل نجحت العملية.',
    { files: pagesNoToast.map((r) => r.file) });
}
const pagesNoLoading = fileRows.filter((r) => r.isPage && r.formSurface > 0 && r.loadingState === 0);
if (pagesNoLoading.length) {
  add('OPA-UX-002', 'P2', 'ux', 'شاشات بها نماذج بلا حالة تحميل',
    'خطر الإرسال المزدوج وغياب التغذية الراجعة أثناء الحفظ.',
    { files: pagesNoLoading.map((r) => r.file) });
}

// ── Journey coverage ─────────────────────────────────────────────────────────
const JOURNEYS = {
  sales: ['customers', 'products', 'quotations', 'sales-orders', 'invoices', 'payments', 'reports'],
  purchasing: ['suppliers', 'purchase-orders', 'goods-receipts', 'purchase-invoices', 'supplier'],
  inventory: ['products', 'inventory', 'warehouses', 'stock'],
  accounting: ['accounting', 'journals', 'chart-of-accounts', 'expenses'],
  hr: ['employees', 'attendance', 'leave'],
};
const routePaths = routes.map((r) => r.path);
const journeys = {};
for (const [name, steps] of Object.entries(JOURNEYS)) {
  journeys[name] = steps.map((s) => ({
    step: s,
    route: routePaths.find((p) => p.includes(s)) || null,
    pageFiles: fileRows.filter((r) => r.isPage && r.file.includes(s)).length,
  }));
}

const report = {
  id: 'OPA-NAZRA-001',
  generatedAt: new Date().toISOString(),
  mode: 'measurement-only',
  totals: {
    files: fileRows.length,
    pages: fileRows.filter((r) => r.isPage).length,
    routes: routes.length,
    guardedRouteWrappers: guardedCount,
    buttons: sum('buttonTotal', (r) => r.isUi),
    buttonsWired: sum('buttonWired', (r) => r.isUi),
    buttonsUnwiredCandidates: sum('buttonUnwired', (r) => r.isUi),
    formsSurface: sum('formSurface'),
    confirmDialogs: sum('confirmDialog'),
    printSurfaces: sum('printSurface'),
    rpcCalls: sum('rpcCall'),
    repositoryImports: sum('repoImport'),
    uiDirectDbFiles: uiDirect.length,
  },
  routes,
  journeys,
  findings,
  bySeverity: findings.reduce((a, f) => ((a[f.severity] = (a[f.severity] || 0) + 1), a), {}),
};

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'operational-product-audit.json'), JSON.stringify(report, null, 2));

const csv = ['file,isPage,buttons,buttonsWired,buttonsUnwired,emptyHandlers,notImplemented,todo,forms,loadingState,toast,confirm,print,directDb,repoImports,rpc']
  .concat(
    fileRows
      .filter((r) => r.isUi && (r.buttonTotal || r.formSurface || r.printSurface))
      .map((r) => [r.file, r.isPage, r.buttonTotal, r.buttonWired, r.buttonUnwired, r.emptyHandler + r.consoleOnlyHandler, r.notImplemented, r.todo, r.formSurface, r.loadingState, r.toastUse, r.confirmDialog, r.printSurface, r.directSupabase, r.repoImport, r.rpcCall].join(','))
  )
  .join('\n');
fs.writeFileSync(path.join(OUT_DIR, 'operational-product-matrix.csv'), csv);

console.log(`[operational-audit] routes=${routes.length} pages=${report.totals.pages} findings=${findings.length} severities=${JSON.stringify(report.bySeverity)}`);
console.log(`[operational-audit] → scripts/audits/output/operational-product-audit.json`);
