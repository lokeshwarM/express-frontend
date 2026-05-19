"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import AuthGuard from "@/components/AuthGuard";

type User = { id: string; email: string; role: string };
type ActiveSession = { id: string; type: string; status: string } | null;

const MOODS = [
  { key: "stressed", emoji: "😔", label: "Stressed" },
  { key: "anxious", emoji: "😟", label: "Anxious" },
  { key: "neutral", emoji: "😐", label: "Neutral" },
  { key: "good", emoji: "🙂", label: "Good" },
];

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [callType, setCallType] = useState<"VOICE" | "VIDEO">("VOICE");
  const [calling, setCalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSession>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [savingMood, setSavingMood] = useState(false);
  const router = useRouter();

  useEffect(() => {
    api.getMe()
      .then((u) => {
        if (u.role === "LISTENER") { router.push("/listener-dashboard"); return; }
        if (u.role === "ADMIN") { router.push("/admin"); return; }
        setUser(u);
        api.getBalance().then(setBalance);
        api.getActiveSession().then(setActiveSession).catch(() => {});
        // Load saved mood
        api.getUserMood().then(setSelectedMood).catch(() => {});
      })
      .catch(() => router.push("/login"));
  }, []);

  const handleMoodSelect = async (mood: string) => {
    setSelectedMood(mood);
    setSavingMood(true);
    try {
      await api.saveUserMood(mood);
    } catch (e) {
      console.error("Mood save error:", e);
    } finally {
      setSavingMood(false);
    }
  };

  const startCall = async (type: "VOICE" | "VIDEO") => {
    setError(null);
    setCalling(true);
    try {
      const session = await api.initiateCall(type);
      router.push(`/call?sessionId=${session.id}&type=${type}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not start call");
      setCalling(false);
    }
  };

  return (
    <AuthGuard>
      <div style={{
        minHeight: "100vh", background: "#0f0f0f",
        color: "#fff", fontFamily: "'DM Sans', sans-serif", padding: "40px 24px",
      }}>
        <div style={{ maxWidth: 420, margin: "0 auto" }}>

          {/* Header with profile button */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: "-0.5px" }}>Express</h1>
              {user && <p style={{ color: "#666", margin: "4px 0 0", fontSize: 14 }}>{user.email}</p>}
            </div>
            <button
              onClick={() => router.push("/user-profile")}
              style={{
                width: 40, height: 40, borderRadius: "50%",
                background: "#1a1a1a", border: "1px solid #2a2a2a",
                color: "#fff", fontSize: 18, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >👤</button>
          </div>

          {/* Active session recovery */}
          {activeSession && (
            <div style={{
              background: "#22c55e18", border: "1px solid #22c55e44",
              borderRadius: 12, padding: "16px", marginBottom: 20,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div>
                <p style={{ margin: 0, fontWeight: 600, color: "#22c55e", fontSize: 14 }}>Active call in progress</p>
                <p style={{ margin: "2px 0 0", color: "#555", fontSize: 12 }}>
                  {activeSession.type === "VOICE" ? "🎙 Voice" : "🎥 Video"} call
                </p>
              </div>
              <button
                onClick={() => router.push(`/call?sessionId=${activeSession.id}&type=${activeSession.type}`)}
                style={{
                  padding: "8px 16px", background: "#22c55e", color: "#fff",
                  border: "none", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer",
                }}
              >Rejoin</button>
            </div>
          )}

          {/* Balance card */}
          <div style={{
            background: "#1a1a1a", borderRadius: 16,
            padding: "24px", marginBottom: 16, border: "1px solid #2a2a2a",
          }}>
            <p style={{ color: "#666", fontSize: 13, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 1 }}>
              Wallet Balance
            </p>
            <p style={{ fontSize: 40, fontWeight: 700, margin: "0 0 16px", color: "#fff" }}>
              ₹{balance !== null ? balance.toFixed(2) : "—"}
            </p>
            <button
              onClick={() => router.push("/recharge")}
              style={{
                width: "100%", padding: "12px", background: "#22c55e", color: "#fff",
                border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer",
              }}
            >💳 Add Money</button>
          </div>

          {/*  Phase 2.2 — Mood check before call */}
          <div style={{
            background: "#1a1a1a", borderRadius: 16,
            padding: "20px 24px", marginBottom: 16, border: "1px solid #2a2a2a",
          }}>
            <p style={{ color: "#666", fontSize: 13, margin: "0 0 14px", textTransform: "uppercase", letterSpacing: 1 }}>
              How are you feeling? {savingMood && <span style={{ color: "#444", fontSize: 10 }}>saving...</span>}
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              {MOODS.map((mood) => (
                <button
                  key={mood.key}
                  onClick={() => handleMoodSelect(mood.key)}
                  style={{
                    flex: 1, padding: "10px 4px", borderRadius: 10,
                    background: selectedMood === mood.key ? "#22c55e22" : "#111",
                    border: `1px solid ${selectedMood === mood.key ? "#22c55e" : "#2a2a2a"}`,
                    cursor: "pointer", transition: "all 0.15s",
                    display: "flex", flexDirection: "column",
                    alignItems: "center", gap: 4,
                  }}
                >
                  <span style={{ fontSize: 22 }}>{mood.emoji}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 600,
                    color: selectedMood === mood.key ? "#22c55e" : "#555",
                  }}>{mood.label}</span>
                </button>
              ))}
            </div>
            {selectedMood && (
              <p style={{ color: "#444", fontSize: 11, margin: "10px 0 0", textAlign: "center" }}>
                ✅ We will match you with the best listener for your mood
              </p>
            )}
          </div>

          {/* Call section */}
          <div style={{
            background: "#1a1a1a", borderRadius: 16,
            padding: "24px", border: "1px solid #2a2a2a", marginBottom: 12,
          }}>
            <p style={{ color: "#666", fontSize: 13, margin: "0 0 16px", textTransform: "uppercase", letterSpacing: 1 }}>
              Start a Call
            </p>
            <div style={{ display: "flex", background: "#111", borderRadius: 10, padding: 4, marginBottom: 20 }}>
              {(["VOICE", "VIDEO"] as const).map((t) => (
                <button key={t} onClick={() => setCallType(t)} style={{
                  flex: 1, padding: "10px", borderRadius: 8, border: "none",
                  cursor: "pointer", fontWeight: 600, fontSize: 14,
                  background: callType === t ? "#fff" : "transparent",
                  color: callType === t ? "#000" : "#555", transition: "all 0.15s",
                }}>
                  {t === "VOICE" ? "🎙 Voice" : "🎥 Video"}
                  <span style={{ display: "block", fontSize: 11, fontWeight: 400, marginTop: 2, color: "#444" }}>
                    ₹{t === "VOICE" ? "2.5" : "3.0"}/min
                  </span>
                </button>
              ))}
            </div>
            <button
              onClick={() => startCall(callType)}
              disabled={calling}
              style={{
                width: "100%", padding: "16px",
                background: calling ? "#1a1a1a" : callType === "VOICE" ? "#22c55e" : "#3b82f6",
                color: calling ? "#555" : "#fff",
                border: calling ? "1px solid #2a2a2a" : "none",
                borderRadius: 12, fontSize: 16, fontWeight: 700,
                cursor: calling ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              }}
            >
              {calling ? (
                <>
                  <span style={{
                    width: 16, height: 16, border: "2px solid #555", borderTopColor: "#888",
                    borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite",
                  }} />
                  Finding best listener...
                </>
              ) : `${callType === "VOICE" ? "🎙" : "🎥"} Start ${callType === "VOICE" ? "Voice" : "Video"} Call`}
            </button>
            {error && (
              <p style={{ color: "#ef4444", fontSize: 13, marginTop: 12, textAlign: "center" }}>{error}</p>
            )}
          </div>

          <button
            onClick={() => router.push("/history")}
            style={{
              width: "100%", padding: "12px", background: "transparent",
              border: "1px solid #2a2a2a", borderRadius: 12,
              color: "#555", fontSize: 14, cursor: "pointer", marginBottom: 16,
            }}
          >
            📋 Call &amp; transaction history
          </button>

          <button
            onClick={() => { localStorage.removeItem("token"); router.push("/"); }}
            style={{ background: "transparent", border: "none", color: "#444", fontSize: 13, cursor: "pointer", padding: 0 }}
          >
            Logout
          </button>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </AuthGuard>
  );
}