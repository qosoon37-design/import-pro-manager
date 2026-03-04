// ─── Enums ───────────────────────────────────────────────────────────────────

export type UserRole =
  | 'GENERAL_MANAGER'
  | 'DEPUTY_MANAGER'
  | 'WAREHOUSE_MANAGER'
  | 'BRANCH_USER'
  | 'AUDITOR';

export type TransactionType =
  | 'PURCHASE'
  | 'SALE'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'DAMAGE'
  | 'ADJUSTMENT'
  | 'INITIAL_LOAD';

export type AlertType = 'LOW_STOCK' | 'OUT_OF_STOCK' | 'PRICE_CHANGE' | 'TRANSFER_PENDING' | 'SYSTEM';
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type ImportStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'ROLLED_BACK';

// ─── Core Models ─────────────────────────────────────────────────────────────

export interface Branch {
  id: string;
  code: string;
  name: string;
  nameAr: string;
  address?: string;
  isMain: boolean;
  isActive: boolean;
  createdAt: string;
  _count?: { users: number; inventory: number };
}

export interface User {
  id: string;
  email: string;
  name: string;
  nameAr?: string;
  role: UserRole;
  branchId?: string;
  branch?: Branch;
  isActive: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  nameAr: string;
  parentId?: string;
  parent?: Category;
}

export interface Product {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  nameAr: string;
  categoryId?: string;
  category?: Category;
  unit: string;
  unitAr: string;
  costPrice: number;
  sellPrice: number;
  reorderLevel: number;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  inventory?: BranchInventory[];
}

export interface BranchInventory {
  id: string;
  branchId: string;
  productId: string;
  quantity: number;
  branch?: Branch;
  product?: Product;
}

export interface TransactionItem {
  id: string;
  productId: string;
  product?: Product;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  serialNumber?: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  branchId: string;
  branch?: Branch;
  userId: string;
  user?: User;
  totalAmount: number;
  notes?: string;
  items: TransactionItem[];
  createdAt: string;
}

export interface Transfer {
  id: string;
  fromBranchId: string;
  toBranchId: string;
  fromBranch?: Branch;
  toBranch?: Branch;
  status: 'PENDING' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
}

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  branchId?: string;
  branch?: Branch;
  productId?: string;
  product?: Product;
  isRead: boolean;
  createdAt: string;
}

export interface ExcelImport {
  id: string;
  filename: string;
  status: ImportStatus;
  type: string;
  totalRows: number;
  importedRows: number;
  errors: unknown[];
  createdAt: string;
  user?: User;
}

export interface PriceHistory {
  id: string;
  productId: string;
  product?: Product;
  oldCostPrice?: number;
  newCostPrice?: number;
  oldSellPrice?: number;
  newSellPrice?: number;
  reason?: string;
  createdBy: string;
  createdAt: string;
}

// ─── API Response types ───────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface InventorySummary {
  totalProducts: number;
  totalBranches: number;
  lowStockItems: number;
  totalInventoryValue: number;
  recentTransactions: Transaction[];
}

export interface AnalyticsData {
  fastMoving: Array<{ nameAr: string; sku: string; totalSold: number }>;
  stockOutWarnings: BranchInventory[];
  reorderSuggestions: BranchInventory[];
}

export interface ProfitReport {
  rows: Array<{
    product: string;
    sku: string;
    revenue: number;
    cost: number;
    profit: number;
    qty: number;
  }>;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  margin: number | string;
}

// ─── Auth types ───────────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}
