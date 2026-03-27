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

function calcCost(session: Session): string {
  if (!session.startedAt || !session.endedAt) return "—";
  const secs = Math.floor(
    (new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000
  );
  const mins = Math.max(1, Math.ceil(secs / 60));
  const rate = session.type === "VOICE" ? 2.5 : 3.0;
  return `₹${(mins * rate).toFixed(2)}`;
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
              background: "#1a1a1a",
              border: "1px solid #2a2a2a",
              color: "#fff",
              borderRadius: 8,
              padding: "6px 14px",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            ← Back
          </button>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>History</h1>
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex",
          background: "#1a1a1a",
          borderRadius: 10,
          padding: 4,
          marginBottom: 24,
          border: "1px solid #2a2a2a",
        }}>
          {(["sessions", "transactions"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 14,
                background: tab === t ? "#fff" : "transparent",
                color: tab === t ? "#000" : "#555",
                transition: "all 0.15s",
              }}
            >
              {t === "sessions" ? "📞 Calls" : "💳 Transactions"}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", color: "#444", paddingTop: 40 }}>
            Loading...
          </div>
        ) : tab === "sessions" ? (
          sessions.length === 0 ? (
            <div style={{ textAlign: "center", color: "#444", paddingTop: 40 }}>
              No calls yet
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {sessions.map((s) => (
                <div
                  key={s.id}
                  style={{
                    background: "#1a1a1a",
                    borderRadius: 12,
                    padding: "16px",
                    border: "1px solid #2a2a2a",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 16 }}>
                        {s.type === "VOICE" ? "🎙" : "🎥"}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>
                        {s.type === "VOICE" ? "Voice Call" : "Video Call"}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "#555" }}>
                      {formatDate(s.startedAt)}
                    </div>
                    <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>
                      Duration: {formatDuration(s.startedAt, s.endedAt)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: "#ef4444" }}>
                      {calcCost(s)}
                    </div>
                    <div style={{
                      fontSize: 11,
                      color: "#333",
                      marginTop: 4,
                      background: "#2a2a2a",
                      padding: "2px 8px",
                      borderRadius: 20,
                    }}>
                      {s.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          transactions.length === 0 ? (
            <div style={{ textAlign: "center", color: "#444", paddingTop: 40 }}>
              No transactions yet
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {transactions.map((t) => {
                const meta = txLabel[t.type] || { label: t.type, color: "#888" };
                return (
                  <div
                    key={t.id}
                    style={{
                      background: "#1a1a1a",
                      borderRadius: 12,
                      padding: "16px",
                      border: "1px solid #2a2a2a",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                        {meta.label}
                      </div>
                      <div style={{ fontSize: 12, color: "#555" }}>
                        {formatDate(t.createdAt)}
                      </div>
                    </div>
                    <div style={{
                      fontWeight: 700,
                      fontSize: 16,
                      color: meta.color,
                    }}>
                      {t.amount > 0 ? "+" : ""}₹{Math.abs(t.amount).toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
    </AuthGuard>
  );
}