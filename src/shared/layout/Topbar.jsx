export default function Topbar({
  title,
  currentPath,
  theme,
  onToggleTheme,
  sidebarCollapsed,
  onToggleSidebar,
  onNavigate
}) {
  return (
    <header className="app-topbar">
      <div className="app-topbar-flow" key={currentPath || title}>
        <span className="app-topbar-flow-wave" />
      </div>
      <div className="app-topbar-left">
        <button
          type="button"
          className="app-topbar-sidebar-toggle"
          onClick={onToggleSidebar}
          aria-label={sidebarCollapsed ? 'Open sidebar' : 'Close sidebar'}
          title={sidebarCollapsed ? 'Open sidebar' : 'Close sidebar'}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="5" y="4.5" width="14" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
            <path
              d={sidebarCollapsed ? 'M8 8.5 10.5 12 8 15.5' : 'M10 8.5 7.5 12 10 15.5'}
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M13.5 7.5v9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>

        <div className="app-topbar-breadcrumb">
          <button
            type="button"
            className="app-topbar-home"
            onClick={() => onNavigate?.('/dashboard')}
            aria-label="Kembali ke beranda"
            title="Kembali ke beranda"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4.75 10.25 12 4.5l7.25 5.75"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M6.75 9.75v8.25h10.5V9.75"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <span className="app-topbar-crumb-sep" aria-hidden="true">›</span>
        </div>

        <h1 className="app-topbar-title">{title}</h1>
      </div>

      <div className="app-topbar-actions">
        <button
          type="button"
          className="app-topbar-theme"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            {theme === 'dark' ? (
              <path
                d="M16.75 15.5a6.75 6.75 0 1 1-8.25-8.25 7.75 7.75 0 1 0 8.25 8.25Z"
                fill="currentColor"
              />
            ) : (
              <>
                <circle cx="12" cy="12" r="4" fill="currentColor" />
                <path
                  d="M12 2.75v2.5M12 18.75v2.5M21.25 12h-2.5M5.25 12h-2.5M18.54 5.46l-1.77 1.77M7.23 16.77l-1.77 1.77M18.54 18.54l-1.77-1.77M7.23 7.23 5.46 5.46"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </>
            )}
          </svg>
        </button>
      </div>
    </header>
  );
}
