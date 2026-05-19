"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";

type Section =
  | "dashboard" | "listeners" | "users" | "flags"
  | "reviews" | "transactions" | "sessions"
  | "anomalies" | "memories";

type TxFilter = "ALL" | "RECHARGE" | "EARNINGS" | "WITHDRAWALS" | "DEDUCTIONS";

type Stats = {
  totalUsers: number; totalListeners: number; activeSessions: number;
  totalSessions: number; totalFlags: number; blacklistedListeners: number;
  totalRevenue: number; totalRecharges: number;
};

type ListenerRow = {
  id: string; userId: string; email: string; publicDisplayId: string;
  available: boolean; blacklisted: boolean; flagCount: number;
  rating: number; totalSessions: number; earnings: number; createdAt: string;
};

type UserRow = {
  id: string; email: string; publicDisplayId: string;
  emailVerified: boolean; active: boolean; balance: number; createdAt: string;
};

type FlagRow = {
  id: string; listenerId: string; listenerEmail: string;
  reason: string; sessionId: string; createdAt: string;
};

type ReviewRow = {
  id: string; listenerEmail: string; userEmail: string;
  rating: number; comment: string; sessionId: string; createdAt: string;
};

type TxRow = {
  id: string; type: string; amount: number;
  userEmail: string; userRole: string; createdAt: string;
};

type SessionRow = {
  id: string; userEmail: string; listenerEmail: string;
  type: string; status: string; durationSeconds: number; createdAt: string;
};

//  Phase 4
type AnomalyRow = {
  sessionId: string; userEmail: string; listenerEmail: string;
  effectivenessScore: number; durationSeconds: number;
  flagged: boolean; engagementLevel: string; createdAt: string;
};

//  Phase 5
type MemoryRow = {
  userEmail: string; totalSessions: number; avgSatisfactionScore: number;
  dominantEmotion: string; recurringStress: boolean;
  emotionalTrend: string; recurringTopics: string; updatedAt: string;
};

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatDuration(secs: number) {
  if (!secs) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}

const txColors: Record<string, string> = {
  RECHARGE: "#22c55e", SESSION_DEBIT: "#ef4444",
  LISTENER_CREDIT: "#22c55e", PLATFORM_COMMISSION: "#f59e0b", WITHDRAWAL: "#ef4444",
};

const txLabels: Record<string, string> = {
  RECHARGE: "Recharge", SESSION_DEBIT: "Call Deduction",
  LISTENER_CREDIT: "Listener Earning", PLATFORM_COMMISSION: "Platform Commission",
  WITHDRAWAL: "Withdrawal",
};

