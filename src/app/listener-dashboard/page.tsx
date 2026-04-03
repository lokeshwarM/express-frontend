"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import AuthGuard from "@/components/AuthGuard";
//  Import global socket context — no local WebSocket needed here
import { useListenerSocket } from "@/context/ListenerSocketContext";

type User = { id: string; email: string; role: string };
type Stats = { totalSessions: number; flagCount: number; rating: number; isBlacklisted: boolean };

function StarRating({ rating }: { rating: number }) {
  return (
    <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} style={{
          fontSize: 16,
          color: rating >= star ? "#f59e0b" : "#2a2a2a",
          opacity: rating >= star - 0.5 ? 1 : 0.4,
        }}>★</span>
      ))}
      <span style={{ fontSize: 13, color: "#888", marginLeft: 4 }}>{rating.toFixed(1)}</span>
    </div>
  );
}

export default function ListenerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

  // Global socket — the incoming call overlay is rendered by ListenerSocketProvider,
  //    so it works on this page AND every other page the listener navigates to.
  //    We only need acceptCall/rejectCall if we want to handle them here, but since
  //    the overlay lives globally we don't need to render anything extra here.
  useListenerSocket(); // keep hook call so ESLint is happy; values used by the provider overlay

  useEffect(() => {
    api.getMe()
      .then(async (u) => {
        if (u.role !== "LISTENER") { router.push("/dashboard"); return; }
        setUser(u);
        const isAvailable = await api.getMyAvailability();
        setAvailable(isAvailable);
        api.getBalance().then(setBalance);
        api.getListenerStats().then(setStats).catch(() => {});
      })
      .catch(() => router.push("/"));
  }, []);

  const toggleAvailability = async () => {
    if (available === null) return;
    setToggling(true);
    setError(null);
    try {
      await api.setAvailability(!available);
      setAvailable(!available);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to toggle");
    } finally {
      setToggling(false);
    }
  };

  const logout = () => {
    api.setAvailability(false).catch(console.error).finally(() => {
      localStorage.removeItem("token");
      router.push("/");
    });
  };

  return (
    <AuthGuard>
      <div style={{
        minHeight: "100vh", background: "#0f0f0f",
        color: "#fff", fontFamily: "'DM Sans', sans-serif", padding: "40px 24px",
      }}>
        <div style={{ maxWidth: 420, margin: "0 auto" }}>

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: "-0.5px" }}>Express</h1>
              {user && <p style={{ color: "#666", margin: "4px 0 0", fontSize: 14 }}>{user.email}</p>}
            </div>
            <button
              onClick={() => router.push("/listener-profile")}
              style={{
                width: 40, height: 40, borderRadius: "50%",
                background: "#1a1a1a", border: "1px solid #2a2a2a",
                color: "#fff", fontSize: 18, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
              title="Profile"
            >
              👤
            </button>
          </div>

          {/* NOTE: Incoming call overlay is now rendered globally by ListenerSocketProvider
              in layout.tsx — no need to render it here. It shows on every page. */}

          {/* Earnings + Withdraw card */}
          <div style={{
            background: "#1a1a1a", borderRadius: 16,
            padding: "24px", marginBottom: 16, border: "1px solid #2a2a2a",
          }}>
            <p style={{ color: "#666", fontSize: 13, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 1 }}>
              Wallet Balance
            </p>
            <p style={{ fontSize: 36, fontWeight: 700, margin: "0 0 16px", color: "#fff" }}>
              ₹{balance !== null ? balance.toFixed(2) : "—"}
            </p>
            <button
              onClick={() => router.push("/listener-withdraw")}
              style={{
                width: "100%", padding: "12px",
                background: "#f59e0b", color: "#000",
                border: "none", borderRadius: 10,
                fontWeight: 700, fontSize: 14, cursor: "pointer",
              }}
            >
              💸 Withdraw Earnings
            </button>
          </div>

          {/* Ratings + Reviews row */}
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <div style={{
              flex: 1, background: "#1a1a1a", borderRadius: 16,
              padding: "20px", border: "1px solid #2a2a2a",
            }}>
              <p style={{ color: "#666", fontSize: 11, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 1 }}>
                Rating
              </p>
              {stats ? (
                <StarRating rating={stats.rating} />
              ) : (
                <p style={{ color: "#444", margin: 0, fontSize: 13 }}>Loading...</p>
              )}
              <p style={{ color: "#444", fontSize: 11, margin: "8px 0 0" }}>
                {stats ? `${stats.totalSessions} sessions` : ""}
              </p>
            </div>

            <div
              onClick={() => router.push("/listener-reviews")}
              style={{
                flex: 1, background: "#1a1a1a", borderRadius: 16,
                padding: "20px", border: "1px solid #2a2a2a",
                cursor: "pointer", display: "flex",
                flexDirection: "column", justifyContent: "space-between",
              }}
            >
              <p style={{ color: "#666", fontSize: 11, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 1 }}>
                Flags &amp; Reviews
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 20 }}>🚩</span>
                <span style={{ fontWeight: 700, fontSize: 20, color: stats && stats.flagCount > 0 ? "#ef4444" : "#22c55e" }}>
                  {stats ? stats.flagCount : "—"}
                </span>
              </div>
              <p style={{ color: "#555", fontSize: 11, margin: "8px 0 0" }}>
                View reviews →
              </p>
            </div>
          </div>

          {/* Availability card */}
          <div style={{
            background: "#1a1a1a", borderRadius: 16,
            padding: "24px", border: "1px solid #2a2a2a", marginBottom: 12,
          }}>
            {available === null ? (
              <p style={{ color: "#555", margin: 0 }}>Loading status...</p>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div>
                    <p style={{ color: "#666", fontSize: 13, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 1 }}>Status</p>
                    <p style={{ fontSize: 18, fontWeight: 700, margin: 0, color: available ? "#22c55e" : "#ef4444" }}>
                      {available ? "● Available" : "● Unavailable"}
                    </p>
                  </div>
                  <div
                    onClick={!toggling ? toggleAvailability : undefined}
                    style={{
                      width: 52, height: 28, borderRadius: 14,
                      background: available ? "#22c55e" : "#2a2a2a",
                      border: "1px solid " + (available ? "#22c55e" : "#444"),
                      cursor: toggling ? "not-allowed" : "pointer",
                      position: "relative", transition: "background 0.2s",
                      opacity: toggling ? 0.6 : 1,
                    }}
                  >
                    <div style={{
                      position: "absolute", top: 3, left: available ? 26 : 3,
                      width: 20, height: 20, borderRadius: "50%",
                      background: "#fff", transition: "left 0.2s",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
                    }} />
                  </div>
                </div>
                <p style={{ color: "#444", fontSize: 13, margin: 0 }}>
                  {available
                    ? "⏳ Waiting for calls. You will be notified on any page."
                    : "Toggle on to start receiving calls."}
                </p>
              </>
            )}
            {error && <p style={{ color: "#ef4444", fontSize: 13, marginTop: 12 }}>{error}</p>}
          </div>

          {/* History + Logout */}
          <button
            onClick={() => router.push("/listener-history")}
            style={{
              width: "100%", padding: "12px", background: "transparent",
              border: "1px solid #2a2a2a", borderRadius: 12,
              color: "#555", fontSize: 14, cursor: "pointer", marginBottom: 16,
            }}
          >
            📋 Sessions &amp; Earnings History
          </button>

          <button
            onClick={logout}
            style={{
              background: "transparent", border: "none",
              color: "#444", fontSize: 13, cursor: "pointer", padding: 0,
            }}
          >
            Logout
          </button>
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.08); opacity: 0.8; }
          }
        `}</style>
      </div>
    </AuthGuard>
  );
}