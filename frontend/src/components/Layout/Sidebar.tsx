import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, ScanLine, Warehouse, ArrowLeftRight,
  FileSpreadsheet, BarChart3, Bell, Users, GitBranch, ChevronLeft,
  ChevronRight, LogOut,
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { clsx } from 'clsx';

const nav = [
  { to: '/dashboard', label: 'لوحة التحكم', labelEn: 'Dashboard', icon: LayoutDashboard },
  { to: '/products', label: 'المنتجات', labelEn: 'Products', icon: Package },
  { to: '/scanner', label: 'الماسح الضوئي', labelEn: 'Scanner', icon: ScanLine },
  { to: '/inventory', label: 'المخزون', labelEn: 'Inventory', icon: Warehouse },
  { to: '/transactions', label: 'المعاملات', labelEn: 'Transactions', icon: ArrowLeftRight },
  { to: '/excel', label: 'إدارة Excel', labelEn: 'Excel', icon: FileSpreadsheet },
  { to: '/reports', label: 'التقارير', labelEn: 'Reports', icon: BarChart3 },
  { to: '/alerts', label: 'التنبيهات', labelEn: 'Alerts', icon: Bell },
  { to: '/users', label: 'المستخدمون', labelEn: 'Users', icon: Users },
  { to: '/branches', label: 'الفروع', labelEn: 'Branches', icon: GitBranch },
];

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, lang } = useUIStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside
      className={clsx('sidebar', sidebarCollapsed && 'collapsed')}
      style={{ width: sidebarCollapsed ? 72 : 260 }}
    >
      {/* Logo */}
      <div className="sidebar-logo">
        {!sidebarCollapsed && (
          <span className="gradient-text" style={{ fontSize: '1.2rem', fontWeight: 700 }}>
            {lang === 'ar' ? 'نظام ERP' : 'ERP System'}
          </span>
        )}
        <button
          className="btn ghost"
          style={{ padding: '6px', marginInlineStart: 'auto' }}
          onClick={toggleSidebar}
          title={sidebarCollapsed ? 'Expand' : 'Collapse'}
        >
          {sidebarCollapsed
            ? (lang === 'ar' ? <ChevronLeft size={18} /> : <ChevronRight size={18} />)
            : (lang === 'ar' ? <ChevronRight size={18} /> : <ChevronLeft size={18} />)}
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {nav.map(({ to, label, labelEn, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx('sidebar-item', isActive && 'active')
            }
            title={lang === 'ar' ? label : labelEn}
          >
            <Icon size={20} className="sidebar-icon" />
            {!sidebarCollapsed && (
              <span className="sidebar-label">{lang === 'ar' ? label : labelEn}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="sidebar-footer">
        {!sidebarCollapsed && user && (
          <div style={{ padding: '0 12px 8px', opacity: 0.75, fontSize: '0.8rem' }}>
            <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.nameAr || user.name}
            </div>
            <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{user.role}</div>
          </div>
        )}
        <button
          className="sidebar-item"
          onClick={handleLogout}
          style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
          title="Logout"
        >
          <LogOut size={20} className="sidebar-icon" />
          {!sidebarCollapsed && (
            <span className="sidebar-label">{lang === 'ar' ? 'تسجيل الخروج' : 'Logout'}</span>
          )}
        </button>
      </div>
    </aside>
  );
}