export default function AdminPanel() {
  const router = useRouter();
  const [section, setSection] = useState<Section>("dashboard");
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const [stats, setStats] = useState<Stats | null>(null);
  const [listeners, setListeners] = useState<ListenerRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyRow[]>([]);
  const [memories, setMemories] = useState<MemoryRow[]>([]);
  const [txFilter, setTxFilter] = useState<TxFilter>("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.getMe()
      .then((u) => { if (u.role !== "ADMIN") router.push("/login"); })
      .catch(() => router.push("/login"));
  }, []);

  const loadSection = useCallback(async (sec: Section) => {
    setLoading(true);
    setSearch("");
    try {
      switch (sec) {
        case "dashboard": setStats(await api.adminGetStats()); break;
        case "listeners": setListeners(await api.adminGetListeners()); break;
        case "users": setUsers(await api.adminGetUsers()); break;
        case "flags": setFlags(await api.adminGetFlags()); break;
        case "reviews": setReviews(await api.adminGetReviews()); break;
        case "transactions": setTransactions(await api.adminGetTransactions("ALL")); break;
        case "sessions": setSessions(await api.adminGetSessions()); break;
        case "anomalies": setAnomalies(await api.adminGetAnomalies()); break;
        case "memories": setMemories(await api.adminGetMemories()); break;
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadSection(section); }, [section]);

  useEffect(() => {
    if (section === "transactions") {
      api.adminGetTransactions(txFilter).then(setTransactions).catch(console.error);
    }
  }, [txFilter, section]);

  const showAction = (msg: string) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(null), 3000);
  };

  const handleBlacklist = async (listenerId: string, blacklist: boolean) => {
    try {
      await api.adminBlacklistListener(listenerId, blacklist);
      showAction(blacklist ? "Listener blacklisted" : "Listener unblacklisted");
      setListeners(await api.adminGetListeners());
    } catch (e: unknown) { showAction(e instanceof Error ? e.message : "Failed"); }
  };

  const handleResetFlags = async (listenerId: string) => {
    try {
      await api.adminResetFlags(listenerId);
      showAction("Flags reset successfully");
      setListeners(await api.adminGetListeners());
    } catch (e: unknown) { showAction(e instanceof Error ? e.message : "Failed"); }
  };

  const thStyle: React.CSSProperties = {
    padding: "10px 16px", textAlign: "left", color: "#555", fontSize: 11,
    fontWeight: 600, textTransform: "uppercase", letterSpacing: 1,
    borderBottom: "1px solid #2a2a2a", whiteSpace: "nowrap",
  };

  const tdStyle: React.CSSProperties = {
    padding: "12px 16px", fontSize: 13,
    borderBottom: "1px solid #151515", verticalAlign: "middle",
  };

  const inputStyle: React.CSSProperties = {
    background: "#1a1a1a", border: "1px solid #2a2a2a",
    borderRadius: 8, padding: "8px 14px", color: "#fff", fontSize: 13, outline: "none", width: 240,
  };

  const navBtn = (sec: Section, label: string, icon: string) => (
    <button key={sec} onClick={() => setSection(sec)} style={{
      width: "100%", padding: "12px 16px", textAlign: "left",
      background: section === sec ? "#1a1a1a" : "transparent",
      border: section === sec ? "1px solid #2a2a2a" : "1px solid transparent",
      borderRadius: 10, color: section === sec ? "#fff" : "#555",
      fontSize: 14, fontWeight: section === sec ? 600 : 400,
      cursor: "pointer", marginBottom: 4,
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <span>{icon}</span> {label}
    </button>
  );

  const card = (label: string, value: string | number, color = "#fff", sub?: string) => (
    <div style={{
      background: "#1a1a1a", borderRadius: 14, padding: "20px 24px",
      border: "1px solid #2a2a2a", flex: 1, minWidth: 140,
    }}>
      <p style={{ color: "#555", fontSize: 11, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 1 }}>
        {label}
      </p>
      <p style={{ fontSize: 28, fontWeight: 800, margin: 0, color }}>{value}</p>
      {sub && <p style={{ color: "#444", fontSize: 11, margin: "4px 0 0" }}>{sub}</p>}
    </div>
  );

  const filteredListeners = listeners.filter(l =>
    l.email.toLowerCase().includes(search.toLowerCase()) ||
    l.publicDisplayId.toLowerCase().includes(search.toLowerCase())
  );

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.publicDisplayId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", minHeight: "100vh", background: "#0a0a0a", color: "#fff", display: "flex" }}>

      {/* Sidebar */}
      <div style={{
        width: 220, background: "#111", borderRight: "1px solid #1a1a1a",
        padding: "24px 16px", flexShrink: 0, height: "100vh",
        position: "sticky", top: 0, overflowY: "auto",
      }}>
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 4px", color: "#fff" }}>Express</h2>
          <p style={{ fontSize: 11, color: "#444", margin: 0, textTransform: "uppercase", letterSpacing: 1 }}>Admin Panel</p>
        </div>

        {navBtn("dashboard", "Dashboard", "🏠")}
        {navBtn("listeners", "Listeners", "🎧")}
        {navBtn("users", "Users", "👥")}
        {navBtn("flags", "Flags", "🚩")}
        {navBtn("reviews", "Reviews", "⭐")}
        {navBtn("transactions", "Transactions", "💰")}
        {navBtn("sessions", "Sessions", "📞")}
        {navBtn("anomalies", "Anomalies", "⚠️")}
        {navBtn("memories", "User Profiles", "🧠")}

        <button
          onClick={() => { localStorage.removeItem("token"); router.push("/"); }}
          style={{
            marginTop: 32, width: "100%", padding: "10px",
            background: "transparent", border: "1px solid #2a2a2a",
            borderRadius: 8, color: "#444", fontSize: 13, cursor: "pointer",
          }}
        >Logout</button>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: "32px 40px", overflowY: "auto" }}>

        {/* Toast */}
        {actionMsg && (
          <div style={{
            position: "fixed", top: 24, right: 24, background: "#22c55e", color: "#000",
            padding: "12px 20px", borderRadius: 10, fontWeight: 600, fontSize: 14,
            zIndex: 999, boxShadow: "0 4px 20px rgba(34,197,94,0.3)",
          }}>✅ {actionMsg}</div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", color: "#444", marginTop: 80, fontSize: 14 }}>Loading...</div>
        ) : (
          <>
            {/* ─── DASHBOARD ─── */}
            {section === "dashboard" && stats && (
              <>
                <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 8px" }}>Dashboard</h1>
                <p style={{ color: "#555", fontSize: 14, margin: "0 0 32px" }}>
                  Platform overview — {new Date().toLocaleDateString("en-IN")}
                </p>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
                  {card("Total Users", stats.totalUsers, "#3b82f6")}
                  {card("Total Listeners", stats.totalListeners, "#22c55e")}
                  {card("Active Sessions", stats.activeSessions, "#f59e0b", "Live right now")}
                  {card("Total Sessions", stats.totalSessions)}
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {card("Total Revenue", `₹${stats.totalRevenue.toFixed(2)}`, "#22c55e", "Platform commission")}
                  {card("Total Recharges", `₹${stats.totalRecharges.toFixed(2)}`, "#3b82f6")}
                  {card("Total Flags", stats.totalFlags, stats.totalFlags > 10 ? "#ef4444" : "#f59e0b")}
                  {card("Blacklisted", stats.blacklistedListeners, "#ef4444", "Listeners")}
                </div>
              </>
            )}

            {/* ─── LISTENERS ─── */}
            {section === "listeners" && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                  <div>
                    <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>Listeners</h1>
                    <p style={{ color: "#555", fontSize: 14, margin: 0 }}>{listeners.length} total</p>
                  </div>
                  <input style={inputStyle} placeholder="Search by email..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <div style={{ background: "#111", borderRadius: 14, border: "1px solid #1a1a1a", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Email</th>
                        <th style={thStyle}>Rating</th>
                        <th style={thStyle}>Sessions</th>
                        <th style={thStyle}>Earnings</th>
                        <th style={thStyle}>Flags</th>
                        <th style={thStyle}>Status</th>
                        <th style={thStyle}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredListeners.map((l) => (
                        <tr key={l.id} style={{ background: l.blacklisted ? "#ef444408" : "transparent" }}>
                          <td style={tdStyle}>
                            <div style={{ fontWeight: 600 }}>{l.email}</div>
                            <div style={{ color: "#444", fontSize: 11 }}>{l.publicDisplayId}</div>
                          </td>
                          <td style={tdStyle}><span style={{ color: "#f59e0b" }}>★</span> {l.rating.toFixed(1)}</td>
                          <td style={tdStyle}>{l.totalSessions}</td>
                          <td style={tdStyle}>₹{l.earnings.toFixed(2)}</td>
                          <td style={tdStyle}>
                            <span style={{ color: l.flagCount > 0 ? "#ef4444" : "#22c55e", fontWeight: 700 }}>
                              {l.flagCount}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            {l.blacklisted ? <span style={{ color: "#ef4444", fontSize: 12, fontWeight: 600 }}>⛔ Blacklisted</span>
                              : l.available ? <span style={{ color: "#22c55e", fontSize: 12 }}>● Online</span>
                              : <span style={{ color: "#555", fontSize: 12 }}>○ Offline</span>}
                          </td>
                          <td style={tdStyle}>
                            <div style={{ display: "flex", gap: 6 }}>
                              {l.blacklisted ? (
                                <button onClick={() => handleBlacklist(l.id, false)} style={{
                                  padding: "5px 10px", background: "#22c55e22", color: "#22c55e",
                                  border: "1px solid #22c55e44", borderRadius: 6, fontSize: 11, cursor: "pointer", fontWeight: 600,
                                }}>Restore</button>
                              ) : (
                                <button onClick={() => handleBlacklist(l.id, true)} style={{
                                  padding: "5px 10px", background: "#ef444422", color: "#ef4444",
                                  border: "1px solid #ef444444", borderRadius: 6, fontSize: 11, cursor: "pointer", fontWeight: 600,
                                }}>Blacklist</button>
                              )}
                              {l.flagCount > 0 && (
                                <button onClick={() => handleResetFlags(l.id)} style={{
                                  padding: "5px 10px", background: "#f59e0b22", color: "#f59e0b",
                                  border: "1px solid #f59e0b44", borderRadius: 6, fontSize: 11, cursor: "pointer", fontWeight: 600,
                                }}>Reset Flags</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* ─── USERS ─── */}
            {section === "users" && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                  <div>
                    <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>Users</h1>
                    <p style={{ color: "#555", fontSize: 14, margin: 0 }}>{users.length} total</p>
                  </div>
                  <input style={inputStyle} placeholder="Search by email..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <div style={{ background: "#111", borderRadius: 14, border: "1px solid #1a1a1a", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Email</th>
                        <th style={thStyle}>Display ID</th>
                        <th style={thStyle}>Balance</th>
                        <th style={thStyle}>Verified</th>
                        <th style={thStyle}>Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => (
                        <tr key={u.id}>
                          <td style={tdStyle}>{u.email}</td>
                          <td style={{ ...tdStyle, color: "#555" }}>{u.publicDisplayId}</td>
                          <td style={tdStyle}>₹{u.balance.toFixed(2)}</td>
                          <td style={tdStyle}>
                            <span style={{ color: u.emailVerified ? "#22c55e" : "#ef4444", fontSize: 12 }}>
                              {u.emailVerified ? "✅ Yes" : "❌ No"}
                            </span>
                          </td>
                          <td style={{ ...tdStyle, color: "#555", fontSize: 12 }}>{formatDate(u.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* ─── FLAGS ─── */}
            {section === "flags" && (
              <>
                <div style={{ marginBottom: 24 }}>
                  <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>Flags & Abuse</h1>
                  <p style={{ color: "#555", fontSize: 14, margin: 0 }}>{flags.length} total flags</p>
                </div>
                <div style={{ background: "#111", borderRadius: 14, border: "1px solid #1a1a1a", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Listener</th>
                        <th style={thStyle}>Reason</th>
                        <th style={thStyle}>Session ID</th>
                        <th style={thStyle}>Date & Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {flags.map((f) => (
                        <tr key={f.id}>
                          <td style={tdStyle}><div style={{ fontWeight: 600, fontSize: 13 }}>{f.listenerEmail}</div></td>
                          <td style={tdStyle}>
                            <span style={{ background: "#ef444420", color: "#ef4444", padding: "3px 8px", borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
                              {f.reason}
                            </span>
                          </td>
                          <td style={{ ...tdStyle, color: "#444", fontSize: 11 }}>{f.sessionId.slice(0, 12)}...</td>
                          <td style={{ ...tdStyle, color: "#555", fontSize: 12 }}>{formatDate(f.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* ─── REVIEWS ─── */}
            {section === "reviews" && (
              <>
                <div style={{ marginBottom: 24 }}>
                  <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>Reviews</h1>
                  <p style={{ color: "#555", fontSize: 14, margin: 0 }}>{reviews.length} total</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {reviews.map((r) => (
                    <div key={r.id} style={{ background: "#111", borderRadius: 12, padding: "16px 20px", border: "1px solid #1a1a1a" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                            {[1,2,3,4,5].map((s) => (
                              <span key={s} style={{ color: r.rating >= s ? "#f59e0b" : "#2a2a2a", fontSize: 16 }}>★</span>
                            ))}
                            <span style={{ color: "#555", fontSize: 12, marginLeft: 4 }}>{r.rating}/5</span>
                          </div>
                          {r.comment && <p style={{ color: "#bbb", fontSize: 13, margin: "0 0 8px" }}>{r.comment}</p>}
                          <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#444" }}>
                            <span>🎧 {r.listenerEmail}</span>
                            <span>👤 {r.userEmail}</span>
                          </div>
                        </div>
                        <p style={{ color: "#444", fontSize: 11, margin: 0, whiteSpace: "nowrap" }}>{formatDate(r.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ─── TRANSACTIONS ─── */}
            {section === "transactions" && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                  <div>
                    <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>Transactions</h1>
                    <p style={{ color: "#555", fontSize: 14, margin: 0 }}>{transactions.length} entries</p>
                  </div>
                  <select value={txFilter} onChange={(e) => setTxFilter(e.target.value as TxFilter)} style={{
                    background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8,
                    padding: "8px 14px", color: "#fff", fontSize: 13, outline: "none", cursor: "pointer",
                  }}>
                    <option value="ALL">All Transactions</option>
                    <option value="RECHARGE">Recharges</option>
                    <option value="EARNINGS">Listener Earnings</option>
                    <option value="WITHDRAWALS">Withdrawals</option>
                    <option value="DEDUCTIONS">Call Deductions</option>
                  </select>
                </div>
                <div style={{ background: "#111", borderRadius: 14, border: "1px solid #1a1a1a", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Type</th>
                        <th style={thStyle}>Amount</th>
                        <th style={thStyle}>User / Email</th>
                        <th style={thStyle}>Role</th>
                        <th style={thStyle}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((t) => (
                        <tr key={t.id}>
                          <td style={tdStyle}>
                            <span style={{ color: txColors[t.type] || "#888", fontSize: 12, fontWeight: 600 }}>
                              {txLabels[t.type] || t.type}
                            </span>
                          </td>
                          <td style={{ ...tdStyle, fontWeight: 700, color: txColors[t.type] || "#888" }}>
                            {t.amount >= 0 ? "+" : ""}₹{Math.abs(t.amount).toFixed(2)}
                          </td>
                          <td style={{ ...tdStyle, fontSize: 12 }}>{t.userEmail}</td>
                          <td style={{ ...tdStyle, color: "#444", fontSize: 11 }}>{t.userRole}</td>
                          <td style={{ ...tdStyle, color: "#555", fontSize: 12 }}>{formatDate(t.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* ─── SESSIONS ─── */}
            {section === "sessions" && (
              <>
                <div style={{ marginBottom: 24 }}>
                  <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>Sessions</h1>
                  <p style={{ color: "#555", fontSize: 14, margin: 0 }}>{sessions.length} total</p>
                </div>
                <div style={{ background: "#111", borderRadius: 14, border: "1px solid #1a1a1a", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Session ID</th>
                        <th style={thStyle}>User</th>
                        <th style={thStyle}>Listener</th>
                        <th style={thStyle}>Type</th>
                        <th style={thStyle}>Duration</th>
                        <th style={thStyle}>Status</th>
                        <th style={thStyle}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((s) => (
                        <tr key={s.id}>
                          <td style={{ ...tdStyle, color: "#444", fontSize: 11 }}>{s.id.slice(0, 10)}...</td>
                          <td style={{ ...tdStyle, fontSize: 12 }}>{s.userEmail}</td>
                          <td style={{ ...tdStyle, fontSize: 12 }}>{s.listenerEmail}</td>
                          <td style={tdStyle}>{s.type === "VOICE" ? "🎙 Voice" : "🎥 Video"}</td>
                          <td style={tdStyle}>{formatDuration(s.durationSeconds)}</td>
                          <td style={tdStyle}>
                            <span style={{
                              fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 4,
                              background: s.status === "ENDED" ? "#22c55e20" : s.status === "STARTED" ? "#f59e0b20" : "#2a2a2a",
                              color: s.status === "ENDED" ? "#22c55e" : s.status === "STARTED" ? "#f59e0b" : "#555",
                            }}>{s.status}</span>
                          </td>
                          <td style={{ ...tdStyle, color: "#555", fontSize: 12 }}>{formatDate(s.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* ─── ANOMALIES (Phase 4) ─── */}
            {section === "anomalies" && (
              <>
                <div style={{ marginBottom: 24 }}>
                  <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>⚠️ Anomalies</h1>
                  <p style={{ color: "#555", fontSize: 14, margin: 0 }}>
                    Sessions flagged as low quality, too short, or problematic
                  </p>
                </div>
                <div style={{ background: "#111", borderRadius: 14, border: "1px solid #1a1a1a", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>User</th>
                        <th style={thStyle}>Listener</th>
                        <th style={thStyle}>Score</th>
                        <th style={thStyle}>Duration</th>
                        <th style={thStyle}>Engagement</th>
                        <th style={thStyle}>Flagged</th>
                        <th style={thStyle}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {anomalies.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ ...tdStyle, textAlign: "center", color: "#22c55e" }}>
                            ✅ No anomalies detected
                          </td>
                        </tr>
                      ) : anomalies.map((a) => (
                        <tr key={a.sessionId} style={{ background: "#ef444408" }}>
                          <td style={{ ...tdStyle, fontSize: 12 }}>{a.userEmail}</td>
                          <td style={{ ...tdStyle, fontSize: 12 }}>{a.listenerEmail}</td>
                          <td style={tdStyle}>
                            <span style={{
                              color: a.effectivenessScore >= 7 ? "#22c55e"
                                : a.effectivenessScore >= 4 ? "#f59e0b" : "#ef4444",
                              fontWeight: 700,
                            }}>{a.effectivenessScore.toFixed(1)}</span>
                          </td>
                          <td style={tdStyle}>{formatDuration(a.durationSeconds)}</td>
                          <td style={{ ...tdStyle, textTransform: "capitalize" }}>{a.engagementLevel}</td>
                          <td style={tdStyle}>
                            {a.flagged
                              ? <span style={{ color: "#ef4444" }}>🚩 Yes</span>
                              : <span style={{ color: "#555" }}>No</span>}
                          </td>
                          <td style={{ ...tdStyle, color: "#555", fontSize: 12 }}>{formatDate(a.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* ─── USER MEMORIES (Phase 5) ─── */}
            {section === "memories" && (
              <>
                <div style={{ marginBottom: 24 }}>
                  <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>🧠 User Profiles</h1>
                  <p style={{ color: "#555", fontSize: 14, margin: 0 }}>
                    Long-term emotional memory profiles for each user
                  </p>
                </div>
                <div style={{ background: "#111", borderRadius: 14, border: "1px solid #1a1a1a", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>User</th>
                        <th style={thStyle}>Sessions</th>
                        <th style={thStyle}>Avg Satisfaction</th>
                        <th style={thStyle}>Dominant Emotion</th>
                        <th style={thStyle}>Trend</th>
                        <th style={thStyle}>Recurring Stress</th>
                        <th style={thStyle}>Topics</th>
                      </tr>
                    </thead>
                    <tbody>
                      {memories.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ ...tdStyle, textAlign: "center", color: "#555" }}>
                            No user profiles yet
                          </td>
                        </tr>
                      ) : memories.map((m) => (
                        <tr key={m.userEmail}>
                          <td style={{ ...tdStyle, fontSize: 12 }}>{m.userEmail}</td>
                          <td style={tdStyle}>{m.totalSessions}</td>
                          <td style={tdStyle}>
                            <span style={{ color: "#f59e0b" }}>{m.avgSatisfactionScore.toFixed(1)}/10</span>
                          </td>
                          <td style={{ ...tdStyle, textTransform: "capitalize" }}>
                            <span style={{
                              color: m.dominantEmotion === "positive" ? "#22c55e"
                                : m.dominantEmotion === "stressed" || m.dominantEmotion === "anxious" ? "#f59e0b"
                                : "#555",
                            }}>{m.dominantEmotion}</span>
                          </td>
                          <td style={tdStyle}>
                            <span style={{
                              color: m.emotionalTrend === "improving" ? "#22c55e"
                                : m.emotionalTrend === "declining" ? "#ef4444" : "#555",
                            }}>
                              {m.emotionalTrend === "improving" ? "↗ Improving"
                                : m.emotionalTrend === "declining" ? "↘ Declining" : "→ Stable"}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            {m.recurringStress
                              ? <span style={{ color: "#f59e0b", fontSize: 12 }}>⚠️ Yes</span>
                              : <span style={{ color: "#555", fontSize: 12 }}>No</span>}
                          </td>
                          <td style={{ ...tdStyle, color: "#444", fontSize: 11 }}>
                            {m.recurringTopics
                              ? m.recurringTopics.split(",").slice(0, 3).join(", ")
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

          </>
        )}
      </div>
    </div>
  );
}