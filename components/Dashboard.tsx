"use client";

import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, ChevronDown, ChevronLeft,
  ChevronRight, ChevronsUpDown, CircleHelp, CreditCard, Download, Ellipsis, LayoutDashboard,
  LogOut, Menu, PanelLeftClose, PanelLeftOpen, Plus, Search, Settings, SlidersHorizontal,
  Sparkles, Users, X
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, DashboardMetrics, ManagedUser, UserInput, UserRole, UserStatus } from "@/lib/api";

type Section = "Overview" | "Users" | "Analytics";
type IconType = typeof Users;

const navigation: { label: Section; icon: IconType }[] = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Users", icon: Users },
  { label: "Analytics", icon: Activity }
];

const emptyForm: UserInput = { name: "", email: "", role: "Member", status: "Active" };

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function ChartCard({
  title, description, children, action
}: {
  title: string; description: string; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <section className="panel chart-panel">
      <div className="panel-heading">
        <div><h2>{title}</h2><p>{description}</p></div>
        {action}
      </div>
      {children}
    </section>
  );
}

function RevenueChart({ data }: { data: DashboardMetrics["revenue"] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const width = 620;
  const height = 214;
  const pad = { top: 18, right: 10, bottom: 30, left: 42 };
  const max = Math.max(...data.map((item) => item.value), 1) * 1.15;
  const points = data.map((item, index) => ({
    x: pad.left + (data.length === 1 ? (width - pad.left - pad.right) / 2 : (index * (width - pad.left - pad.right)) / (data.length - 1)),
    y: pad.top + (1 - item.value / max) * (height - pad.top - pad.bottom),
    ...item
  }));
  const path = points.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" ");
  const area = points.length
    ? `${path} L ${points[points.length - 1].x} ${height - pad.bottom} L ${points[0].x} ${height - pad.bottom} Z`
    : "";

  return (
    <div className="chart-visual">
      {data.length === 0 ? <div className="empty-chart">No revenue data available yet.</div> : (
        <>
          <div className="chart-legend"><span><i /> Revenue</span><span className="chart-total">$72,840 <small>this year</small></span></div>
          <svg aria-label="Revenue growth chart" className="line-chart" role="img" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
            <defs><linearGradient id="revenue-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#4978ed" stopOpacity=".15" /><stop offset="100%" stopColor="#4978ed" stopOpacity="0" /></linearGradient></defs>
            {[0, 1, 2, 3].map((line) => {
              const y = pad.top + (line * (height - pad.top - pad.bottom)) / 3;
              return <g key={line}><line className="chart-grid-line" x1={pad.left} x2={width - pad.right} y1={y} y2={y} /><text className="chart-axis-label" x="0" y={y + 4}>${Math.round((max * (3 - line)) / 3)}k</text></g>;
            })}
            <path d={area} fill="url(#revenue-fill)" />
            <path className="revenue-line" d={path} />
            {points.map((point, index) => (
              <g key={point.label} onMouseEnter={() => setHovered(index)} onMouseLeave={() => setHovered(null)}>
                <circle className="chart-hover-target" cx={point.x} cy={point.y} r="13" />
                <circle className={`chart-dot ${hovered === index ? "is-hovered" : ""}`} cx={point.x} cy={point.y} r="4" />
                {hovered === index && <g><rect className="chart-tooltip-bg" height="27" rx="6" width="82" x={Math.min(Math.max(point.x - 41, 42), width - 92)} y={point.y - 38} /><text className="chart-tooltip-text" textAnchor="middle" x={Math.min(Math.max(point.x, 83), width - 51)} y={point.y - 21}>{formatMoney(point.value * 1000)}</text></g>}
              </g>
            ))}
            {points.map((point) => <text className="chart-axis-label chart-month" key={`label-${point.label}`} textAnchor="middle" x={point.x} y={height - 6}>{point.label}</text>)}
          </svg>
        </>
      )}
    </div>
  );
}

