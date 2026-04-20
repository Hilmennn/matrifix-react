import { createPortal } from 'react-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { buildNavigation, parseStoredUser } from './navigation';
import { normalizeRole } from '../lib/roles';

const iconPaths = {
  tools: (
    <path d="M9.405 1.05a1 1 0 0 1 .49 1.324L8.87 4.72a.5.5 0 0 0 .12.53l1.76 1.76a.5.5 0 0 0 .53.12l2.346-1.024a1 1 0 1 1 .814 1.828l-2.346 1.024a2.5 2.5 0 0 1-2.65-.6l-1.76-1.76a2.5 2.5 0 0 1-.6-2.65L8.08 1.54a1 1 0 0 1 1.324-.49ZM3.96 5.146a.5.5 0 0 1 .708 0l6.186 6.186a.5.5 0 0 1 0 .708L8.56 14.333a2.7 2.7 0 1 1-3.818-3.818L7.035 8.22a.5.5 0 0 1 .708 0l.439.439a.5.5 0 0 1 0 .708l-2.293 2.293a1.7 1.7 0 1 0 2.404 2.404l2.293-2.293a.5.5 0 0 1 .708 0l.439.439a.5.5 0 0 1 0 .708L9.44 14.21a2.7 2.7 0 1 1-3.818-3.818l2.294-2.293a.5.5 0 0 1 .708 0l.439.439a.5.5 0 0 1 0 .708L6.77 11.54a1.7 1.7 0 1 0 2.404 2.404l2.293-2.293a.5.5 0 0 1 .708 0l.439.439a.5.5 0 0 1 0 .708l-1.439 1.439a3.7 3.7 0 1 1-5.232-5.232l1.439-1.439a.5.5 0 0 0 0-.708L4.668 5.146a.5.5 0 0 1-.708 0Z" />
  ),
  box: (
    <path d="M8.186 1.113a1 1 0 0 0-.372 0l-5 1.2A1 1 0 0 0 2 3.28v8.44a1 1 0 0 0 .814.967l5 1.2a1 1 0 0 0 .372 0l5-1.2a1 1 0 0 0 .814-.967V3.28a1 1 0 0 0-.814-.967l-5-1.2ZM8 2.149 12.59 3.25 8 4.351 3.41 3.25 8 2.149ZM3 4.134l4.5 1.08v7.548L3 11.68V4.134Zm10 0v7.547l-4.5 1.08V5.214l4.5-1.08Z" />
  ),
  house: (
    <path d="M8.354 1.146a.5.5 0 0 0-.708 0l-6 6A.5.5 0 0 0 2 8h1v5a1 1 0 0 0 1 1h3.5a.5.5 0 0 0 .5-.5V10h1v3.5a.5.5 0 0 0 .5.5H13a1 1 0 0 0 1-1V8h1a.5.5 0 0 0 .354-.854l-6-6Z" />
  ),
  list: (
    <path d="M2.5 3.5a.5.5 0 0 1 1 0v1a.5.5 0 0 1-1 0v-1Zm0 4a.5.5 0 0 1 1 0v1a.5.5 0 0 1-1 0v-1Zm0 4a.5.5 0 0 1 1 0v1a.5.5 0 0 1-1 0v-1ZM5 4a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 0 1h-8A.5.5 0 0 1 5 4Zm0 4a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 0 1h-8A.5.5 0 0 1 5 8Zm0 4a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 0 1h-8A.5.5 0 0 1 5 12Z" />
  ),
  'plus-square': (
    <path d="M2 2.5A1.5 1.5 0 0 1 3.5 1h9A1.5 1.5 0 0 1 14 2.5v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 11.5v-9Zm6 2a.5.5 0 0 0-1 0V7H4.5a.5.5 0 0 0 0 1H7v2.5a.5.5 0 0 0 1 0V8h2.5a.5.5 0 0 0 0-1H8V4.5Z" />
  ),
  info: (
    <path d="M8 1.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13Zm0 3a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8Zm1 3.5H7.5a.5.5 0 0 0 0 1H8v2H7a.5.5 0 0 0 0 1h2a.5.5 0 0 0 0-1h-.5V8.5a.5.5 0 0 0-.5-.5Z" />
  ),
  file: (
    <path d="M4 1.5A1.5 1.5 0 0 0 2.5 3v10A1.5 1.5 0 0 0 4 14.5h8a1.5 1.5 0 0 0 1.5-1.5V5.707a1.5 1.5 0 0 0-.44-1.06l-2.707-2.707A1.5 1.5 0 0 0 9.293 1.5H4Zm5 1.207c.103 0 .202.041.275.114l2.404 2.404a.39.39 0 0 1 .114.275V13a.5.5 0 0 1-.5.5H4a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5h5Z" />
  ),
  download: (
    <path d="M7.5 2a.5.5 0 0 1 1 0v5.293l1.646-1.647a.5.5 0 1 1 .708.708l-2.5 2.5a.5.5 0 0 1-.708 0l-2.5-2.5a.5.5 0 1 1 .708-.708L7.5 7.293V2Zm-4 8.5a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 0 1H4a.5.5 0 0 1-.5-.5Zm-1 2a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5Z" />
  ),
  table: (
    <path d="M1.5 3A1.5 1.5 0 0 1 3 1.5h10A1.5 1.5 0 0 1 14.5 3v10A1.5 1.5 0 0 1 13 14.5H3A1.5 1.5 0 0 1 1.5 13V3Zm1 0V5h11V3a.5.5 0 0 0-.5-.5H3a.5.5 0 0 0-.5.5Zm0 3v2.5h3V6h-3Zm4 0v2.5h3V6h-3Zm4 0v2.5h3V6h-3Zm-8 3.5V13a.5.5 0 0 0 .5.5h2.5V9.5h-3Zm4 0v4h3v-4h-3Zm4 0v4H13a.5.5 0 0 0 .5-.5V9.5h-3Z" />
  ),
  journal: (
    <path d="M3.5 2A1.5 1.5 0 0 0 2 3.5v9A1.5 1.5 0 0 0 3.5 14h7A1.5 1.5 0 0 0 12 12.5v-9A1.5 1.5 0 0 0 10.5 2h-7Zm0 1h7a.5.5 0 0 1 .5.5V7h-8V3.5a.5.5 0 0 1 .5-.5ZM3 8h8v4.5a.5.5 0 0 1-.5.5h-7a.5.5 0 0 1-.5-.5V8Zm9.5-5a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-1 0v-9a.5.5 0 0 1 .5-.5Z" />
  ),
  edit: (
    <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 2.475l-7.56 7.56a1.75 1.75 0 0 1-.766.45l-2.14.611a.75.75 0 0 1-.93-.93l.61-2.14a1.75 1.75 0 0 1 .45-.766l7.562-7.56ZM12.78 2.134a.75.75 0 0 0-1.06 0l-.69.69 1.06 1.06.69-.69a.75.75 0 0 0 0-1.06ZM10.323 4.22 4.16 10.384a.75.75 0 0 0-.193.328l-.428 1.5 1.5-.428a.75.75 0 0 0 .328-.193l6.163-6.163-1.06-1.06Z" />
  ),
  search: (
    <path d="M11.742 10.344a6 6 0 1 0-1.398 1.398l2.458 2.458a1 1 0 0 0 1.414-1.414l-2.474-2.442ZM7 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10Z" />
  ),
  shield: (
    <path d="M8 1.5 3 3.2v4.3c0 3.08 2.02 5.93 5 6.86 2.98-.93 5-3.78 5-6.86V3.2L8 1.5Zm0 1.07 4 1.36v3.57c0 2.55-1.59 4.92-4 5.81-2.41-.89-4-3.26-4-5.81V3.93l4-1.36Zm2.35 2.95a.5.5 0 0 1 .13.7l-2.5 3.5a.5.5 0 0 1-.78.05l-1.5-1.5a.5.5 0 0 1 .7-.71l1.08 1.08 2.15-3a.5.5 0 0 1 .7-.12Z" />
  ),
  users: (
    <path d="M5.5 5.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm5 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4ZM2.5 8A2.5 2.5 0 0 0 0 10.5V12h7v-1.5A2.5 2.5 0 0 0 4.5 8h-2Zm6 0A2.5 2.5 0 0 0 6 10.5V12h10v-1.5A2.5 2.5 0 0 0 13.5 8h-5Z" />
  )
};

