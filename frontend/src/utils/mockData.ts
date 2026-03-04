import type {
  User, Branch, Product, BranchInventory, Transaction,
  Alert, ExcelImport, InventorySummary, AnalyticsData, ProfitReport,
} from '../types';

// ─── Demo User ────────────────────────────────────────────────────────────────
export const DEMO_USER: User = {
  id: 'user-1',
  email: 'admin@erp.com',
  name: 'Ahmed Al-Rashidi',
  nameAr: 'أحمد الراشدي',
  role: 'GENERAL_MANAGER',
  isActive: true,
  createdAt: '2025-01-01T00:00:00Z',
};

// ─── Branches ─────────────────────────────────────────────────────────────────
export const MOCK_BRANCHES: Branch[] = [
  { id: 'br-1', code: 'HQ', name: 'Head Office', nameAr: 'المركز الرئيسي', address: 'Riyadh, King Fahd Road', isMain: true, isActive: true, createdAt: '2025-01-01T00:00:00Z', _count: { users: 12, inventory: 145 } },
  { id: 'br-2', code: 'JED', name: 'Jeddah Branch', nameAr: 'فرع جدة', address: 'Jeddah, Tahlia Street', isMain: false, isActive: true, createdAt: '2025-01-15T00:00:00Z', _count: { users: 8, inventory: 98 } },
  { id: 'br-3', code: 'DAM', name: 'Dammam Branch', nameAr: 'فرع الدمام', address: 'Dammam, King Saud Street', isMain: false, isActive: true, createdAt: '2025-02-01T00:00:00Z', _count: { users: 6, inventory: 87 } },
  { id: 'br-4', code: 'MED', name: 'Medina Branch', nameAr: 'فرع المدينة', address: 'Medina, Quba Road', isMain: false, isActive: false, createdAt: '2025-03-01T00:00:00Z', _count: { users: 4, inventory: 52 } },
];

