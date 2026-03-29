"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import AuthGuard from "@/components/AuthGuard";

type Session = {
  id: string;
  type: string;
  status: string;
  startedAt: string;
  endedAt: string;
};

type Transaction = {
  id: string;
  type: string;
  amount: number;
  createdAt: string;
};

function formatDuration(startedAt: string, endedAt: string): string {
  if (!startedAt || !endedAt) return "—";
  const secs = Math.floor(
    (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000
  );
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function calcEarning(session: Session): string {
  if (!session.startedAt || !session.endedAt) return "—";
  const secs = Math.floor(
    (new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000
  );
  const mins = Math.max(1, Math.ceil(secs / 60));
  const rate = session.type === "VOICE" ? 2.5 : 3.0;
  const total = mins * rate;
  const earning = total * 0.7; // listener gets 70%
  return `₹${earning.toFixed(2)}`;
}

const txLabel: Record<string, { label: string; color: string }> = {
  RECHARGE: { label: "Recharge", color: "#22c55e" },
  SESSION_DEBIT: { label: "Call charge", color: "#ef4444" },
  LISTENER_CREDIT: { label: "Earnings", color: "#22c55e" },
  PLATFORM_COMMISSION: { label: "Commission", color: "#f59e0b" },
  WITHDRAWAL: { label: "Withdrawal", color: "#ef4444" },
};

export default function ListenerHistoryPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"sessions" | "transactions">("sessions");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getSessionHistory(), api.getTransactions()])
      .then(([s, t]) => {
        setSessions(s || []);
        setTransactions(t || []);
      })
      .catch(() => router.push("/"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthGuard>
      <div style={{
        minHeight: "100vh",
        background: "#0f0f0f",
        color: "#fff",
        fontFamily: "'DM Sans', sans-serif",
        padding: "40px 24px",
      }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
            <button
              onClick={() => router.back()}
              style={{
                background: "#1a1a1a", border: "1px solid #2a2a2a",
                color: "#fff", borderRadius: 8, padding: "6px 14px",
                cursor: "pointer", fontSize: 14,
              }}
            >
              ← Back
            </button>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>History</h1>
          </div>

          {/* Tabs */}
          <div style={{
            display: "flex", background: "#1a1a1a",
            borderRadius: 10, padding: 4, marginBottom: 24,
            border: "1px solid #2a2a2a",
          }}>
            {(["sessions", "transactions"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1, padding: "10px", borderRadius: 8, border: "none",
                  cursor: "pointer", fontWeight: 600, fontSize: 13,
                  background: tab === t ? "#fff" : "transparent",
                  color: tab === t ? "#000" : "#555",
                  transition: "all 0.15s",
                }}
              >
                {t === "sessions" ? "📞 Sessions" : "💰 Earnings"}
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
                      padding: "40px 24px", textAlign: "center",
                      border: "1px solid #2a2a2a",
                    }}>
                      <p style={{ color: "#555", margin: 0, fontSize: 14 }}>No sessions yet</p>
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
                            {formatDate(s.startedAt)}
                          </p>
                          <p style={{ margin: 0, color: "#444", fontSize: 12 }}>
                            Duration: {formatDuration(s.startedAt, s.endedAt)}
                          </p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <p style={{ margin: "0 0 4px", fontWeight: 700, color: "#22c55e", fontSize: 15 }}>
                            +{calcEarning(s)}
                          </p>
                          <span style={{
                            fontSize: 11, padding: "2px 8px", borderRadius: 4,
                            background: "#22c55e22", color: "#22c55e",
                          }}>
                            ENDED
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TRANSACTIONS TAB */}
              {tab === "transactions" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {transactions.length === 0 ? (
                    <div style={{
                      background: "#1a1a1a", borderRadius: 12,
                      padding: "40px 24px", textAlign: "center",
                      border: "1px solid #2a2a2a",
                    }}>
                      <p style={{ color: "#555", margin: 0, fontSize: 14 }}>No transactions yet</p>
                    </div>
                  ) : transactions
                    .filter(t => t.type === "LISTENER_CREDIT" || t.type === "WITHDRAWAL")
                    .map((t) => {
                      const info = txLabel[t.type] || { label: t.type, color: "#888" };
                      return (
                        <div key={t.id} style={{
                          background: "#1a1a1a", borderRadius: 12,
                          padding: "16px 20px", border: "1px solid #2a2a2a",
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                        }}>
                          <div>
                            <p style={{ margin: "0 0 4px", fontWeight: 600, fontSize: 14, color: info.color }}>
                              {info.label}
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
                      );
                    })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}