function ActivityChart({ data }: { data: DashboardMetrics["activity"] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(...data.map((item) => item.value), 1);
  return (
    <div className="activity-chart">
      {data.length === 0 ? <div className="empty-chart">No activity data available yet.</div> : data.map((item, index) => (
        <div className="activity-column" key={item.label} onMouseEnter={() => setHovered(index)} onMouseLeave={() => setHovered(null)}>
          <div className="activity-bar-track">
            {hovered === index && <span className="activity-tooltip">{item.value} users</span>}
            <div className={`activity-bar ${hovered === index ? "is-hovered" : ""}`} style={{ height: `${Math.max((item.value / max) * 100, 4)}%` }} />
          </div>
          <span className="activity-label">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function UserModal({
  user, onClose, onSave, saving
}: {
  user: ManagedUser | null; onClose: () => void; onSave: (value: UserInput) => Promise<void>; saving: boolean;
}) {
  const [form, setForm] = useState<UserInput>(user ? {
    name: user.name, email: user.email, role: user.role, status: user.status
  } : emptyForm);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await onSave({ ...form, name: form.name.trim(), email: form.email.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save this user.");
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section aria-labelledby="user-modal-title" aria-modal="true" className="user-modal" role="dialog">
        <div className="modal-heading">
          <div><p className="eyebrow">{user ? "WORKSPACE MEMBER" : "NEW WORKSPACE MEMBER"}</p><h2 id="user-modal-title">{user ? "Edit user" : "Add a user"}</h2></div>
          <button aria-label="Close dialog" className="icon-button" onClick={onClose} type="button"><X size={19} /></button>
        </div>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <form className="user-form" onSubmit={submit}>
          <label htmlFor="user-name">Full name</label>
          <input autoFocus id="user-name" maxLength={80} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Alex Morgan" required value={form.name} />
          <label htmlFor="user-email">Email address</label>
          <input id="user-email" maxLength={254} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="alex@company.com" required type="email" value={form.email} />
          <div className="form-columns">
            <div><label htmlFor="user-role">Role</label><select id="user-role" onChange={(event) => setForm({ ...form, role: event.target.value as UserRole })} value={form.role}><option>Admin</option><option>Member</option><option>Viewer</option></select></div>
            <div><label htmlFor="user-status">Status</label><select id="user-status" onChange={(event) => setForm({ ...form, status: event.target.value as UserStatus })} value={form.status}><option>Active</option><option>Invited</option><option>Suspended</option></select></div>
          </div>
          <div className="modal-actions">
            <button className="secondary-button" onClick={onClose} type="button">Cancel</button>
            <button className="primary-button" disabled={saving} type="submit">{saving ? "Saving..." : user ? "Save changes" : "Add user"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [section, setSection] = useState<Section>("Overview");
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [problem, setProblem] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All status");
  const [page, setPage] = useState(1);
  const [modalUser, setModalUser] = useState<ManagedUser | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const pageSize = 6;

  async function loadData() {
    setLoading(true);
    setProblem("");
    try {
      const [loadedUsers, loadedMetrics] = await Promise.all([api.getUsers(), api.getMetrics()]);
      setUsers(loadedUsers);
      setMetrics(loadedMetrics);
    } catch (err) {
      setProblem(err instanceof Error ? err.message : "Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadData(); }, []);

  const filteredUsers = useMemo(() => users.filter((user) => {
    const query = search.trim().toLowerCase();
    return (!query || user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query))
      && (filter === "All status" || user.status === filter);
  }), [users, search, filter]);
  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const visibleUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);

  async function saveUser(value: UserInput) {
    setSaving(true);
    try {
      const saved = modalUser ? await api.updateUser(modalUser.id, value) : await api.createUser(value);
      setUsers((previous) => modalUser
        ? previous.map((item) => item.id === saved.id ? saved : item)
        : [saved, ...previous]);
      setModalOpen(false);
      setNotice(modalUser ? "User details updated." : "User added to your workspace.");
      setProblem("");
    } finally {
      setSaving(false);
    }
  }

  async function removeUser(user: ManagedUser) {
    if (!window.confirm(`Remove ${user.name} from your workspace?`)) return;
    setProblem("");
    try {
      await api.deleteUser(user.id);
      setUsers((previous) => previous.filter((item) => item.id !== user.id));
      setNotice(`${user.name} was removed.`);
    } catch (err) {
      setProblem(err instanceof Error ? err.message : "Unable to remove this user.");
    }
  }

  async function logout() {
    setLoggingOut(true);
    try {
      await api.logout();
      router.replace("/login");
      router.refresh();
    } catch (err) {
      setProblem(err instanceof Error ? err.message : "Unable to sign out. Please try again.");
      setLoggingOut(false);
    }
  }

  function exportUsers() {
    const rows = [
      ["Name", "Email", "Role", "Status", "Joined"],
      ...users.map((user) => [user.name, user.email, user.role, user.status, user.joinedAt])
    ];
    const csv = rows.map((row) => row.map((value) => {
      const safeValue = /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value;
      return `"${safeValue.replace(/"/g, '""')}"`;
    }).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "northstar-users.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setNotice(`Exported ${users.length} workspace members.`);
  }

  function openCreate() {
    setModalUser(null);
    setModalOpen(true);
  }

  const currentMetrics = metrics ?? {
    totalUsers: users.length, activeSubscriptions: 0, mrr: 0, conversionRate: 0,
    revenue: [], activity: []
  };

  return (
    <div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      {sidebarOpen && <button aria-label="Close navigation" className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand-row">
          <a className="brand-lockup sidebar-brand" href="/dashboard"><div className="brand-mark"><Sparkles size={19} /></div><span>northstar<span className="brand-dot">.</span></span></a>
          <button aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} className="icon-button sidebar-collapse-button" onClick={() => setSidebarCollapsed((collapsed) => !collapsed)} title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} type="button">
            {sidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
        </div>
        <div className="workspace-switcher">
          <div className="workspace-avatar">N</div>
          <div className="workspace-copy"><strong>Northstar Studio</strong><span>Pro workspace</span></div>
          <ChevronsUpDown size={15} />
        </div>
        <span className="nav-caption">WORKSPACE</span>
        <nav className="main-nav" aria-label="Main navigation">
          {navigation.map(({ label, icon: NavIcon }) => (
            <button aria-label={label} aria-current={section === label ? "page" : undefined} className={`nav-item ${section === label ? "nav-item-active" : ""}`} key={label} onClick={() => { setSection(label); setSidebarOpen(false); }} type="button">
              <NavIcon size={18} strokeWidth={1.8} /><span className="nav-label">{label}</span>{label === "Users" && <span className="nav-count">{users.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card"><div className="help-icon"><CircleHelp size={17} /></div><strong>Need a hand?</strong><p>Our team is always here to help.</p><a href="mailto:support@northstar.example">Get in touch <ArrowRight size={13} /></a></div>
          <button aria-label="Settings" className="nav-item settings-nav" onClick={() => setNotice("Workspace settings are coming soon.")} type="button"><Settings size={18} strokeWidth={1.8} /><span className="nav-label">Settings</span></button>
          <div className="sidebar-foot">© 2026 Northstar Inc.</div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button aria-label="Open navigation" className="icon-button mobile-menu" onClick={() => setSidebarOpen(true)} type="button"><Menu size={21} /></button>
          <div className="breadcrumbs"><span>Workspace</span><ChevronRight size={15} /><strong>{section}</strong></div>
          <div className="topbar-actions">
            <button className="topbar-date" type="button">Last 30 days <ChevronDown size={14} /></button>
            <button aria-label="Notifications" className="icon-button notification-button" onClick={() => setNotice("You’re all caught up. No new notifications.")} type="button"><Bell size={18} /><i /></button>
            <div className="profile-wrap">
              <button aria-expanded={profileOpen} className="profile-button" onClick={() => setProfileOpen((open) => !open)} type="button">
                <span className="avatar avatar-admin">JD</span><span className="profile-copy"><strong>Jordan Davis</strong><small>Workspace admin</small></span><ChevronDown size={15} />
              </button>
              {profileOpen && <div className="profile-menu"><div className="profile-menu-heading">Signed in as<br /><strong>admin@northstar.io</strong></div><button disabled={loggingOut} onClick={logout} type="button"><LogOut size={15} />{loggingOut ? "Signing out..." : "Sign out"}</button></div>}
            </div>
          </div>
        </header>

        <div className="page-content">
          <div className="page-heading">
            <div><p className="eyebrow">MONDAY, OCTOBER 12</p><h1>{section === "Overview" ? "Good morning, Jordan" : section === "Users" ? "Your people" : "Analytics"}</h1><p className="page-subtitle">{section === "Users" ? "Manage the people who make your workspace." : "Here’s what’s happening with your business today."}</p></div>
            <div className="heading-actions"><button className="secondary-button export-button" onClick={exportUsers} type="button"><Download size={16} /> Export</button><button className="primary-button" onClick={openCreate} type="button"><Plus size={17} /> Add user</button></div>
          </div>

          {problem && <div className="alert alert-error dashboard-alert" role="alert"><span>{problem}</span><button aria-label="Dismiss error" className="icon-button" onClick={() => setProblem("")} type="button"><X size={16} /></button></div>}
          {notice && <div className="alert alert-success dashboard-alert" role="status"><span>{notice}</span><button aria-label="Dismiss notification" className="icon-button" onClick={() => setNotice("")} type="button"><X size={16} /></button></div>}

          {section !== "Users" && (
            <>
              <div className="metrics-grid">
                <MetricCard icon={Users} label="Total users" value={loading ? "—" : currentMetrics.totalUsers.toLocaleString()} change="+12.8%" positive />
                <MetricCard icon={CreditCard} label="Active subscriptions" value={loading ? "—" : currentMetrics.activeSubscriptions.toLocaleString()} change="+8.2%" positive />
                <MetricCard icon={Activity} label="Monthly recurring revenue" value={loading ? "—" : formatMoney(currentMetrics.mrr)} change="+14.6%" positive isMoney />
                <MetricCard icon={Sparkles} label="Conversion rate" value={loading ? "—" : `${currentMetrics.conversionRate.toFixed(1)}%`} change="-0.4%" positive={false} />
              </div>
              <div className={`charts-grid ${section === "Analytics" ? "charts-expanded" : ""}`}>
                <ChartCard action={<button className="chart-period" type="button">This year <ChevronDown size={13} /></button>} description="A steady climb. Keep that momentum going." title="Revenue growth">
                  <RevenueChart data={currentMetrics.revenue} />
                </ChartCard>
                <ChartCard action={<button aria-label="More activity options" className="icon-button chart-more" onClick={() => setNotice("Showing this week’s activity.")} type="button"><Ellipsis size={19} /></button>} description="Your community is showing up." title="User activity">
                  <ActivityChart data={currentMetrics.activity} />
                </ChartCard>
              </div>
            </>
          )}

          {section !== "Analytics" && <section className="panel users-panel">
            <div className="users-heading">
              <div><div className="section-title-row"><h2>Team members</h2><span className="member-count">{filteredUsers.length}</span></div><p>Everyone who has access to your workspace.</p></div>
              <div className="table-tools">
                <label className="search-box"><Search size={16} /><input aria-label="Search users" onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search users..." value={search} /></label>
                <label className="filter-box"><SlidersHorizontal size={15} /><select aria-label="Filter by status" onChange={(event) => { setFilter(event.target.value); setPage(1); }} value={filter}><option>All status</option><option>Active</option><option>Invited</option><option>Suspended</option></select><ChevronDown size={14} /></label>
                <button aria-label="More table options" className="icon-button table-more" onClick={() => setNotice("Showing all workspace members.")} type="button"><Ellipsis size={20} /></button>
              </div>
            </div>
            <div className="table-scroll"><table className="users-table">
              <thead><tr><th>NAME</th><th>ROLE</th><th>STATUS</th><th>JOINED</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {loading ? <tr><td className="table-empty" colSpan={5}>Loading workspace members...</td></tr>
                  : visibleUsers.length === 0 ? <tr><td className="table-empty" colSpan={5}><div className="empty-table"><Users size={22} /><strong>No members found</strong><span>Try changing your search or filter.</span></div></td></tr>
                    : visibleUsers.map((user, index) => <UserRow key={user.id} user={user} index={index} onEdit={() => { setModalUser(user); setModalOpen(true); }} onDelete={() => void removeUser(user)} />)}
              </tbody>
            </table></div>
            <div className="table-footer"><span>Showing <strong>{filteredUsers.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filteredUsers.length)}</strong> of <strong>{filteredUsers.length}</strong> members</span><div className="pagination"><button aria-label="Previous page" className="icon-button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} type="button"><ChevronLeft size={17} /></button><span>{page} / {pageCount}</span><button aria-label="Next page" className="icon-button" disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)} type="button"><ChevronRight size={17} /></button></div></div>
          </section>}
          <footer className="page-footer"><span>Made for the people building what’s next.</span><span><i /> All systems operational</span></footer>
        </div>
      </main>
      {modalOpen && <UserModal key={modalUser?.id ?? "new-user"} user={modalUser} onClose={() => setModalOpen(false)} onSave={saveUser} saving={saving} />}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, change, positive, isMoney = false }: {
  icon: IconType; label: string; value: string; change: string; positive: boolean; isMoney?: boolean;
}) {
  return (
    <section className="panel metric-card">
      <div className="metric-topline"><span>{label}</span><div className="metric-icon"><Icon size={17} strokeWidth={1.8} /></div></div>
      <strong className={`metric-value ${isMoney ? "money-value" : ""}`}>{value}</strong>
      <div className="metric-foot"><span className={positive ? "change-positive" : "change-negative"}>{positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{change}</span><span>vs. last month</span></div>
    </section>
  );
}

function UserRow({ user, index, onEdit, onDelete }: {
  user: ManagedUser; index: number; onEdit: () => void; onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <tr>
      <td><div className="user-identity"><span className={`avatar user-avatar avatar-tone-${index % 5}`}>{initials(user.name)}</span><span><strong>{user.name}</strong><small>{user.email}</small></span></div></td>
      <td><span className={`role-pill role-${user.role.toLowerCase()}`}>{user.role}</span></td>
      <td><span className={`status-pill status-${user.status.toLowerCase()}`}><i />{user.status}</span></td>
      <td className="joined-date">{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(user.joinedAt))}</td>
      <td className="row-actions"><button aria-expanded={menuOpen} aria-label={`Actions for ${user.name}`} className="icon-button" onClick={() => setMenuOpen((open) => !open)} type="button"><Ellipsis size={19} /></button>{menuOpen && <div className="row-menu"><button onClick={() => { setMenuOpen(false); onEdit(); }} type="button">Edit user</button><button className="delete-action" onClick={() => { setMenuOpen(false); onDelete(); }} type="button">Remove user</button></div>}</td>
    </tr>
  );
}