function Icon({ name }) {
  return (
    <span className="app-sidebar-icon" aria-hidden="true">
      <svg viewBox="0 0 16 16" fill="currentColor">
        {iconPaths[name] || null}
      </svg>
    </span>
  );
}

function isActive(currentPath, targetPath) {
  if (!targetPath) {
    return false;
  }
  return currentPath === targetPath;
}

function ProfileMenu({
  open,
  onClose,
  onLogout,
  onNavigate,
  onToggleTheme,
  theme,
  name,
  email,
  initials,
  menuRef,
  style
}) {
  if (!open) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className={`app-sidebar-profile-menu${open ? ' is-open' : ''}`}
      role="menu"
      aria-label="Profile menu"
      style={style}
    >
      <button type="button" className="app-sidebar-profile-menu-header" onClick={onClose}>
        <span className="app-sidebar-profile-menu-avatar">{initials}</span>
        <span className="app-sidebar-profile-menu-text">
          <strong>{name}</strong>
          <small>{email}</small>
        </span>
      </button>

      <div className="app-sidebar-profile-menu-section">
        <button
          type="button"
          className="app-sidebar-profile-menu-item"
          onClick={() => {
            onNavigate?.('/account');
            onClose?.();
          }}
        >
          <Icon name="users" />
          <span>Account</span>
        </button>
        <button
          type="button"
          className="app-sidebar-profile-menu-item"
          onClick={() => {
            onNavigate?.('/account/password');
            onClose?.();
          }}
        >
          <Icon name="shield" />
          <span>Password</span>
        </button>
      </div>

      <div className="app-sidebar-profile-menu-section is-footer">
        <button type="button" className="app-sidebar-profile-menu-item is-logout" onClick={onLogout}>
          <span className="app-sidebar-profile-menu-logout-icon">↪</span>
          <span>Log out</span>
        </button>
      </div>
    </div>
  );
}

