"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import AuthGuard from "@/components/AuthGuard";

type Session = { id: string; type: string; status: string; startedAt: string; endedAt: string };
type Transaction = { id: string; type: string; amount: number; createdAt: string };
type TxFilter = "ALL" | "EARNINGS" | "WITHDRAWALS";

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

function calcEarning(session: Session): string {
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
  const total = billableMinutes * rate;
  return `+₹${(total * 0.7).toFixed(2)}`;
}

export default function ListenerHistoryPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"sessions" | "transactions">("sessions");
  const [txFilter, setTxFilter] = useState<TxFilter>("ALL");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getListenerSessions(), api.getTransactions()])
      .then(([s, t]) => {
        setSessions(s || []);
        setTransactions(t || []);
      })
      .catch(() => router.push("/"))
      .finally(() => setLoading(false));
  }, []);

  const filteredTransactions = transactions.filter((t) => {
    if (txFilter === "EARNINGS") return t.type === "LISTENER_CREDIT";
    if (txFilter === "WITHDRAWALS") return t.type === "WITHDRAWAL";
    return t.type === "LISTENER_CREDIT" || t.type === "WITHDRAWAL";
  });

  const txColor = (type: string) =>
    type === "LISTENER_CREDIT" ? "#22c55e" : "#ef4444";

  const txLabel = (type: string) =>
    type === "LISTENER_CREDIT" ? "Earning" : "Withdrawal";

  return (
    <AuthGuard>
      <div style={{
        minHeight: "100vh", background: "#0f0f0f",
        color: "#fff", fontFamily: "'DM Sans', sans-serif", padding: "40px 24px",
      }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
            <button onClick={() => router.back()} style={{
              background: "#1a1a1a", border: "1px solid #2a2a2a",
              color: "#fff", borderRadius: 8, padding: "6px 14px",
              cursor: "pointer", fontSize: 14,
            }}>← Back</button>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>History</h1>
          </div>

          {/* Main tabs */}
          <div style={{
            display: "flex", background: "#1a1a1a",
            borderRadius: 10, padding: 4, marginBottom: 20,
            border: "1px solid #2a2a2a",
          }}>
            {(["sessions", "transactions"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} style={{
                flex: 1, padding: "10px", borderRadius: 8, border: "none",
                cursor: "pointer", fontWeight: 600, fontSize: 13,
                background: tab === t ? "#fff" : "transparent",
                color: tab === t ? "#000" : "#555",
                transition: "all 0.15s",
              }}>
                {t === "sessions" ? "📞 Sessions" : "💰 Transactions"}
              </button>
            ))}
          </div>

          {loading ? (
            <p style={{ color: "#555", textAlign: "center", marginTop: 40 }}>Loading...</p>
          ) : (
            <>
              {/* SESSIONS TAB */}
              {tab === "sessions" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {sessions.length === 0 ? (
                    <div style={{
                      background: "#1a1a1a", borderRadius: 12,
                      padding: "40px 24px", textAlign: "center", border: "1px solid #2a2a2a",
                    }}>
                      <p style={{ color: "#555", margin: 0 }}>No sessions yet</p>
                    </div>
                  ) : sessions.map((s) => (
                    <div key={s.id} style={{
                      background: "#1a1a1a", borderRadius: 12,
                      padding: "16px 20px", border: "1px solid #2a2a2a",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <p style={{ margin: "0 0 4px", fontWeight: 600, fontSize: 15 }}>
                            {s.type === "VOICE" ? "🎙 Voice Call" : "🎥 Video Call"}
                          </p>
                          <p style={{ margin: "0 0 2px", color: "#555", fontSize: 12 }}>
                            Start: {formatDate(s.startedAt)}
                          </p>
                          <p style={{ margin: "0 0 2px", color: "#555", fontSize: 12 }}>
                            End: {formatDate(s.endedAt)}
                          </p>
                          <p style={{ margin: 0, color: "#444", fontSize: 12 }}>
                            Duration: {formatDuration(s.startedAt, s.endedAt)}
                          </p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <p style={{ margin: "0 0 4px", fontWeight: 700, color: "#22c55e", fontSize: 15 }}>
                            {calcEarning(s)}
                          </p>
                          <span style={{
                            fontSize: 11, padding: "2px 8px", borderRadius: 4,
                            background: "#22c55e22", color: "#22c55e",
                          }}>ENDED</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TRANSACTIONS TAB */}
              {tab === "transactions" && (
                <>
                  {/* Filter dropdown */}
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
                      <option value="EARNINGS">💚 Earnings Only</option>
                      <option value="WITHDRAWALS">💸 Withdrawals Only</option>
                    </select>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {filteredTransactions.length === 0 ? (
                      <div style={{
                        background: "#1a1a1a", borderRadius: 12,
                        padding: "40px 24px", textAlign: "center", border: "1px solid #2a2a2a",
                      }}>
                        <p style={{ color: "#555", margin: 0 }}>No transactions found</p>
                      </div>
                    ) : filteredTransactions.map((t) => (
                      <div key={t.id} style={{
                        background: "#1a1a1a", borderRadius: 12,
                        padding: "16px 20px", border: "1px solid #2a2a2a",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                      }}>
                        <div>
                          <p style={{ margin: "0 0 4px", fontWeight: 600, fontSize: 14, color: txColor(t.type) }}>
                            {txLabel(t.type)}
                          </p>
                          <p style={{ margin: 0, color: "#444", fontSize: 12 }}>
                            {formatDate(t.createdAt)}
                          </p>
                        </div>
                        <p style={{
                          margin: 0, fontWeight: 700, fontSize: 16,
                          color: t.amount >= 0 ? "#22c55e" : "#ef4444",
                        }}>
                          {t.amount >= 0 ? "+" : ""}₹{Math.abs(t.amount).toFixed(2)}
                        </p>
                      </div>
                    ))}
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