// ─── Products ─────────────────────────────────────────────────────────────────
export const MOCK_PRODUCTS: Product[] = [
  { id: 'p-1', sku: 'ELEC-001', barcode: '6291041500213', name: 'Samsung Monitor 24"', nameAr: 'شاشة سامسونج 24 بوصة', unit: 'pcs', unitAr: 'قطعة', costPrice: 850, sellPrice: 1100, reorderLevel: 5, isActive: true, createdAt: '2025-01-10T00:00:00Z', updatedAt: '2025-06-01T00:00:00Z' },
  { id: 'p-2', sku: 'ELEC-002', barcode: '6291041500214', name: 'Logitech Keyboard K400', nameAr: 'كيبورد لوجيتك K400', unit: 'pcs', unitAr: 'قطعة', costPrice: 120, sellPrice: 180, reorderLevel: 10, isActive: true, createdAt: '2025-01-10T00:00:00Z', updatedAt: '2025-06-01T00:00:00Z' },
  { id: 'p-3', sku: 'ELEC-003', barcode: '6291041500215', name: 'USB-C Hub 7-port', nameAr: 'هب USB-C سبع منافذ', unit: 'pcs', unitAr: 'قطعة', costPrice: 75, sellPrice: 120, reorderLevel: 15, isActive: true, createdAt: '2025-01-12T00:00:00Z', updatedAt: '2025-06-01T00:00:00Z' },
  { id: 'p-4', sku: 'FURN-001', barcode: '6291041500216', name: 'Office Chair Executive', nameAr: 'كرسي مكتبي تنفيذي', unit: 'pcs', unitAr: 'قطعة', costPrice: 650, sellPrice: 950, reorderLevel: 3, isActive: true, createdAt: '2025-01-15T00:00:00Z', updatedAt: '2025-06-01T00:00:00Z' },
  { id: 'p-5', sku: 'FURN-002', barcode: '6291041500217', name: 'Desk Lamp LED', nameAr: 'مصباح مكتبي LED', unit: 'pcs', unitAr: 'قطعة', costPrice: 95, sellPrice: 150, reorderLevel: 8, isActive: true, createdAt: '2025-01-15T00:00:00Z', updatedAt: '2025-06-01T00:00:00Z' },
  { id: 'p-6', sku: 'STAT-001', barcode: '6291041500218', name: 'A4 Paper Box', nameAr: 'ورق A4 كرتون', unit: 'box', unitAr: 'كرتون', costPrice: 45, sellPrice: 65, reorderLevel: 20, isActive: true, createdAt: '2025-01-20T00:00:00Z', updatedAt: '2025-06-01T00:00:00Z' },
  { id: 'p-7', sku: 'STAT-002', barcode: '6291041500219', name: 'Whiteboard Marker Set', nameAr: 'مجموعة أقلام سبورة', unit: 'set', unitAr: 'مجموعة', costPrice: 18, sellPrice: 30, reorderLevel: 25, isActive: true, createdAt: '2025-01-20T00:00:00Z', updatedAt: '2025-06-01T00:00:00Z' },
  { id: 'p-8', sku: 'ELEC-004', barcode: '6291041500220', name: 'HP LaserJet Toner', nameAr: 'حبر طابعة HP ليزر', unit: 'pcs', unitAr: 'قطعة', costPrice: 220, sellPrice: 320, reorderLevel: 6, isActive: true, createdAt: '2025-02-01T00:00:00Z', updatedAt: '2025-06-01T00:00:00Z' },
  { id: 'p-9', sku: 'ELEC-005', barcode: '6291041500221', name: 'Webcam HD 1080p', nameAr: 'كاميرا ويب HD 1080p', unit: 'pcs', unitAr: 'قطعة', costPrice: 180, sellPrice: 270, reorderLevel: 5, isActive: true, createdAt: '2025-02-05T00:00:00Z', updatedAt: '2025-06-01T00:00:00Z' },
  { id: 'p-10', sku: 'FURN-003', barcode: '6291041500222', name: 'Filing Cabinet 3-drawer', nameAr: 'خزانة ملفات 3 أدراج', unit: 'pcs', unitAr: 'قطعة', costPrice: 380, sellPrice: 550, reorderLevel: 2, isActive: false, createdAt: '2025-02-10T00:00:00Z', updatedAt: '2025-06-01T00:00:00Z' },
];

// ─── Inventory ────────────────────────────────────────────────────────────────
export const MOCK_INVENTORY: BranchInventory[] = [
  { id: 'inv-1', branchId: 'br-1', productId: 'p-1', quantity: 24, branch: MOCK_BRANCHES[0], product: MOCK_PRODUCTS[0] },
  { id: 'inv-2', branchId: 'br-1', productId: 'p-2', quantity: 45, branch: MOCK_BRANCHES[0], product: MOCK_PRODUCTS[1] },
  { id: 'inv-3', branchId: 'br-1', productId: 'p-3', quantity: 8, branch: MOCK_BRANCHES[0], product: MOCK_PRODUCTS[2] },
  { id: 'inv-4', branchId: 'br-1', productId: 'p-4', quantity: 3, branch: MOCK_BRANCHES[0], product: MOCK_PRODUCTS[3] },
  { id: 'inv-5', branchId: 'br-1', productId: 'p-5', quantity: 12, branch: MOCK_BRANCHES[0], product: MOCK_PRODUCTS[4] },
  { id: 'inv-6', branchId: 'br-1', productId: 'p-6', quantity: 2, branch: MOCK_BRANCHES[0], product: MOCK_PRODUCTS[5] },
  { id: 'inv-7', branchId: 'br-2', productId: 'p-1', quantity: 10, branch: MOCK_BRANCHES[1], product: MOCK_PRODUCTS[0] },
  { id: 'inv-8', branchId: 'br-2', productId: 'p-2', quantity: 0, branch: MOCK_BRANCHES[1], product: MOCK_PRODUCTS[1] },
  { id: 'inv-9', branchId: 'br-2', productId: 'p-7', quantity: 30, branch: MOCK_BRANCHES[1], product: MOCK_PRODUCTS[6] },
  { id: 'inv-10', branchId: 'br-3', productId: 'p-8', quantity: 4, branch: MOCK_BRANCHES[2], product: MOCK_PRODUCTS[7] },
  { id: 'inv-11', branchId: 'br-3', productId: 'p-9', quantity: 7, branch: MOCK_BRANCHES[2], product: MOCK_PRODUCTS[8] },
  { id: 'inv-12', branchId: 'br-4', productId: 'p-10', quantity: 1, branch: MOCK_BRANCHES[3], product: MOCK_PRODUCTS[9] },
];

