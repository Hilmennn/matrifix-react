import { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import '../styles/layout.css';

export default function AppLayout({
  title,
  user,
  onLogout,
  currentPath,
  onNavigate,
  onSidebarAction,
  theme,
  onToggleTheme,
  children
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className={`app-layout${sidebarCollapsed ? ' is-sidebar-collapsed' : ''}`}>
      <Sidebar
        user={user}
        currentPath={currentPath}
        onNavigate={onNavigate}
        onAction={onSidebarAction}
        onLogout={onLogout}
        theme={theme}
        onToggleTheme={onToggleTheme}
        collapsed={sidebarCollapsed}
      />
      <div className="app-layout-main">
        <Topbar
          title={title}
          currentPath={currentPath}
          theme={theme}
          onToggleTheme={onToggleTheme}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((value) => !value)}
          onNavigate={onNavigate}
        />
        <main className="app-layout-content">{children}</main>
      </div>
    </div>
  );
}
