/**
 * نصوص واجهة المستخدم الموحّدة (تلميحات + aria-label + تسميات الإجراءات).
 *
 * قواعد الصياغة المعتمدة عبر النظام:
 * - تبدأ الصيغة بمصدر فعل (إنشاء، طباعة، تعديل، عرض، تسجيل، إرسال، تصدير،
 *   التبديل، تكبير، تصغير) متبوعاً بالمفعول/الموضوع.
 * - لا نستخدم صيغة الأمر المباشر («اطبع»، «أرسل») ولا الجمل التعريفية.
 * - أسماء الكيانات بصيغة المفرد المعرّف («الفاتورة»، «العميل»، «المورد»،
 *   «كشف الحساب»).
 * - كلمات الإنشاء تستخدم «جديد/جديدة» للتأكيد على فعل الإنشاء.
 * - أسماء التنسيقات بين قوسين: (PDF)، (Excel).
 * - تسميات الـ regions/قوائم وصفية بصيغة الاسم («ملخص…»، «قائمة…»).
 */
export const tooltips = {
  // ── إنشاء كيانات ──
  newInvoice: 'إنشاء فاتورة جديدة',
  newCustomer: 'إنشاء عميل جديد',
  newProduct: 'إنشاء منتج جديد',
  newSalesOrder: 'إنشاء أمر بيع جديد',
  newPurchaseOrder: 'إنشاء أمر شراء جديد',
  newQuotation: 'إنشاء عرض سعر جديد',
  newCreditNote: 'إنشاء إشعار دائن',
  newPayment: 'تسجيل دفعة جديدة',
  newSupplier: 'إنشاء مورد جديد',
  newEmployee: 'إنشاء موظف جديد',
  newTask: 'إنشاء مهمة جديدة',
  newCollection: 'تسجيل تحصيل جديد',
  quickAddCustomer: 'إضافة سريعة لعميل جديد',

  // ── عرض/تفاصيل ──
  viewInvoiceDetails: 'عرض تفاصيل الفاتورة',
  viewCustomerStatement: 'عرض كشف حساب العميل',
  openLinkedInvoice: 'فتح الفاتورة المرتبطة',
  moreActions: 'إجراءات إضافية',
  moreTools: 'المزيد من الأدوات',
  moreToolsDetailed: 'المزيد من الأدوات (إضافة، استيراد، تصدير، دمج)',
  toolsMenu: 'استيراد، تصدير، كشف مكررين، ودمج',
  moreSections: 'المزيد من الأقسام',
  prevSection: 'القسم السابق',
  nextSection: 'القسم التالي',

  // ── طباعة وتصدير ──
  printInvoicePdf: 'طباعة الفاتورة (PDF)',
  printCustomerStatement: 'طباعة كشف حساب العميل',
  printSupplierStatement: 'طباعة كشف حساب المورد',
  exportCustomerExcel: 'تصدير بيانات العميل (Excel)',

  // ── تعديل ──
  editCustomer: 'تعديل بيانات العميل',
  editSupplier: 'تعديل بيانات المورد',
  uploadCustomerImage: 'تغيير صورة العميل',

  // ── تذكيرات ──
  remindOverdue: 'إرسال تذكير سداد للفاتورة',
  remindGeneric: 'إرسال تذكير للفاتورة',
  markReminderDone: 'وضع علامة كمكتمل',
  closeReminderAsDone: 'متابعة وإغلاق التذكير',
  editReminder: 'تعديل التذكير',
  reopenReminder: 'إعادة فتح التذكير',

  // ── تنقل بين السجلات ──
  prevCustomer: 'العميل السابق',
  nextCustomer: 'العميل التالي',
  prevSupplier: 'المورد السابق',
  nextSupplier: 'المورد التالي',

  // ── إعدادات لوحة التحكم ──
  toCompactView: 'التبديل إلى العرض المضغوط',
  toNormalView: 'التبديل إلى العرض العادي',
  enlargeQuickActions: 'تكبير أزرار الإجراءات السريعة',
  shrinkQuickActions: 'تصغير أزرار الإجراءات السريعة',

  // ── إجراءات قوائم/فلاتر ──
  clearActiveFilter: 'مسح الفلتر النشط',
  invoiceStatusFilter: 'فلتر حالة الفاتورة',
  quickSort: 'ترتيب سريع',
  customizeView: 'تخصيص العرض',
  focusMode: 'وضع التركيز الكامل',
  showToolbar: 'إظهار شريط الأدوات',

  // ── سجل واقتراحات ──
  eventLog: 'سجل الأحداث',
  clearEventHistory: 'مسح السجل',
  dismissAlert: 'إخفاء التنبيه',

  // ── إنشاء سريع (يستخدم اسم العنصر) ──
  quickCreate: (label: string) => `إنشاء ${label} جديد`,
} as const;

/**
 * تسميات وصفية لمناطق وقوائم (role="region" / role="list" …).
 * تُستخدم كـ aria-label للهياكل لا للأزرار.
 */
export const regions = {
  customerFinancialSummary: 'ملخص الحالة المالية',
  customerSections: 'أقسام ملف العميل',
  customerSectionsGroup: 'تنقل بين الأقسام',
  customerAlerts: 'تنبيهات العميل',
  invoicesReturnsSummary: 'ملخص الفواتير والمرتجعات',
  customerList: 'قائمة العملاء',
  loadingMore: 'جارٍ تحميل المزيد',
  loadingCustomerList: 'جارٍ تحميل قائمة العملاء',
  customerQuickActions: 'إجراءات سريعة للعميل',
  creditUsageBar: 'نسبة استخدام حد الائتمان',
} as const;

/**
 * تسميات مختصرة لأزرار الإجراءات السريعة في لوحة التحكم.
 * يُعاد استخدام نفس النص كـ aria-label وكنص ظاهر للزر.
 */
export const quickActionLabels = {
  newCustomer: 'عميل جديد',
  newProduct: 'منتج جديد',
  newQuotation: 'عرض سعر',
  newInvoice: 'فاتورة جديدة',
  newSalesOrder: 'أمر بيع',
  newPurchaseOrder: 'أمر شراء',
  newSupplier: 'مورد جديد',
  newCollection: 'تحصيل جديد',
  newEmployee: 'موظف جديد',
  newTask: 'مهمة جديدة',
} as const;
