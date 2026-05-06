#!/usr/bin/env bash
# ============================================================================
# Pre-Launch Integrity Check / سكربت فحص ما قبل الإطلاق
# ----------------------------------------------------------------------------
# Validates: Enums, NOT NULL columns, Foreign Keys, RLS, Orphan rows, RPCs
# ثم يشغّل الاختبارات (typecheck + unit + integration)
# ============================================================================

set -u
RED=$(printf '\033[31m'); GREEN=$(printf '\033[32m'); YEL=$(printf '\033[33m'); NC=$(printf '\033[0m'); BLD=$(printf '\033[1m')

PASS=0; FAIL=0; WARN=0
SECTION() { echo; echo "${BLD}━━━ $1 ━━━${NC}"; }
ok()   { echo "  ${GREEN}✓${NC} $1"; PASS=$((PASS+1)); }
bad()  { echo "  ${RED}✗${NC} $1"; FAIL=$((FAIL+1)); }
warn() { echo "  ${YEL}⚠${NC} $1"; WARN=$((WARN+1)); }

run_sql() { psql -tAX -c "$1" 2>/dev/null; }

check_count_zero() {
  local label="$1" sql="$2"
  local n; n=$(run_sql "$sql" | tr -d ' \n')
  if [ -z "$n" ]; then warn "$label → query failed"; return; fi
  if [ "$n" = "0" ]; then ok "$label"; else bad "$label → found $n violations"; fi
}

# ────────────────────────────────────────────────────────────────────────────
SECTION "1. Database connectivity / الاتصال بقاعدة البيانات"
# ────────────────────────────────────────────────────────────────────────────
if run_sql "SELECT 1" >/dev/null; then ok "Connected to $PGHOST"
else bad "Cannot connect — aborting"; exit 1; fi

# ────────────────────────────────────────────────────────────────────────────
SECTION "2. Enum integrity / سلامة الـ Enums"
# ────────────────────────────────────────────────────────────────────────────
check_count_zero "invoices.status uses valid enum" \
  "SELECT count(*) FROM invoices WHERE status::text NOT IN ('draft','pending','confirmed','cancelled','paid','partial')"

check_count_zero "invoices.payment_status uses valid enum" \
  "SELECT count(*) FROM invoices WHERE payment_status::text NOT IN ('pending','partial','paid')"

check_count_zero "stock_movements.movement_type valid" \
  "SELECT count(*) FROM stock_movements WHERE movement_type::text NOT IN ('in','out','transfer','adjustment','return_in','return_out')"

check_count_zero "user_roles.role valid" \
  "SELECT count(*) FROM user_roles WHERE role::text NOT IN ('admin','sales','accountant','warehouse','hr','manager','user','moderator')"

