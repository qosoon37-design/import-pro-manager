import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { useUIStore } from './store/uiStore';

// Layouts
import MainLayout from './components/Layout/MainLayout';

// Pages
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import ProductsPage from './pages/Products';
import ScannerPage from './pages/Scanner';
import InventoryPage from './pages/Inventory';
import TransactionsPage from './pages/Transactions';
import ExcelPage from './pages/Excel';
import ReportsPage from './pages/Reports';
import AlertsPage from './pages/Alerts';
import UsersPage from './pages/Users';
import BranchesPage from './pages/Branches';
import NotFoundPage from './pages/NotFound';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { lang, theme } = useUIStore();

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('data-theme', theme);
  }, [lang, theme]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/"
          element={
            <RequireAuth>
              <MainLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="scanner" element={<ScannerPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="excel" element={<ExcelPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="branches" element={<BranchesPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