// ─── Transactions ─────────────────────────────────────────────────────────────
const now = Date.now();
const day = 86400000;
export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 'tx-1', type: 'SALE', branchId: 'br-1', branch: MOCK_BRANCHES[0], userId: 'user-1', user: DEMO_USER, totalAmount: 2200, notes: 'Invoice #1001', items: [], createdAt: new Date(now - 1 * day).toISOString() },
  { id: 'tx-2', type: 'PURCHASE', branchId: 'br-1', branch: MOCK_BRANCHES[0], userId: 'user-1', user: DEMO_USER, totalAmount: 5100, notes: 'PO #501', items: [], createdAt: new Date(now - 1 * day).toISOString() },
  { id: 'tx-3', type: 'SALE', branchId: 'br-2', branch: MOCK_BRANCHES[1], userId: 'user-1', user: DEMO_USER, totalAmount: 360, notes: 'Invoice #1002', items: [], createdAt: new Date(now - 2 * day).toISOString() },
  { id: 'tx-4', type: 'TRANSFER_OUT', branchId: 'br-1', branch: MOCK_BRANCHES[0], userId: 'user-1', user: DEMO_USER, totalAmount: 1700, notes: 'Transfer to Jeddah', items: [], createdAt: new Date(now - 2 * day).toISOString() },
  { id: 'tx-5', type: 'TRANSFER_IN', branchId: 'br-2', branch: MOCK_BRANCHES[1], userId: 'user-1', user: DEMO_USER, totalAmount: 1700, notes: 'Received from HQ', items: [], createdAt: new Date(now - 2 * day).toISOString() },
  { id: 'tx-6', type: 'PURCHASE', branchId: 'br-3', branch: MOCK_BRANCHES[2], userId: 'user-1', user: DEMO_USER, totalAmount: 3200, notes: 'PO #502', items: [], createdAt: new Date(now - 3 * day).toISOString() },
  { id: 'tx-7', type: 'SALE', branchId: 'br-1', branch: MOCK_BRANCHES[0], userId: 'user-1', user: DEMO_USER, totalAmount: 1100, notes: 'Invoice #1003', items: [], createdAt: new Date(now - 3 * day).toISOString() },
  { id: 'tx-8', type: 'DAMAGE', branchId: 'br-2', branch: MOCK_BRANCHES[1], userId: 'user-1', user: DEMO_USER, totalAmount: 180, notes: 'Water damage', items: [], createdAt: new Date(now - 4 * day).toISOString() },
  { id: 'tx-9', type: 'SALE', branchId: 'br-3', branch: MOCK_BRANCHES[2], userId: 'user-1', user: DEMO_USER, totalAmount: 640, notes: 'Invoice #1004', items: [], createdAt: new Date(now - 5 * day).toISOString() },
  { id: 'tx-10', type: 'ADJUSTMENT', branchId: 'br-1', branch: MOCK_BRANCHES[0], userId: 'user-1', user: DEMO_USER, totalAmount: 0, notes: 'Annual count adjustment', items: [], createdAt: new Date(now - 6 * day).toISOString() },
];