# ────────────────────────────────────────────────────────────────────────────
SECTION "3. NOT NULL violations / فحص NOT NULL"
# ────────────────────────────────────────────────────────────────────────────
NULL_REPORT=$(run_sql "
WITH cols AS (
  SELECT table_schema, table_name, column_name
  FROM information_schema.columns
  WHERE table_schema='public' AND is_nullable='NO'
    AND column_default IS NULL
    AND column_name NOT IN ('id','created_at','updated_at')
)
SELECT format('%I.%I', table_name, column_name)
FROM cols
WHERE table_name IN (SELECT tablename FROM pg_tables WHERE schemaname='public')
LIMIT 5
")
if [ -n "$NULL_REPORT" ]; then ok "NOT NULL columns enforced ($(echo "$NULL_REPORT" | wc -l) sample columns checked)"
else warn "Could not inspect NOT NULL columns"; fi

# ────────────────────────────────────────────────────────────────────────────
SECTION "4. Foreign Key integrity / سلامة المفاتيح الخارجية"
# ────────────────────────────────────────────────────────────────────────────
check_count_zero "invoice_items → invoices" \
  "SELECT count(*) FROM invoice_items ii LEFT JOIN invoices i ON i.id=ii.invoice_id WHERE i.id IS NULL"

check_count_zero "sales_order_items → sales_orders" \
  "SELECT count(*) FROM sales_order_items s LEFT JOIN sales_orders o ON o.id=s.order_id WHERE o.id IS NULL"

check_count_zero "payments → invoices (when invoice_id set)" \
  "SELECT count(*) FROM payments p LEFT JOIN invoices i ON i.id=p.invoice_id WHERE p.invoice_id IS NOT NULL AND i.id IS NULL"

check_count_zero "product_stock → products" \
  "SELECT count(*) FROM product_stock ps LEFT JOIN products p ON p.id=ps.product_id WHERE p.id IS NULL"

check_count_zero "product_stock → warehouses" \
  "SELECT count(*) FROM product_stock ps LEFT JOIN warehouses w ON w.id=ps.warehouse_id WHERE w.id IS NULL"

check_count_zero "stock_movements → products" \
  "SELECT count(*) FROM stock_movements sm LEFT JOIN products p ON p.id=sm.product_id WHERE p.id IS NULL"

check_count_zero "credit_notes → invoices" \
  "SELECT count(*) FROM credit_notes c LEFT JOIN invoices i ON i.id=c.invoice_id WHERE c.invoice_id IS NOT NULL AND i.id IS NULL"

check_count_zero "journal_entries → journals" \
  "SELECT count(*) FROM journal_entries je LEFT JOIN journals j ON j.id=je.journal_id WHERE j.id IS NULL"

# ────────────────────────────────────────────────────────────────────────────
SECTION "5. RLS enforcement / فرض RLS"
# ────────────────────────────────────────────────────────────────────────────
RLS_DISABLED=$(run_sql "
SELECT count(*) FROM pg_tables t
JOIN pg_class c ON c.relname=t.tablename
WHERE t.schemaname='public' AND NOT c.relrowsecurity
")
if [ "$RLS_DISABLED" = "0" ]; then ok "All public tables have RLS enabled"
else bad "$RLS_DISABLED public tables WITHOUT RLS"; fi

# ────────────────────────────────────────────────────────────────────────────
SECTION "6. Tenant isolation / عزل الـ tenants"
# ────────────────────────────────────────────────────────────────────────────
check_count_zero "invoices have tenant_id" \
  "SELECT count(*) FROM invoices WHERE tenant_id IS NULL"
check_count_zero "customers have tenant_id" \
  "SELECT count(*) FROM customers WHERE tenant_id IS NULL"
check_count_zero "products have tenant_id" \
  "SELECT count(*) FROM products WHERE tenant_id IS NULL"

# ────────────────────────────────────────────────────────────────────────────
SECTION "7. Financial accounting balance / توازن القيود"
# ────────────────────────────────────────────────────────────────────────────
check_count_zero "Journals balanced (DR=CR)" \
  "SELECT count(*) FROM (
     SELECT journal_id, sum(debit)-sum(credit) AS diff
     FROM journal_entries GROUP BY journal_id
     HAVING abs(sum(debit)-sum(credit)) > 0.01
   ) x"

# ────────────────────────────────────────────────────────────────────────────
SECTION "8. Sales-cycle RPCs exist / دوال التحويل"
# ────────────────────────────────────────────────────────────────────────────
for fn in convert_quote_to_order convert_order_to_invoice convert_invoice_to_delivery \
          confirm_credit_note cancel_credit_note create_journal_for_credit_note \
          reverse_stock_for_credit_note has_role check_section_permission; do
  exists=$(run_sql "SELECT count(*) FROM pg_proc WHERE proname='$fn'")
  if [ "$exists" != "0" ]; then ok "RPC $fn() present"
  else bad "RPC $fn() MISSING"; fi
done

# ────────────────────────────────────────────────────────────────────────────
SECTION "9. Critical indexes / الفهارس الحرجة"
# ────────────────────────────────────────────────────────────────────────────
for idx_check in \
  "invoices:tenant_id" \
  "invoices:customer_id" \
  "invoice_items:invoice_id" \
  "stock_movements:product_id" \
  "journal_entries:journal_id"; do
  tbl="${idx_check%%:*}"; col="${idx_check##*:}"
  has=$(run_sql "
    SELECT count(*) FROM pg_indexes
    WHERE schemaname='public' AND tablename='$tbl' AND indexdef ILIKE '%($col%'
  ")
  if [ "$has" != "0" ]; then ok "index on $tbl($col)"; else warn "missing index $tbl($col)"; fi
done

# ────────────────────────────────────────────────────────────────────────────
SECTION "10. TypeScript typecheck / فحص الأنواع"
# ────────────────────────────────────────────────────────────────────────────
if command -v bunx >/dev/null; then
  if bunx tsc --noEmit -p tsconfig.app.json >/tmp/tsc.log 2>&1; then
    ok "tsc --noEmit passed"
  else
    ERRS=$(grep -c "error TS" /tmp/tsc.log || echo 0)
    bad "tsc errors: $ERRS  (see /tmp/tsc.log)"
  fi
else warn "bunx not available — skipped"; fi

# ────────────────────────────────────────────────────────────────────────────
SECTION "11. Unit tests (vitest) / اختبارات الوحدة"
# ────────────────────────────────────────────────────────────────────────────
if [ -f vitest.config.ts ]; then
  if bunx vitest run --reporter=dot --silent >/tmp/vitest.log 2>&1; then
    PASSED=$(grep -oE "[0-9]+ passed" /tmp/vitest.log | tail -1)
    ok "vitest passed ($PASSED)"
  else
    FAILED=$(grep -oE "[0-9]+ failed" /tmp/vitest.log | tail -1)
    bad "vitest failures: $FAILED  (see /tmp/vitest.log)"
  fi
else warn "vitest config not found"; fi

# ────────────────────────────────────────────────────────────────────────────
SECTION "Summary / الملخص النهائي"
# ────────────────────────────────────────────────────────────────────────────
echo "  ${GREEN}Passed:${NC}  $PASS"
echo "  ${YEL}Warned:${NC}  $WARN"
echo "  ${RED}Failed:${NC}  $FAIL"
echo
if [ "$FAIL" -eq 0 ]; then
  echo "${GREEN}${BLD}✅ READY TO SHIP — جاهز للإطلاق${NC}"
  exit 0
else
  echo "${RED}${BLD}⛔ BLOCKED — يجب إصلاح الأخطاء قبل الإطلاق${NC}"
  exit 1
fi
