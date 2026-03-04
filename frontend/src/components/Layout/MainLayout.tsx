import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useUIStore } from '../../store/uiStore';

export default function MainLayout() {
  const { sidebarCollapsed } = useUIStore();

  return (
    <div className="layout-root">
      <Sidebar />
      <div
        className="layout-main"
        style={{
          marginInlineStart: sidebarCollapsed ? '72px' : '260px',
          transition: 'margin 0.3s ease',
        }}
      >
        <Header />
        <main className="layout-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