// ─── Alerts ───────────────────────────────────────────────────────────────────
export const MOCK_ALERTS: Alert[] = [
  { id: 'al-1', type: 'OUT_OF_STOCK', severity: 'CRITICAL', title: 'نفاد المخزون', message: 'كيبورد لوجيتك K400 - فرع جدة: 0 قطعة', branchId: 'br-2', branch: MOCK_BRANCHES[1], productId: 'p-2', product: MOCK_PRODUCTS[1], isRead: false, createdAt: new Date(now - 2 * 3600000).toISOString() },
  { id: 'al-2', type: 'LOW_STOCK', severity: 'WARNING', title: 'مخزون منخفض', message: 'ورق A4 كرتون - المركز الرئيسي: 2 كرتون (الحد الأدنى: 20)', branchId: 'br-1', branch: MOCK_BRANCHES[0], productId: 'p-6', product: MOCK_PRODUCTS[5], isRead: false, createdAt: new Date(now - 5 * 3600000).toISOString() },
  { id: 'al-3', type: 'LOW_STOCK', severity: 'WARNING', title: 'مخزون منخفض', message: 'كرسي مكتبي تنفيذي - المركز الرئيسي: 3 قطع (الحد الأدنى: 3)', branchId: 'br-1', branch: MOCK_BRANCHES[0], productId: 'p-4', product: MOCK_PRODUCTS[3], isRead: true, createdAt: new Date(now - 1 * day).toISOString() },
  { id: 'al-4', type: 'TRANSFER_PENDING', severity: 'INFO', title: 'طلب تحويل معلق', message: 'تحويل 5 شاشات من المركز الرئيسي إلى الدمام', branchId: 'br-3', branch: MOCK_BRANCHES[2], isRead: false, createdAt: new Date(now - 1 * day).toISOString() },
  { id: 'al-5', type: 'LOW_STOCK', severity: 'WARNING', title: 'مخزون منخفض', message: 'حبر طابعة HP - فرع الدمام: 4 قطع', branchId: 'br-3', branch: MOCK_BRANCHES[2], productId: 'p-8', product: MOCK_PRODUCTS[7], isRead: true, createdAt: new Date(now - 2 * day).toISOString() },
  { id: 'al-6', type: 'SYSTEM', severity: 'INFO', title: 'نسخة احتياطية', message: 'تمت النسخة الاحتياطية اليومية بنجاح', isRead: true, createdAt: new Date(now - 3 * day).toISOString() },
];

// ─── Users ────────────────────────────────────────────────────────────────────
export const MOCK_USERS: User[] = [
  DEMO_USER,
  { id: 'user-2', email: 'deputy@erp.com', name: 'Mohammed Al-Ghamdi', nameAr: 'محمد الغامدي', role: 'DEPUTY_MANAGER', isActive: true, createdAt: '2025-01-05T00:00:00Z' },
  { id: 'user-3', email: 'warehouse@erp.com', name: 'Khalid Al-Otaibi', nameAr: 'خالد العتيبي', role: 'WAREHOUSE_MANAGER', branchId: 'br-1', branch: MOCK_BRANCHES[0], isActive: true, createdAt: '2025-01-10T00:00:00Z' },
  { id: 'user-4', email: 'jed.user@erp.com', name: 'Omar Al-Zahrani', nameAr: 'عمر الزهراني', role: 'BRANCH_USER', branchId: 'br-2', branch: MOCK_BRANCHES[1], isActive: true, createdAt: '2025-02-01T00:00:00Z' },
  { id: 'user-5', email: 'auditor@erp.com', name: 'Sara Al-Dosari', nameAr: 'سارة الدوسري', role: 'AUDITOR', isActive: true, createdAt: '2025-02-15T00:00:00Z' },
  { id: 'user-6', email: 'dam.user@erp.com', name: 'Faisal Al-Shehri', nameAr: 'فيصل الشهري', role: 'BRANCH_USER', branchId: 'br-3', branch: MOCK_BRANCHES[2], isActive: false, createdAt: '2025-03-01T00:00:00Z' },
];