function Group({
  title,
  icon,
  items,
  currentPath,
  onNavigate,
  onAction,
  isOpen,
  onToggle
}) {
  const parentActive = items.some((item) => item.path && isActive(currentPath, item.path));

  return (
    <li className="app-sidebar-nav-item">
      <button
        type="button"
        className={`app-sidebar-link app-sidebar-parent${parentActive ? ' is-active' : ''}`}
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <Icon name={icon} />
        <span>{title}</span>
        <span className={`app-sidebar-caret${isOpen ? ' is-open' : ''}`}>{'>'}</span>
      </button>
      <ul className={`app-sidebar-sublist${isOpen ? ' is-open' : ''}`}>
        {items.map((item) => (
          <li key={item.path || item.action || item.label} className="app-sidebar-subitem">
            <button
              type="button"
              className={`app-sidebar-link app-sidebar-child${
                isActive(currentPath, item.path) ? ' is-active' : ''
              }`}
              onClick={() => {
                if (item.action) {
                  onAction?.(item.action);
                  return;
                }
                onNavigate(item.path);
              }}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </li>
  );
}

export default function Sidebar({
  user: sessionUser,
  currentPath,
  onNavigate,
  onAction,
  onLogout,
  theme,
  onToggleTheme,
  collapsed
}) {
  const user = useMemo(() => {
    if (sessionUser && typeof sessionUser === 'object' && sessionUser.username) {
      return sessionUser;
    }
    return parseStoredUser();
  }, [sessionUser]);
  const role = normalizeRole(user?.role);
  const { groups, singles } = buildNavigation(role);
  const [openGroups, setOpenGroups] = useState({});
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileMenuMounted, setProfileMenuMounted] = useState(false);
  const [profileMenuStyle, setProfileMenuStyle] = useState({});
  const profileWrapRef = useRef(null);
  const profileMenuRef = useRef(null);

  const toggleGroup = (groupTitle) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupTitle]: !prev[groupTitle]
    }));
  };

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!profileWrapRef.current) {
        return;
      }
      const target = event.target;
      const clickedProfile = profileWrapRef.current.contains(target);
      const clickedMenu = profileMenuRef.current?.contains(target);
      if (!clickedProfile && !clickedMenu) {
        setProfileMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setProfileMenuOpen(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (profileMenuOpen) {
      setProfileMenuMounted(true);
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setProfileMenuMounted(false);
    }, 180);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [profileMenuOpen]);

  useEffect(() => {
    if (!profileMenuMounted || !profileWrapRef.current) {
      return undefined;
    }

    const updateMenuPosition = () => {
      const rect = profileWrapRef.current.getBoundingClientRect();
      const menuWidth = 320;
      const menuHeight = 214;
      const gap = 64;
      const left = rect.right + gap;
      const bottom = 20;

      setProfileMenuStyle({
        position: 'fixed',
        left: `${left}px`,
        bottom: `${bottom}px`,
        width: `${menuWidth}px`
      });
    };

    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);

    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [profileMenuMounted]);

  const resolveGroupOpenState = (group) => {
    if (typeof openGroups[group.title] === 'boolean') {
      return openGroups[group.title];
    }

    return false;
  };

  const name = user?.nama || 'Pengguna';
  const email = user?.email || user?.username || 'user@matrifix.local';
  const subtitle = user?.role || 'Role';
  const initials =
    (name || 'U')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'U';

  return (
    <aside className={`app-sidebar${collapsed ? ' is-collapsed' : ''}`}>
      <div className="app-sidebar-shell">
        <h1 className="app-sidebar-heading">
          <button
            type="button"
            className="app-sidebar-logo app-sidebar-logo-button"
            onClick={() => onNavigate('/dashboard')}
          >
            MatriFix
          </button>
        </h1>

        <ul className="app-sidebar-components">
          {groups.map((group) => (
            <Group
              key={group.title}
              title={group.title}
              icon={group.icon}
              items={group.items}
              currentPath={currentPath}
              onNavigate={onNavigate}
              onAction={onAction}
              isOpen={resolveGroupOpenState(group)}
              onToggle={() => toggleGroup(group.title)}
            />
          ))}

          {singles.map((item) => (
            <li key={item.path} className="app-sidebar-nav-item app-sidebar-single">
              <button
                type="button"
                className={`app-sidebar-link app-sidebar-parent${
                  currentPath === item.path ? ' is-active' : ''
                }`}
                onClick={() => onNavigate(item.path)}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="app-sidebar-profile" ref={profileWrapRef}>
          <div
            className="app-sidebar-profile-card"
            role="button"
            tabIndex={0}
            aria-label="Open profile menu"
            aria-expanded={profileMenuOpen}
            onClick={() => setProfileMenuOpen((value) => !value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setProfileMenuOpen((value) => !value);
              }
            }}
          >
            <span className="app-sidebar-profile-avatar">{initials}</span>
            <div className="app-sidebar-profile-info">
              <div className="app-sidebar-profile-name" title={name}>
                {name}
              </div>
              <div className="app-sidebar-profile-role" title={subtitle}>
                {subtitle}
              </div>
            </div>
            <button
              type="button"
              className="app-sidebar-profile-trigger"
              aria-label="Open profile menu"
              aria-expanded={profileMenuOpen}
              onClick={(event) => {
                event.stopPropagation();
                setProfileMenuOpen((value) => !value);
              }}
            >
              <span className="app-sidebar-profile-trigger-dots" aria-hidden="true">⋮</span>
            </button>
          </div>
        </div>
      </div>
      {profileMenuMounted && typeof document !== 'undefined'
        ? createPortal(
          <ProfileMenu
            open={profileMenuOpen}
            name={name}
            email={email}
            initials={initials}
            theme={theme}
            menuRef={profileMenuRef}
            style={profileMenuStyle}
            onNavigate={onNavigate}
            onClose={() => setProfileMenuOpen(false)}
            onToggleTheme={() => {
              onToggleTheme?.();
              setProfileMenuOpen(false);
            }}
            onLogout={() => {
              setProfileMenuOpen(false);
              onLogout?.();
            }}
          />,
          document.body
        )
        : null}
    </aside>
  );
}


