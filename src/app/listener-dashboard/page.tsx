"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { api } from "@/services/api";
import AuthGuard from "@/components/AuthGuard";

type User = { id: string; email: string; role: string };
type IncomingCall = { sessionId: string; callType: string };

export default function ListenerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [toggling, setToggling] = useState(false);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);
  const stompRef = useRef<Client | null>(null);

  useEffect(() => {
    api.getMe()
      .then(async (u) => {
        if (u.role !== "LISTENER") { router.push("/dashboard"); return; }
        setUser(u);
        const isAvailable = await api.getMyAvailability();
        setAvailable(isAvailable);
        api.getBalance().then(setBalance);
        connectSocket(u.id);
      })
      .catch(() => router.push("/"));

    return () => { stompRef.current?.deactivate(); };
  }, []);

  const connectSocket = (userId: string) => {
    const WS_BASE = typeof window !== "undefined" && window.location.protocol === "https:"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080");

    const socket = new SockJS(`${WS_BASE}/ws`);
    const client = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe(`/topic/listener/${userId}`, (msg) => {
          const data = JSON.parse(msg.body);
          if (data.type === "incoming_call") {
            setIncomingCall({ sessionId: data.sessionId, callType: data.callType });
          }
        });
      },
    });
    client.activate();
    stompRef.current = client;
  };

  const acceptCall = () => {
    if (!incomingCall) return;
    const sessionId = incomingCall.sessionId;
    setIncomingCall(null);
    router.push(`/listener?sessionId=${sessionId}`);
  };

  const rejectCall = () => {
    if (!incomingCall) return;
    stompRef.current?.publish({
      destination: "/app/signal",
      body: JSON.stringify({ type: "reject", sessionId: incomingCall.sessionId }),
    });
    api.setAvailability(true).then(() => setAvailable(true)).catch(console.error);
    setIncomingCall(null);
  };

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

  const handleWithdraw = async () => {
    const amt = Number(withdrawAmount);
    if (!amt || amt <= 0) return;
    setWithdrawError(null);
    setWithdrawSuccess(null);
    setWithdrawing(true);
    try {
      const newBalance = await api.withdraw(amt);
      setBalance(newBalance);
      setWithdrawAmount("");
      setWithdrawSuccess(`₹${amt.toFixed(2)} withdrawal request submitted successfully!`);
    } catch (e: unknown) {
      setWithdrawError(e instanceof Error ? e.message : "Withdrawal failed");
    } finally {
      setWithdrawing(false);
    }
  };

  const logout = () => {
    api.setAvailability(false).catch(console.error).finally(() => {
      stompRef.current?.deactivate();
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
          <div style={{ marginBottom: 40 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: "-0.5px" }}>Express</h1>
            {user && <p style={{ color: "#666", margin: "6px 0 0", fontSize: 14 }}>{user.email}</p>}
          </div>

          {/* Incoming call overlay */}
          {incomingCall && (
            <div style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
              display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
            }}>
              <div style={{
                background: "#1a1a1a", borderRadius: 24, padding: "40px 32px",
                textAlign: "center", width: 320, border: "1px solid #2a2a2a",
              }}>
                <div style={{
                  width: 72, height: 72, borderRadius: "50%",
                  background: incomingCall.callType === "VOICE" ? "#22c55e22" : "#3b82f622",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 32, margin: "0 auto 20px",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}>
                  {incomingCall.callType === "VOICE" ? "🎙" : "🎥"}
                </div>
                <p style={{ color: "#888", fontSize: 13, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: 1 }}>Incoming</p>
                <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>
                  {incomingCall.callType === "VOICE" ? "Voice" : "Video"} Call
                </h2>
                <p style={{ color: "#555", fontSize: 13, margin: "0 0 32px" }}>
                  Session {incomingCall.sessionId.slice(0, 8)}...
                </p>
                <div style={{ display: "flex", gap: 12 }}>
                  <button onClick={rejectCall} style={{
                    flex: 1, padding: "14px", background: "#ef444422",
                    color: "#ef4444", border: "1px solid #ef444444",
                    borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer",
                  }}>✕ Decline</button>
                  <button onClick={acceptCall} style={{
                    flex: 1, padding: "14px", background: "#22c55e",
                    color: "#fff", border: "none",
                    borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer",
                  }}>✓ Accept</button>
                </div>
              </div>
            </div>
          )}

          {/* Earnings card */}
          <div style={{
            background: "#1a1a1a", borderRadius: 16,
            padding: "24px", marginBottom: 24, border: "1px solid #2a2a2a",
          }}>
            <p style={{ color: "#666", fontSize: 13, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 1 }}>
              Earnings
            </p>
            <p style={{ fontSize: 36, fontWeight: 700, margin: 0, color: "#fff" }}>
              ₹{balance !== null ? balance.toFixed(2) : "—"}
            </p>
          </div>

          {/* Withdraw card */}
          <div style={{
            background: "#1a1a1a", borderRadius: 16,
            padding: "24px", marginBottom: 24, border: "1px solid #2a2a2a",
          }}>
            <p style={{ color: "#666", fontSize: 13, margin: "0 0 16px", textTransform: "uppercase", letterSpacing: 1 }}>
              Withdraw Earnings
            </p>

            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Enter amount (min ₹100)"
                type="number"
                min="100"
                style={{
                  flex: 1, background: "#111", border: "1px solid #2a2a2a",
                  borderRadius: 10, padding: "10px 14px",
                  color: "#fff", fontSize: 15, outline: "none",
                }}
              />
              <button
                onClick={handleWithdraw}
                disabled={withdrawing || !withdrawAmount}
                style={{
                  background: withdrawing || !withdrawAmount ? "#1a1a1a" : "#f59e0b",
                  color: withdrawing || !withdrawAmount ? "#555" : "#000",
                  border: withdrawing || !withdrawAmount ? "1px solid #2a2a2a" : "none",
                  borderRadius: 10, padding: "10px 20px",
                  fontWeight: 600, fontSize: 14,
                  cursor: withdrawing || !withdrawAmount ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap",
                  opacity: !withdrawAmount ? 0.5 : 1,
                }}
              >
                {withdrawing ? "Processing..." : "Withdraw"}
              </button>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              {[100, 250, 500, 1000].map((a) => (
                <button key={a} onClick={() => setWithdrawAmount(String(a))} style={{
                  flex: 1, padding: "6px 0",
                  background: withdrawAmount === String(a) ? "#f59e0b22" : "#111",
                  border: `1px solid ${withdrawAmount === String(a) ? "#f59e0b" : "#2a2a2a"}`,
                  borderRadius: 8,
                  color: withdrawAmount === String(a) ? "#f59e0b" : "#555",
                  fontSize: 12, cursor: "pointer", fontWeight: 600,
                }}>
                  ₹{a}
                </button>
              ))}
            </div>

            {withdrawError && (
              <p style={{ color: "#ef4444", fontSize: 13, marginTop: 10 }}>{withdrawError}</p>
            )}
            {withdrawSuccess && (
              <p style={{ color: "#22c55e", fontSize: 13, marginTop: 10 }}>{withdrawSuccess}</p>
            )}
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
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
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
                  {available ? "⏳ Waiting for incoming calls. Keep this tab open." : "Toggle on to start receiving calls."}
                </p>
              </>
            )}
            {error && <p style={{ color: "#ef4444", fontSize: 13, marginTop: 12 }}>{error}</p>}
          </div>

          {/* History button */}
          <button
            onClick={() => router.push("/listener-history")}
            style={{
              width: "100%", padding: "12px", background: "transparent",
              border: "1px solid #2a2a2a", borderRadius: 12,
              color: "#555", fontSize: 14, cursor: "pointer", marginBottom: 16,
            }}
          >
            📋 Session &amp; earnings history
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