// ─── Excel Imports ────────────────────────────────────────────────────────────
export const MOCK_EXCEL_IMPORTS: ExcelImport[] = [
  { id: 'imp-1', filename: 'products_jan2026.xlsx', status: 'COMPLETED', type: 'products', totalRows: 150, importedRows: 148, errors: ['Row 45: invalid SKU', 'Row 112: missing price'], createdAt: new Date(now - 7 * day).toISOString(), user: DEMO_USER },
  { id: 'imp-2', filename: 'inventory_update.xlsx', status: 'COMPLETED', type: 'inventory', totalRows: 300, importedRows: 300, errors: [], createdAt: new Date(now - 14 * day).toISOString(), user: DEMO_USER },
  { id: 'imp-3', filename: 'products_draft.xlsx', status: 'FAILED', type: 'products', totalRows: 50, importedRows: 0, errors: ['Invalid file format'], createdAt: new Date(now - 21 * day).toISOString(), user: MOCK_USERS[1] },
  { id: 'imp-4', filename: 'branches_data.xlsx', status: 'ROLLED_BACK', type: 'branches', totalRows: 4, importedRows: 4, errors: [], createdAt: new Date(now - 30 * day).toISOString(), user: DEMO_USER },
];

// ─── Analytics ────────────────────────────────────────────────────────────────
export const MOCK_ANALYTICS: AnalyticsData = {
  fastMoving: [
    { nameAr: 'شاشة سامسونج 24"', sku: 'ELEC-001', totalSold: 84 },
    { nameAr: 'كيبورد لوجيتك K400', sku: 'ELEC-002', totalSold: 67 },
    { nameAr: 'ورق A4 كرتون', sku: 'STAT-001', totalSold: 55 },
    { nameAr: 'حبر طابعة HP', sku: 'ELEC-004', totalSold: 42 },
    { nameAr: 'هب USB-C', sku: 'ELEC-003', totalSold: 38 },
    { nameAr: 'كاميرا ويب HD', sku: 'ELEC-005', totalSold: 29 },
  ],
  stockOutWarnings: MOCK_INVENTORY.filter(i => i.quantity === 0),
  reorderSuggestions: MOCK_INVENTORY.filter(i => i.product && i.quantity <= i.product.reorderLevel && i.quantity > 0),
};

// ─── Profit Report ────────────────────────────────────────────────────────────
export const MOCK_PROFIT: ProfitReport = {
  rows: [
    { product: 'Samsung Monitor 24"', sku: 'ELEC-001', revenue: 92400, cost: 71400, profit: 21000, qty: 84 },
    { product: 'Logitech Keyboard K400', sku: 'ELEC-002', revenue: 12060, cost: 8040, profit: 4020, qty: 67 },
    { product: 'A4 Paper Box', sku: 'STAT-001', revenue: 3575, cost: 2475, profit: 1100, qty: 55 },
    { product: 'HP LaserJet Toner', sku: 'ELEC-004', revenue: 13440, cost: 9240, profit: 4200, qty: 42 },
    { product: 'USB-C Hub 7-port', sku: 'ELEC-003', revenue: 4560, cost: 2850, profit: 1710, qty: 38 },
  ],
  totalRevenue: 126035,
  totalCost: 94005,
  totalProfit: 32030,
  margin: '25.4',
};

// ─── Dashboard Summary ────────────────────────────────────────────────────────
export const MOCK_SUMMARY: InventorySummary = {
  totalProducts: MOCK_PRODUCTS.length,
  totalBranches: MOCK_BRANCHES.filter(b => b.isActive).length,
  lowStockItems: 4,
  totalInventoryValue: 187450,
  recentTransactions: MOCK_TRANSACTIONS,
};
