"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";

type User = { id: string; email: string; role: string };

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [callType, setCallType] = useState<"VOICE" | "VIDEO">("VOICE");
  const [calling, setCalling] = useState(false);
  const [recharging, setRecharging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    api.getMe()
      .then((u) => {
        if (u.role === "LISTENER") { router.push("/listener-dashboard"); return; }
        setUser(u);
        api.getBalance().then(setBalance);
      })
      .catch(() => router.push("/"));
  }, []);

  const recharge = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return;
    setRecharging(true);
    setError(null);
    try {
      const newBalance = await api.recharge(Number(amount));
      setBalance(newBalance);
      setAmount("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Recharge failed");
    } finally {
      setRecharging(false);
    }
  };

  // ✅ Single button — finds listener, creates session, starts it, goes to call
  const startCall = async (type: "VOICE" | "VIDEO") => {
    setError(null);
    setCalling(true);
    try {
      const session = await api.initiateCall(type);
      router.push(`/call?sessionId=${session.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not start call");
      setCalling(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f0f0f",
      color: "#fff",
      fontFamily: "'DM Sans', sans-serif",
      padding: "40px 24px",
    }}>
      <div style={{ maxWidth: 420, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: "-0.5px" }}>
            Express
          </h1>
          {user && (
            <p style={{ color: "#666", margin: "6px 0 0", fontSize: 14 }}>{user.email}</p>
          )}
        </div>

        {/* Balance card */}
        <div style={{
          background: "#1a1a1a",
          borderRadius: 16,
          padding: "24px",
          marginBottom: 24,
          border: "1px solid #2a2a2a",
        }}>
          <p style={{ color: "#666", fontSize: 13, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 1 }}>
            Balance
          </p>
          <p style={{ fontSize: 36, fontWeight: 700, margin: 0, color: "#fff" }}>
            ₹{balance !== null ? balance.toFixed(2) : "—"}
          </p>

          <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              type="number"
              style={{
                flex: 1,
                background: "#111",
                border: "1px solid #2a2a2a",
                borderRadius: 10,
                padding: "10px 14px",
                color: "#fff",
                fontSize: 15,
                outline: "none",
              }}
            />
            <button
              onClick={recharge}
              disabled={recharging}
              style={{
                background: "#fff",
                color: "#000",
                border: "none",
                borderRadius: 10,
                padding: "10px 20px",
                fontWeight: 600,
                fontSize: 14,
                cursor: recharging ? "not-allowed" : "pointer",
                opacity: recharging ? 0.6 : 1,
              }}
            >
              {recharging ? "..." : "Recharge"}
            </button>
          </div>
        </div>

        {/* Call section */}
        <div style={{
          background: "#1a1a1a",
          borderRadius: 16,
          padding: "24px",
          border: "1px solid #2a2a2a",
        }}>
          <p style={{ color: "#666", fontSize: 13, margin: "0 0 16px", textTransform: "uppercase", letterSpacing: 1 }}>
            Start a Call
          </p>

          {/* Call type toggle */}
          <div style={{
            display: "flex",
            background: "#111",
            borderRadius: 10,
            padding: 4,
            marginBottom: 20,
          }}>
            {(["VOICE", "VIDEO"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setCallType(t)}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 14,
                  transition: "all 0.15s",
                  background: callType === t ? "#fff" : "transparent",
                  color: callType === t ? "#000" : "#555",
                }}
              >
                {t === "VOICE" ? "🎙 Voice" : "🎥 Video"}
                <span style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 400,
                  marginTop: 2,
                  color: callType === t ? "#444" : "#444",
                }}>
                  ₹{t === "VOICE" ? "2.5" : "3.0"}/min
                </span>
              </button>
            ))}
          </div>

          {/* Call button */}
          <button
            onClick={() => startCall(callType)}
            disabled={calling}
            style={{
              width: "100%",
              padding: "16px",
              background: calling ? "#1a1a1a" : (callType === "VOICE" ? "#22c55e" : "#3b82f6"),
              color: calling ? "#555" : "#fff",
              border: calling ? "1px solid #2a2a2a" : "none",
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 700,
              cursor: calling ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            {calling ? (
              <>
                <span style={{
                  width: 16,
                  height: 16,
                  border: "2px solid #555",
                  borderTopColor: "#888",
                  borderRadius: "50%",
                  display: "inline-block",
                  animation: "spin 0.8s linear infinite",
                }} />
                Connecting...
              </>
            ) : (
              `${callType === "VOICE" ? "🎙" : "🎥"} Start ${callType === "VOICE" ? "Voice" : "Video"} Call`
            )}
          </button>

          {error && (
            <p style={{
              color: "#ef4444",
              fontSize: 13,
              marginTop: 12,
              textAlign: "center",
              margin: "12px 0 0",
            }}>
              {error}
            </p>
          )}
        </div>

        {/* History link */}
        <button
          onClick={() => router.push("/history")}
          style={{
            marginTop: 12,
            width: "100%",
            padding: "12px",
            background: "transparent",
            border: "1px solid #2a2a2a",
            borderRadius: 12,
            color: "#555",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          📋 View call & transaction history
        </button>

        {/* Logout */}
        <button
          onClick={() => { localStorage.removeItem("token"); router.push("/"); }}
          style={{
            marginTop: 24,
            background: "transparent",
            border: "none",
            color: "#444",
            fontSize: 13,
            cursor: "pointer",
            padding: 0,
          }}
        >
          Logout
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}