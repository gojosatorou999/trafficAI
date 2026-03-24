import { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import useAlerts from '../hooks/useAlerts';

const navItems = [
  { path: '/', label: 'DASH', icon: DashIcon },
  { path: '/highway', label: 'HIGHWAY', icon: HighwayIcon },
  { path: '/narrator', label: 'VOICE', icon: VoiceIcon },
  { path: '/sos-monitor', label: 'SOS', icon: SOSIcon },
  { path: '/transport', label: 'ROUTES', icon: RoutesIcon },
];

export default function Layout() {
  const { wsConnected } = useAlerts();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [location]);

  return (
    <div className="app-shell">
      {/* HEADER */}
      <header className="app-header">
        <div className="app-logo">
          <div className="app-logo-icon" />
          <div className="app-logo-text">INTELLIMOBILITY<br/>AI</div>
        </div>

        <div className="header-right">
          {/* System Menu */}
          <div className="system-menu" ref={menuRef}>
            <button
              className={`system-menu-btn ${menuOpen ? 'open' : ''}`}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              SYSTEM MENU <span className="arrow">▼</span>
            </button>
            {menuOpen && (
              <div className="system-menu-dropdown">
                <NavLink to="/corridor">◆ GREEN CORRIDOR</NavLink>
                <NavLink to="/">◇ LIVE SYSTEM FEED</NavLink>
                <NavLink to="/highway">◆ HIGHWAY MONITOR</NavLink>
                <div className="menu-divider" />
                <NavLink to="/transport">◇ FLEET TRACKER</NavLink>
                <NavLink to="/narrator">◆ NARRATOR FEED</NavLink>
                <NavLink to="/sos-monitor">◇ SOS DISPATCH</NavLink>
                <div className="menu-divider" />
                <button onClick={() => setMenuOpen(false)}>⚙ SYSTEM CONFIG</button>
              </div>
            )}
          </div>

          {/* Connection Badge */}
          <div className={`connection-badge ${wsConnected ? '' : 'offline'}`}>
            <span className={`connection-dot ${wsConnected ? '' : 'offline'}`} />
            {wsConnected ? 'CONNECTED' : 'OFFLINE'}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="app-content">
        <Outlet />
      </main>

      {/* BOTTOM NAV */}
      <nav className="bottom-nav">
        {navItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon />
            <span className="bottom-nav-label">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

/* ─── NAV ICONS (inline SVG) ─── */
function DashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/>
      <rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>
    </svg>
  );
}
function HighwayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20M4 6l3 2M20 6l-3 2M4 18l3-2M20 18l-3-2"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}
function VoiceIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
      <path d="M19 10v1a7 7 0 0 1-14 0v-1"/><line x1="12" y1="19" x2="12" y2="22"/>
    </svg>
  );
}
function SOSIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
}
function RoutesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="19" r="3"/><circle cx="18" cy="5" r="3"/>
      <path d="M12 19h4.5a3.5 3.5 0 0 0 0-7h-8a3.5 3.5 0 0 1 0-7H12"/>
    </svg>
  );
}
