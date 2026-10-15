import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  api,
  type Certificate,
  type EventInput,
  type EventItem,
  type Notification,
  type NotificationInput,
  type Registration,
  type User,
} from "./api";

type Page = "discover" | "dashboard" | "notifications" | "admin";
type AuthMode = "login" | "register";

const TOKEN_KEY = "campus-event-token";
const USER_KEY = "campus-event-user";

function readSavedUser(): User | null {
  const saved = localStorage.getItem(USER_KEY);
  if (!saved) return null;
  try {
    return JSON.parse(saved) as User;
  } catch {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
}

function formatDate(value: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(undefined, options ?? {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export default function App() {
  const [user, setUser] = useState<User | null>(readSavedUser);
  const [page, setPage] = useState<Page>("discover");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [adminRegistrations, setAdminRegistrations] = useState<Registration[]>([]);
  const [gatewayOnline, setGatewayOnline] = useState<boolean | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authOpen, setAuthOpen] = useState(false);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const isAdmin = user?.role?.toUpperCase() === "ADMIN";

  const notify = (message: string) => setNotice(message);
  const refresh = () => setReloadKey((value) => value + 1);

  const checkGateway = useCallback(async () => {
    try {
      const health = await api.health();
      setGatewayOnline(health.status === "UP");
    } catch {
      setGatewayOnline(false);
    }
  }, []);

  useEffect(() => {
    void checkGateway();
    const timer = window.setInterval(() => void checkGateway(), 20000);
    return () => window.clearInterval(timer);
  }, [checkGateway]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const load = async () => {
      try {
        const eventList = await api.events();
        if (cancelled) return;
        setEvents(eventList);
        if (!user) {
          setRegistrations([]);
          setCertificates([]);
          setNotifications([]);
          setAdminRegistrations([]);
          return;
        }
        const [myRegistrations, myCertificates, myNotifications] = await Promise.all([
          api.myRegistrations(),
          api.myCertificates(),
          api.myNotifications(),
        ]);
        if (cancelled) return;
        setRegistrations(myRegistrations);
        setCertificates(myCertificates);
        setNotifications(myNotifications);
        if (user.role.toUpperCase() === "ADMIN") {
          setAdminRegistrations(await api.allRegistrations());
        } else {
          setAdminRegistrations([]);
        }
      } catch (error) {
        if (!cancelled) notify(error instanceof Error ? error.message : "Could not load application data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [user, reloadKey]);

  const filteredEvents = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return events;
    return events.filter((event) =>
      `${event.title} ${event.description} ${event.venue}`.toLowerCase().includes(term),
    );
  }, [events, query]);

  const signOut = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setPage("discover");
    notify("You have been signed out.");
  };

  const handleAuth = async (mode: AuthMode, fields: { fullName?: string; email: string; password: string }) => {
    setBusy(true);
    try {
      if (mode === "register") {
        await api.registerAccount({
          fullName: fields.fullName ?? "",
          email: fields.email,
          password: fields.password,
        });
      }
      const result = await api.login({ email: fields.email, password: fields.password });
      localStorage.setItem(TOKEN_KEY, result.accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(result.user));
      setUser(result.user);
      setAuthOpen(false);
      setPage("discover");
      notify(mode === "register" ? "Your account is ready. Welcome to Campusly!" : `Welcome back, ${result.user.fullName.split(" ")[0]}.`);
      refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async (eventId: number) => {
    if (!user) {
      setAuthMode("login");
      setAuthOpen(true);
      return;
    }
    setBusy(true);
    try {
      await api.register(eventId);
      notify("You're registered! Your registration is awaiting approval.");
      refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not register for this event.");
    } finally {
      setBusy(false);
    }
  };

  const saveEvent = async (body: EventInput, eventId?: number) => {
    setBusy(true);
    try {
      if (eventId) await api.updateEvent(eventId, body);
      else await api.createEvent(body);
      setEventModalOpen(false);
      setEditingEvent(null);
      notify(eventId ? "Event updated." : "Event published.");
      refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not save the event.");
    } finally {
      setBusy(false);
    }
  };

  const deleteEvent = async (event: EventItem) => {
    if (!window.confirm(`Close "${event.title}"? It will no longer appear in discovery.`)) return;
    try {
      await api.deleteEvent(event.id);
      notify("Event closed.");
      refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not close the event.");
    }
  };

  const updateRegistrationStatus = async (registration: Registration, status: string) => {
    try {
      await api.updateRegistration(registration.id, status);
      notify(`Registration #${registration.id} marked ${status.toLowerCase()}.`);
      refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not update registration.");
    }
  };

  const issueCertificate = async (registration: Registration) => {
    if (!user) return;
    try {
      await api.issueCertificate(registration.id, user.fullName);
      notify("Your certificate is ready.");
      refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not issue the certificate.");
    }
  };

  const sendNotification = async (body: NotificationInput) => {
    setBusy(true);
    try {
      await api.sendNotification(body);
      notify("Notification queued.");
      refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not queue notification.");
    } finally {
      setBusy(false);
    }
  };

  const registeredEventIds = useMemo(
    () => new Set(registrations.map((registration) => registration.eventId)),
    [registrations],
  );
  const upcomingCount = events.filter((event) => new Date(event.startsAt) >= new Date()).length;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setPage("discover"); }}>
          <span className="brand-mark">C</span>
          <span>campusly<span className="brand-dot">.</span><small>EVENTS, TOGETHER</small></span>
        </a>
        <div className="sidebar-label">MENU</div>
        <nav className="side-nav" aria-label="Main navigation">
          <NavButton active={page === "discover"} onClick={() => setPage("discover")} mark="✦">Discover events</NavButton>
          {user && <NavButton active={page === "dashboard"} onClick={() => setPage("dashboard")} mark="▦">My activity</NavButton>}
          {user && <NavButton active={page === "notifications"} onClick={() => setPage("notifications")} mark="◇">Notifications</NavButton>}
          {isAdmin && <NavButton active={page === "admin"} onClick={() => setPage("admin")} mark="⌘">Manage campus</NavButton>}
        </nav>
        <div className="sidebar-bottom">
          <div className={`connection-card ${gatewayOnline ? "is-online" : gatewayOnline === false ? "is-offline" : ""}`}>
            <span className="connection-dot" />
            <div><strong>{gatewayOnline ? "Systems connected" : gatewayOnline === false ? "API unavailable" : "Checking connection"}</strong><small>{gatewayOnline ? "Gateway is responding" : "Gateway · localhost:8080"}</small></div>
          </div>
          <div className="sidebar-foot">Made for campus life <span>© 2026</span></div>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark">C</span> campusly<span className="brand-dot">.</span></div>
          <div className="breadcrumbs"><span>Campus</span><b>/</b><strong>{pageTitle(page)}</strong></div>
          <div className="topbar-actions">
            {user ? (
              <div className="account-menu">
                <span className="avatar">{initials(user.fullName)}</span>
                <span className="account-name">{user.fullName}<small>{user.role.toLowerCase()}</small></span>
                <button className="text-button" onClick={signOut}>Sign out</button>
              </div>
            ) : (
              <>
                <button className="text-button" onClick={() => { setAuthMode("login"); setAuthOpen(true); }}>Log in</button>
                <button className="button button-dark button-small" onClick={() => { setAuthMode("register"); setAuthOpen(true); }}>Create account <span>↗</span></button>
              </>
            )}
          </div>
        </header>

        {notice && <div className="toast" role="status"><span>{notice}</span><button aria-label="Dismiss message" onClick={() => setNotice("")}>×</button></div>}

        <main className="page-content">
          {page === "discover" && (
            <>
              <section className="hero">
                <div className="hero-copy">
                  <div className="eyebrow"><span className="eyebrow-line" /> YOUR CAMPUS, YOUR CALENDAR</div>
                  <h1>Find your next<br /><em>big moment.</em></h1>
                  <p>Good things happen when we show up. Discover what's happening across campus and save your seat.</p>
                  <a className="hero-link" href="#events">Explore events <span>↓</span></a>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <div className="sun-disc" />
                  <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
                  <div className="art-block block-one" /><div className="art-block block-two" />
                  <div className="art-note note-one">IDEAS<br />IN MOTION</div>
                  <div className="art-note note-two">SHOW<br />UP.</div>
                  <div className="art-spark">✳</div>
                </div>
                <div className="hero-foot"><span><b>{upcomingCount.toString().padStart(2, "0")}</b> upcoming events</span><span>Scroll to find your people <b>↓</b></span></div>
              </section>
              <section className="events-section" id="events">
                <div className="section-heading">
                  <div><div className="eyebrow"><span className="eyebrow-line" /> THE CAMPUS CALENDAR</div><h2>Happening <em>soon.</em></h2></div>
                  <label className="search-box"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search events..." aria-label="Search events" /><kbd>⌘ K</kbd></label>
                </div>
                {loading ? <LoadingState /> : filteredEvents.length === 0 ? (
                  <EmptyState title={query ? "No events match that search." : "Nothing on the calendar just yet."} body={query ? "Try another title, venue, or keyword." : "Check back soon for the next campus gathering."} />
                ) : (
                  <div className="event-grid">
                    {filteredEvents.map((event, index) => (
                      <EventCard key={event.id} event={event} index={index} registered={registeredEventIds.has(event.id)} loggedIn={!!user} isAdmin={!!isAdmin} busy={busy}
                        onRegister={() => void handleRegister(event.id)}
                        onEdit={() => { setEditingEvent(event); setEventModalOpen(true); }}
                        onDelete={() => void deleteEvent(event)} />
                    ))}
                  </div>
                )}
              </section>
              <footer className="page-footer"><span>Find your people. Make it count.</span><span>Campusly <b>·</b> Built for campus life</span></footer>
            </>
          )}

          {page === "dashboard" && user && (
            <Dashboard user={user} events={events} registrations={registrations} certificates={certificates}
              onDiscover={() => setPage("discover")} onIssue={(registration) => void issueCertificate(registration)} />
          )}

          {page === "notifications" && user && (
            <NotificationsPage notifications={notifications} user={user} busy={busy} onSend={(body) => void sendNotification(body)} />
          )}

          {page === "admin" && isAdmin && (
            <AdminPage events={events} registrations={adminRegistrations} user={user} loading={loading}
              onCreate={() => { setEditingEvent(null); setEventModalOpen(true); }}
              onEdit={(event) => { setEditingEvent(event); setEventModalOpen(true); }}
              onDelete={(event) => void deleteEvent(event)}
              onStatus={(registration, status) => void updateRegistrationStatus(registration, status)} />
          )}

          {page !== "discover" && !user && (
            <EmptyState title="Sign in to view this page." body="Log in to your campus account to see your activity." />
          )}
        </main>
      </div>

      {authOpen && <AuthModal mode={authMode} busy={busy} onModeChange={setAuthMode} onClose={() => setAuthOpen(false)} onSubmit={(mode, fields) => void handleAuth(mode, fields)} />}
      {eventModalOpen && isAdmin && <EventModal event={editingEvent} busy={busy} onClose={() => { setEventModalOpen(false); setEditingEvent(null); }} onSave={(body) => void saveEvent(body, editingEvent?.id)} />}
    </div>
  );
}

function pageTitle(page: Page) {
  return { discover: "Discover", dashboard: "My activity", notifications: "Notifications", admin: "Manage campus" }[page];
}

function NavButton({ active, onClick, mark, children }: { active: boolean; onClick: () => void; mark: string; children: string }) {
  return <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick}><span className="nav-mark">{mark}</span>{children}{active && <span className="nav-arrow">↗</span>}</button>;
}

function EventCard({ event, index, registered, loggedIn, isAdmin, busy, onRegister, onEdit, onDelete }: {
  event: EventItem; index: number; registered: boolean; loggedIn: boolean; isAdmin: boolean; busy: boolean;
  onRegister: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const start = new Date(event.startsAt);
  const colors = ["card-lilac", "card-peach", "card-green", "card-blue"];
  return (
    <article className="event-card">
      <div className={`event-visual ${colors[index % colors.length]}`}>
        <div className="event-date"><strong>{start.toLocaleDateString(undefined, { day: "2-digit" })}</strong><span>{start.toLocaleDateString(undefined, { month: "short" }).toUpperCase()}</span></div>
        <div className="event-visual-shape"><span>{String(index + 1).padStart(2, "0")}</span></div>
        <span className="event-category">{event.venue}</span>
        {isAdmin && <div className="card-admin-actions"><button title="Edit event" onClick={onEdit}>Edit</button><button title="Close event" onClick={onDelete}>Close</button></div>}
      </div>
      <div className="event-info">
        <div className="event-time">{formatDate(event.startsAt, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</div>
        <h3>{event.title}</h3>
        <p>{event.description}</p>
        <div className="event-card-bottom"><span className="capacity-label"><span className="tiny-dot" /> {event.capacity} seats</span>
          <button className={`round-action ${registered ? "is-registered" : ""}`} aria-label={registered ? "Already registered" : loggedIn ? "Register for event" : "Log in to register"} disabled={busy || registered} onClick={onRegister}>{registered ? "✓" : "↗"}</button>
        </div>
      </div>
    </article>
  );
}

function LoadingState() {
  return <div className="loading-state"><span className="spinner" /> Loading campus events...</div>;
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return <div className="empty-state"><span className="empty-mark">✳</span><h3>{title}</h3><p>{body}</p></div>;
}

function Dashboard({ user, events, registrations, certificates, onDiscover, onIssue }: {
  user: User; events: EventItem[]; registrations: Registration[]; certificates: Certificate[];
  onDiscover: () => void; onIssue: (registration: Registration) => void;
}) {
  const eventById = new Map(events.map((event) => [event.id, event]));
  const certificateRegistrationIds = new Set(certificates.map((certificate) => certificate.registrationId));
  return (
    <section className="dashboard-page">
      <PageIntro eyebrow="YOUR CAMPUS STORY" title={<>Good to see you,<br /><em>{user.fullName.split(" ")[0]}.</em></>} body="Your plans, your people, and the moments worth showing up for." />
      <div className="stats-grid">
        <StatCard label="YOUR EVENTS" number={registrations.length.toString().padStart(2, "0")} note="All your registrations" mark="✦" />
        <StatCard label="UP NEXT" number={registrations.filter((item) => item.status !== "CANCELLED").length.toString().padStart(2, "0")} note="Events on your list" mark="↗" />
        <StatCard label="CERTIFICATES" number={certificates.length.toString().padStart(2, "0")} note="Moments you've earned" mark="✳" />
      </div>
      <div className="content-panel">
        <div className="panel-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> YOUR LINEUP</div><h2>Events you're <em>in.</em></h2></div><button className="button button-outline" onClick={onDiscover}>Find more events <span>↗</span></button></div>
        {registrations.length === 0 ? <EmptyState title="Your next story starts here." body="Register for an event and it will show up in your activity." /> : (
          <div className="table-wrap"><table><thead><tr><th>EVENT</th><th>REGISTERED</th><th>STATUS</th><th>RECOGNITION</th></tr></thead><tbody>
            {registrations.map((registration) => {
              const event = eventById.get(registration.eventId);
              return <tr key={registration.id}><td><strong>{event?.title ?? `Campus event #${registration.eventId}`}</strong><small>{event?.venue ?? "Event details unavailable"}</small></td><td>{formatDate(registration.registeredAt)}</td><td><StatusPill status={registration.status} /></td><td>{registration.status === "APPROVED" && !certificateRegistrationIds.has(registration.id) ? <button className="inline-action" onClick={() => onIssue(registration)}>Get certificate ↗</button> : certificateRegistrationIds.has(registration.id) ? <span className="muted">Issued</span> : <span className="muted">Pending approval</span>}</td></tr>;
            })}
          </tbody></table></div>
        )}
      </div>
      {certificates.length > 0 && <div className="content-panel certificate-panel"><div className="panel-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> PROOF YOU WERE THERE</div><h2>Earned <em>moments.</em></h2></div><button className="button button-outline" onClick={() => window.print()}>Print page <span>↗</span></button></div>
        <div className="certificate-grid">{certificates.map((certificate) => <CertificateCard key={certificate.id} certificate={certificate} eventTitle={eventById.get(certificate.eventId)?.title} />)}</div>
      </div>}
    </section>
  );
}

function StatCard({ label, number, note, mark }: { label: string; number: string; note: string; mark: string }) {
  return <div className="stat-card"><div className="stat-top"><span>{label}</span><b>{mark}</b></div><strong>{number}</strong><small>{note}</small></div>;
}

function StatusPill({ status }: { status: string }) {
  return <span className={`status-pill status-${status.toLowerCase()}`}>{status.toLowerCase()}</span>;
}

function CertificateCard({ certificate, eventTitle }: { certificate: Certificate; eventTitle?: string }) {
  return <article className="certificate-card"><div className="certificate-top"><span>✳ CAMPUSLY</span><span>NO. {certificate.certificateCode.slice(0, 8).toUpperCase()}</span></div><div className="certificate-content"><small>CERTIFICATE OF PARTICIPATION</small><strong>{certificate.recipientName}</strong><p>For showing up and participating in<br /><b>{eventTitle ?? `Campus event #${certificate.eventId}`}</b></p></div><div className="certificate-bottom"><span>ISSUED {formatDate(certificate.issuedAt, { month: "short", day: "numeric", year: "numeric" }).toUpperCase()}</span><span>✦</span></div></article>;
}

function NotificationsPage({ notifications, user, busy, onSend }: { notifications: Notification[]; user: User; busy: boolean; onSend: (body: NotificationInput) => void }) {
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSend({
      channel: String(form.get("channel")),
      recipient: String(form.get("recipient")),
      subject: String(form.get("subject")),
      message: String(form.get("message")),
    });
    event.currentTarget.reset();
  };
  return <section className="dashboard-page">
    <PageIntro eyebrow="STAY IN THE LOOP" title={<>A little less<br /><em>out of the loop.</em></>} body="Notifications and updates connected to your campus account." />
    <div className="notification-layout">
      <div className="content-panel"><div className="panel-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> YOUR INBOX</div><h2>Recent <em>updates.</em></h2></div></div>
        {notifications.length === 0 ? <EmptyState title="All quiet for now." body="Notifications related to your account will appear here." /> : <div className="notification-list">{notifications.map((notification) => <article className="notification-item" key={notification.id}><div className="notification-icon">✳</div><div><div className="notification-meta"><strong>{notification.subject}</strong><span>{formatDate(notification.createdAt)}</span></div><p>{notification.message}</p><small>{notification.channel} · {notification.recipient} · {notification.status.toLowerCase()}</small></div></article>)}</div>}
      </div>
      <form className="content-panel notification-form" onSubmit={submit}><div className="eyebrow"><span className="eyebrow-line" /> SEND YOURSELF A NOTE</div><h2>Queue a <em>notification.</em></h2><p className="form-caption">This adds a notification record to your account; delivery depends on the notification service configuration.</p>
        <label>Channel<select name="channel" required defaultValue="EMAIL"><option value="EMAIL">Email</option><option value="IN_APP">In-app</option></select></label>
        <label>Recipient<input name="recipient" type="email" defaultValue={user.email} required maxLength={190} /></label>
        <label>Subject<input name="subject" required maxLength={180} placeholder="A note to remember" /></label>
        <label>Message<textarea name="message" required maxLength={4000} rows={4} placeholder="Write a short message..." /></label>
        <button className="button button-dark" type="submit" disabled={busy}>{busy ? "Queuing..." : "Queue notification"} <span>↗</span></button>
      </form>
    </div>
  </section>;
}

function AdminPage({ events, registrations, user, loading, onCreate, onEdit, onDelete, onStatus }: {
  events: EventItem[]; registrations: Registration[]; user: User; loading: boolean; onCreate: () => void;
  onEdit: (event: EventItem) => void; onDelete: (event: EventItem) => void;
  onStatus: (registration: Registration, status: string) => void;
}) {
  const eventById = new Map(events.map((event) => [event.id, event]));
  return <section className="dashboard-page">
    <PageIntro eyebrow="CAMPUS OPERATIONS" title={<>Make room for<br /><em>what's next.</em></>} body={`Manage event listings and registrations, ${user.fullName.split(" ")[0]}.`} />
    <div className="admin-toolbar"><div className="admin-kpis"><StatCard label="ACTIVE EVENTS" number={events.length.toString().padStart(2, "0")} note="Currently listed" mark="✦" /><StatCard label="REGISTRATIONS" number={registrations.length.toString().padStart(2, "0")} note="Across all events" mark="↗" /><StatCard label="NEEDS REVIEW" number={registrations.filter((registration) => registration.status === "PENDING").length.toString().padStart(2, "0")} note="Waiting on a decision" mark="◇" /></div><button className="button button-dark" onClick={onCreate}>Create event <span>＋</span></button></div>
    <div className="content-panel"><div className="panel-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> THE CAMPUS CALENDAR</div><h2>Manage <em>events.</em></h2></div></div>
      {events.length === 0 ? <EmptyState title="Your calendar is open." body="Create an event to get the campus together." /> : <div className="table-wrap"><table><thead><tr><th>EVENT</th><th>WHEN</th><th>CAPACITY</th><th>ACTIONS</th></tr></thead><tbody>{events.map((event) => <tr key={event.id}><td><strong>{event.title}</strong><small>{event.venue}</small></td><td>{formatDate(event.startsAt)}</td><td>{event.capacity} seats</td><td><button className="inline-action" onClick={() => onEdit(event)}>Edit</button><button className="inline-action danger-action" onClick={() => onDelete(event)}>Close</button></td></tr>)}</tbody></table></div>}
    </div>
    <div className="content-panel"><div className="panel-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> PARTICIPATION</div><h2>Review <em>registrations.</em></h2></div></div>
      {loading ? <LoadingState /> : registrations.length === 0 ? <EmptyState title="No registrations yet." body="When students sign up, you can review them here." /> : <div className="table-wrap"><table><thead><tr><th>REGISTRATION</th><th>EVENT</th><th>REGISTERED</th><th>STATUS</th><th>REVIEW</th></tr></thead><tbody>{registrations.map((registration) => <tr key={registration.id}><td><strong>#{registration.id}</strong><small>Student #{registration.userId}</small></td><td>{eventById.get(registration.eventId)?.title ?? `Event #${registration.eventId}`}</td><td>{formatDate(registration.registeredAt)}</td><td><StatusPill status={registration.status} /></td><td className="review-actions">{registration.status === "PENDING" ? <><button className="inline-action" onClick={() => onStatus(registration, "APPROVED")}>Approve</button><button className="inline-action danger-action" onClick={() => onStatus(registration, "REJECTED")}>Reject</button></> : <span className="muted">Reviewed</span>}</td></tr>)}</tbody></table></div>}
    </div>
  </section>;
}

function PageIntro({ eyebrow, title, body }: { eyebrow: string; title: React.ReactNode; body: string }) {
  return <div className="page-intro"><div className="eyebrow"><span className="eyebrow-line" /> {eyebrow}</div><h1>{title}</h1><p>{body}</p></div>;
}

function AuthModal({ mode, busy, onModeChange, onClose, onSubmit }: {
  mode: AuthMode; busy: boolean; onModeChange: (mode: AuthMode) => void; onClose: () => void;
  onSubmit: (mode: AuthMode, fields: { fullName?: string; email: string; password: string }) => void;
}) {
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSubmit(mode, {
      fullName: String(form.get("fullName") ?? ""),
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
  };
  return <Modal onClose={onClose}>
    <div className="modal-heading"><div className="eyebrow"><span className="eyebrow-line" /> CAMPUSLY ACCOUNT</div><button className="modal-close" onClick={onClose} aria-label="Close">×</button><h2>{mode === "login" ? <>Welcome <em>back.</em></> : <>Find your <em>people.</em></>}</h2><p>{mode === "login" ? "Sign in to keep your campus plans close." : "Create an account to join the campus calendar."}</p></div>
    <form className="stacked-form" onSubmit={submit}>
      {mode === "register" && <label>Full name<input name="fullName" autoComplete="name" required maxLength={120} placeholder="Alex Morgan" /></label>}
      <label>Email address<input name="email" type="email" autoComplete="email" required maxLength={190} placeholder="you@campus.edu" /></label>
      <label>Password<input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "register" ? 8 : undefined} maxLength={72} placeholder={mode === "register" ? "At least 8 characters" : "Your password"} /></label>
      <button className="button button-dark button-full" type="submit" disabled={busy}>{busy ? "One moment..." : mode === "login" ? "Log in" : "Create student account"} <span>↗</span></button>
      {mode === "register" && <small className="helper-note">New accounts are created with the student role.</small>}
    </form>
    <div className="auth-switch">{mode === "login" ? "New around here?" : "Already have an account?"} <button onClick={() => onModeChange(mode === "login" ? "register" : "login")}>{mode === "login" ? "Create account" : "Log in"}</button></div>
  </Modal>;
}

function EventModal({ event, busy, onClose, onSave }: {
  event: EventItem | null; busy: boolean; onClose: () => void; onSave: (body: EventInput) => void;
}) {
  const submit = (formEvent: React.FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    const form = new FormData(formEvent.currentTarget);
    onSave({
      title: String(form.get("title")),
      description: String(form.get("description")),
      venue: String(form.get("venue")),
      startsAt: String(form.get("startsAt")),
      endsAt: String(form.get("endsAt")),
      capacity: Number(form.get("capacity")),
    });
  };
  return <Modal onClose={onClose}>
    <div className="modal-heading"><div className="eyebrow"><span className="eyebrow-line" /> EVENT DETAILS</div><button className="modal-close" onClick={onClose} aria-label="Close">×</button><h2>{event ? <>Shape the <em>details.</em></> : <>Start something <em>good.</em></>}</h2><p>{event ? "Update the details for this campus event." : "Add a gathering to the campus calendar."}</p></div>
    <form className="stacked-form event-form" onSubmit={submit}>
      <label>Event title<input name="title" defaultValue={event?.title} required maxLength={180} placeholder="e.g. Design for good" /></label>
      <label>Description<textarea name="description" defaultValue={event?.description} rows={3} required maxLength={4000} placeholder="What's happening?" /></label>
      <label>Venue<input name="venue" defaultValue={event?.venue} required maxLength={180} placeholder="Student union, room 204" /></label>
      <div className="form-row"><label>Starts<input name="startsAt" type="datetime-local" defaultValue={event?.startsAt.slice(0, 16)} required /></label><label>Ends<input name="endsAt" type="datetime-local" defaultValue={event?.endsAt.slice(0, 16)} required /></label></div>
      <label>Capacity<input name="capacity" type="number" min="1" defaultValue={event?.capacity ?? 50} required /></label>
      <button className="button button-dark button-full" type="submit" disabled={busy}>{busy ? "Saving..." : event ? "Save changes" : "Publish event"} <span>↗</span></button>
    </form>
  </Modal>;
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true">{children}</section></div>;
}
