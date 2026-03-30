"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import AuthGuard from "@/components/AuthGuard";

type Session = { id: string; type: string; status: string; startedAt: string; endedAt: string };
type Transaction = { id: string; type: string; amount: number; createdAt: string };
type TxFilter = "ALL" | "RECHARGES" | "DEDUCTIONS";

function formatDuration(startedAt: string, endedAt: string): string {
  if (!startedAt || !endedAt) return "—";
  const secs = Math.floor((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function calcCost(session: Session): string {
  if (!session.startedAt || !session.endedAt) return "—";
  const secs = Math.floor((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000);
  if (secs < 20) return "Free";
  const completedMinutes = Math.floor(secs / 60);
  const remainingSeconds = secs % 60;
  let billableMinutes: number;
  if (completedMinutes === 0) billableMinutes = 1;
  else if (remainingSeconds >= 20) billableMinutes = completedMinutes + 1;
  else billableMinutes = completedMinutes;
  const rate = session.type === "VOICE" ? 2.5 : 3.0;
  return `₹${(billableMinutes * rate).toFixed(2)}`;
}

const txLabel: Record<string, { label: string; color: string }> = {
  RECHARGE: { label: "Recharge", color: "#22c55e" },
  SESSION_DEBIT: { label: "Call charge", color: "#ef4444" },
  LISTENER_CREDIT: { label: "Earnings", color: "#22c55e" },
  PLATFORM_COMMISSION: { label: "Commission", color: "#f59e0b" },
  WITHDRAWAL: { label: "Withdrawal", color: "#ef4444" },
};

export default function HistoryPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"sessions" | "transactions">("sessions");
  const [txFilter, setTxFilter] = useState<TxFilter>("ALL");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getSessionHistory(), api.getTransactions()])
      .then(([s, t]) => { setSessions(s || []); setTransactions(t || []); })
      .catch(() => router.push("/"))
      .finally(() => setLoading(false));
  }, []);

  const filteredTransactions = transactions.filter((t) => {
    if (txFilter === "RECHARGES") return t.type === "RECHARGE";
    if (txFilter === "DEDUCTIONS") return t.type === "SESSION_DEBIT";
    return t.type === "RECHARGE" || t.type === "SESSION_DEBIT";
  });

  return (
    <AuthGuard>
      <div style={{
        minHeight: "100vh", background: "#0f0f0f",
        color: "#fff", fontFamily: "'DM Sans', sans-serif", padding: "40px 24px",
      }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>

          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
            <button onClick={() => router.back()} style={{
              background: "#1a1a1a", border: "1px solid #2a2a2a",
              color: "#fff", borderRadius: 8, padding: "6px 14px",
              cursor: "pointer", fontSize: 14,
            }}>← Back</button>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>History</h1>
          </div>

          {/* Tabs */}
          <div style={{
            display: "flex", background: "#1a1a1a",
            borderRadius: 10, padding: 4, marginBottom: 20, border: "1px solid #2a2a2a",
          }}>
            {(["sessions", "transactions"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} style={{
                flex: 1, padding: "10px", borderRadius: 8, border: "none",
                cursor: "pointer", fontWeight: 600, fontSize: 13,
                background: tab === t ? "#fff" : "transparent",
                color: tab === t ? "#000" : "#555", transition: "all 0.15s",
              }}>
                {t === "sessions" ? "📞 Calls" : "💳 Transactions"}
              </button>
            ))}
          </div>

          {loading ? (
            <p style={{ color: "#555", textAlign: "center", marginTop: 40 }}>Loading...</p>
          ) : (
            <>
              {/* SESSIONS TAB */}
              {tab === "sessions" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {sessions.length === 0 ? (
                    <div style={{ textAlign: "center", color: "#444", paddingTop: 40 }}>No calls yet</div>
                  ) : sessions.map((s) => (
                    <div key={s.id} style={{
                      background: "#1a1a1a", borderRadius: 12, padding: "16px",
                      border: "1px solid #2a2a2a", display: "flex",
                      justifyContent: "space-between", alignItems: "center",
                    }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 16 }}>{s.type === "VOICE" ? "🎙" : "🎥"}</span>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>
                            {s.type === "VOICE" ? "Voice Call" : "Video Call"}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: "#555" }}>{formatDate(s.startedAt)}</div>
                        <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>
                          Duration: {formatDuration(s.startedAt, s.endedAt)}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 700, fontSize: 16, color: "#ef4444" }}>
                          {calcCost(s)}
                        </div>
                        <div style={{
                          fontSize: 11, color: "#333", marginTop: 4,
                          background: "#2a2a2a", padding: "2px 8px", borderRadius: 20,
                        }}>{s.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TRANSACTIONS TAB */}
              {tab === "transactions" && (
                <>
                  {/* Dropdown filter */}
                  <div style={{ marginBottom: 16 }}>
                    <select
                      value={txFilter}
                      onChange={(e) => setTxFilter(e.target.value as TxFilter)}
                      style={{
                        width: "100%", background: "#1a1a1a",
                        border: "1px solid #2a2a2a", borderRadius: 10,
                        padding: "12px 16px", color: "#fff",
                        fontSize: 14, outline: "none", cursor: "pointer",
                        appearance: "none",
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23666' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E")`,
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 16px center",
                        paddingRight: 40,
                      }}
                    >
                      <option value="ALL">📊 All Transactions</option>
                      <option value="RECHARGES">💚 Recharges Only</option>
                      <option value="DEDUCTIONS">🔴 Call Deductions Only</option>
                    </select>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {filteredTransactions.length === 0 ? (
                      <div style={{ textAlign: "center", color: "#444", paddingTop: 40 }}>
                        No transactions found
                      </div>
                    ) : filteredTransactions.map((t) => {
                      const meta = txLabel[t.type] || { label: t.type, color: "#888" };
                      return (
                        <div key={t.id} style={{
                          background: "#1a1a1a", borderRadius: 12, padding: "16px",
                          border: "1px solid #2a2a2a", display: "flex",
                          justifyContent: "space-between", alignItems: "center",
                        }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: meta.color }}>
                              {meta.label}
                            </div>
                            <div style={{ fontSize: 12, color: "#555" }}>{formatDate(t.createdAt)}</div>
                          </div>
                          <div style={{ fontWeight: 700, fontSize: 16, color: meta.color }}>
                            {t.amount > 0 ? "+" : ""}₹{Math.abs(t.amount).toFixed(2)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}