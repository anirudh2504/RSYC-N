import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useSession } from '../context/Session.jsx';
import { Crest, Icon } from './Ornaments.jsx';
import { Sheet, SheetItem } from './ui.jsx';

const CLUB = 'Rav Shekha Ji Yuva Club';
const VILLAGE = 'Nangla';

/**
 * One layout, three shapes.
 *
 *   phone   top bar + bottom tab bar + a slide-over menu
 *   tablet  the same, with room to breathe
 *   laptop  top bar + a real left sidebar; the bottom bar and the menu button
 *           both disappear, because everything they held is now on screen
 */

function TopBar({ onMenu }) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link to="/" className="brand">
          <Crest className="brand-mark" />
          <span className="brand-text">
            <span className="brand-name">{CLUB}</span>
            <span className="brand-sub">{VILLAGE}</span>
          </span>
        </Link>
        <button
          type="button"
          className="topbar-btn topbar-menu-btn"
          onClick={onMenu}
          aria-label="Open menu"
        >
          <Icon.more />
        </button>
      </div>
    </header>
  );
}

function BottomNav({ items }) {
  return (
    <nav className="bottomnav" aria-label="Main">
      <div className="bottomnav-inner">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `navitem${isActive ? ' active' : ''}`}
          >
            {item.icon}
            <span>{item.short || item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function SideNav({ groups }) {
  return (
    <aside className="sidebar" aria-label="Sections">
      {groups.map((group, i) => (
        <div className="side-group" key={group.label || i}>
          {group.label ? <p className="side-label">{group.label}</p> : null}
          {group.items.map((item) =>
            item.to ? (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `sideitem${isActive ? ' active' : ''}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ) : (
              <button
                key={item.label}
                type="button"
                className={`sideitem${item.danger ? ' danger' : ''}`}
                onClick={item.onClick}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ),
          )}
        </div>
      ))}
    </aside>
  );
}

/* --------------------------------------------------------- open + viewer -- */

export function PublicLayout({ children }) {
  const session = useSession();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);

  const signOut = async () => {
    setMenu(false);
    if (session.isAdmin) await session.logout();
    if (session.viewer) await session.lock();
    navigate('/');
  };

  const navItems = session.viewer
    ? [
        { to: '/', end: true, icon: <Icon.calendar />, label: 'Events' },
        { to: '/fund', end: true, icon: <Icon.home />, label: 'Fund' },
        { to: '/fund/transactions', icon: <Icon.ledger />, label: 'Transactions', short: 'Ledger' },
        { to: '/fund/members', icon: <Icon.people />, label: 'Members' },
        {
          to: '/fund/collection',
          icon: <Icon.board />,
          label: 'Monthly contribution',
          short: 'Monthly',
        },
      ]
    : [
        { to: '/', end: true, icon: <Icon.calendar />, label: 'Events' },
        { to: '/about', icon: <Icon.home />, label: 'About the club', short: 'About' },
        { to: '/unlock', icon: <Icon.lock />, label: 'Club fund', short: 'Fund' },
      ];

  const sideGroups = [
    { items: navItems },
    {
      label: 'Club',
      items: [
        ...(session.viewer ? [{ to: '/about', icon: <Icon.home />, label: 'About the club' }] : []),
        ...(session.isAdmin
          ? [{ to: '/admin', icon: <Icon.shield />, label: 'Admin area' }]
          : [{ to: '/login', icon: <Icon.shield />, label: 'Admin sign in' }]),
        ...(session.viewer || session.isAdmin
          ? [{ icon: <Icon.logout />, label: 'Log out', danger: true, onClick: signOut }]
          : []),
      ],
    },
  ];

  return (
    <div className="app">
      <TopBar onMenu={() => setMenu(true)} />

      <div className="shell">
        <SideNav groups={sideGroups} />
        <main className="main">{children}</main>
      </div>

      <BottomNav items={navItems} />

      <Sheet open={menu} title="Menu" onClose={() => setMenu(false)}>
        <SheetItem
          icon={<Icon.home />}
          onClick={() => {
            setMenu(false);
            navigate('/about');
          }}
        >
          About the club
        </SheetItem>

        {/* Admin sign in lives here and nowhere else — never on the fund or
            unlock screens, which are for ordinary members. */}
        {session.isAdmin ? (
          <SheetItem
            icon={<Icon.shield />}
            onClick={() => {
              setMenu(false);
              navigate('/admin');
            }}
          >
            Admin area
          </SheetItem>
        ) : (
          <SheetItem
            icon={<Icon.shield />}
            onClick={() => {
              setMenu(false);
              navigate('/login');
            }}
          >
            Admin sign in
          </SheetItem>
        )}

        {session.viewer || session.isAdmin ? (
          <SheetItem icon={<Icon.logout />} danger onClick={signOut}>
            Log out
          </SheetItem>
        ) : null}
      </Sheet>
    </div>
  );
}

/* --------------------------------------------------------------- admin --- */

export function AdminLayout({ children }) {
  const session = useSession();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);

  const go = (path) => {
    setMenu(false);
    navigate(path);
  };

  const signOut = async () => {
    setMenu(false);
    await session.logout();
    navigate('/');
  };

  const navItems = [
    { to: '/admin', end: true, icon: <Icon.home />, label: 'Dashboard', short: 'Home' },
    { to: '/admin/new', icon: <Icon.plus />, label: 'Add entry', short: 'Add' },
    { to: '/admin/collect', icon: <Icon.board />, label: 'Collect', short: 'Collect' },
    { to: '/admin/members', icon: <Icon.people />, label: 'Members', short: 'Members' },
  ];

  const moreItems = [
    { to: '/admin/transactions', icon: <Icon.ledger />, label: 'All transactions' },
    { to: '/admin/pending', icon: <Icon.bell />, label: 'Pending & reminders' },
    { to: '/admin/events', icon: <Icon.calendar />, label: 'Manage events' },
    { to: '/admin/requests', icon: <Icon.inbox />, label: 'Join requests' },
  ];

  const masterItems = [
    { to: '/admin/adjust', icon: <Icon.scale />, label: 'Correct balance' },
    { to: '/admin/pin', icon: <Icon.lock />, label: 'Group PIN' },
    { to: '/admin/admins', icon: <Icon.shield />, label: 'Manage admins' },
    { to: '/admin/audit', icon: <Icon.ledger />, label: 'Audit log' },
    { to: '/admin/settings', icon: <Icon.settings />, label: 'Club settings' },
  ];

  const sideGroups = [
    { items: navItems },
    { label: 'Manage', items: moreItems },
    ...(session.isMaster ? [{ label: 'Master admin', items: masterItems }] : []),
    {
      label: 'Session',
      items: [
        { to: '/', icon: <Icon.calendar />, label: 'View the club site' },
        { icon: <Icon.logout />, label: 'Log out', danger: true, onClick: signOut },
      ],
    },
  ];

  return (
    <div className="app">
      <TopBar onMenu={() => setMenu(true)} />

      <div className="shell">
        <SideNav groups={sideGroups} />
        <main className="main">{children}</main>
      </div>

      <nav className="bottomnav" aria-label="Admin">
        <div className="bottomnav-inner">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `navitem${isActive ? ' active' : ''}`}
            >
              {item.icon}
              <span>{item.short}</span>
            </NavLink>
          ))}
          <button type="button" className="navitem" onClick={() => setMenu(true)}>
            <Icon.more />
            <span>More</span>
          </button>
        </div>
      </nav>

      <Sheet open={menu} title="Admin" onClose={() => setMenu(false)}>
        {moreItems.map((item) => (
          <SheetItem key={item.to} icon={item.icon} onClick={() => go(item.to)}>
            {item.label}
          </SheetItem>
        ))}

        {session.isMaster ? (
          <>
            <div className="sheet-pad" style={{ padding: '12px 16px 6px' }}>
              <p className="eyebrow">Master admin</p>
            </div>
            {masterItems.map((item) => (
              <SheetItem key={item.to} icon={item.icon} onClick={() => go(item.to)}>
                {item.label}
              </SheetItem>
            ))}
          </>
        ) : null}

        <div className="sheet-pad" style={{ padding: '12px 16px 6px' }}>
          <p className="eyebrow">Session</p>
        </div>
        <SheetItem icon={<Icon.calendar />} onClick={() => go('/')}>
          View the club site
        </SheetItem>
        <SheetItem icon={<Icon.logout />} danger onClick={signOut}>
          Log out{session.admin ? ` (${session.admin.name.split(' ')[0]})` : ''}
        </SheetItem>
      </Sheet>
    </div>
  );
}

export function BackLink({ to, children }) {
  return (
    <Link to={to} className="back-link">
      <Icon.back />
      {children}
    </Link>
  );
}
