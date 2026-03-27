"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import AuthGuard from "@/components/AuthGuard";

declare global {
  interface Window {
    Razorpay: new (options: object) => { open(): void };
  }
}

type User = { id: string; email: string; role: string };
type ActiveSession = { id: string; type: string; status: string } | null;

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [callType, setCallType] = useState<"VOICE" | "VIDEO">("VOICE");
  const [calling, setCalling] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSession>(null);
  const router = useRouter();

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  useEffect(() => {
    api.getMe()
      .then((u) => {
        if (u.role === "LISTENER") { router.push("/listener-dashboard"); return; }
        setUser(u);
        api.getBalance().then(setBalance);
        // ✅ Feature 4 — check for active session (recovery)
        api.getActiveSession().then(setActiveSession).catch(() => {});
      })
      .catch(() => router.push("/"));
  }, []);

  const handleRecharge = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return;
    setError(null);
    setPaying(true);

    try {
      const order = await api.createPaymentOrder(amt);

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Express",
        description: "Wallet Recharge",
        order_id: order.orderId,
        prefill: { email: user?.email || "" },
        theme: { color: "#22c55e" },

        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const newBalance = await api.verifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              amount: amt,
            });
            setBalance(newBalance);
            setAmount("");
          } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Payment verification failed");
          } finally {
            setPaying(false);
          }
        },

        modal: { ondismiss: () => setPaying(false) },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to initiate payment");
      setPaying(false);
    }
  };

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
    <AuthGuard>
      <div style={{
        minHeight: "100vh",
        background: "#0f0f0f",
        color: "#fff",
        fontFamily: "'DM Sans', sans-serif",
        padding: "40px 24px",
      }}>
        <div style={{ maxWidth: 420, margin: "0 auto" }}>

          <div style={{ marginBottom: 40 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: "-0.5px" }}>
              Express
            </h1>
            {user && <p style={{ color: "#666", margin: "6px 0 0", fontSize: 14 }}>{user.email}</p>}
          </div>

          {/* ✅ Feature 4 — Active session recovery banner */}
          {activeSession && (
            <div style={{
              background: "#22c55e18",
              border: "1px solid #22c55e44",
              borderRadius: 12,
              padding: "16px",
              marginBottom: 20,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <div>
                <p style={{ margin: 0, fontWeight: 600, color: "#22c55e", fontSize: 14 }}>
                  Active call in progress
                </p>
                <p style={{ margin: "2px 0 0", color: "#555", fontSize: 12 }}>
                  {activeSession.type === "VOICE" ? "🎙 Voice" : "🎥 Video"} call
                </p>
              </div>
              <button
                onClick={() => router.push(`/call?sessionId=${activeSession.id}`)}
                style={{
                  padding: "8px 16px",
                  background: "#22c55e",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Rejoin
              </button>
            </div>
          )}

          {/* Balance card */}
          <div style={{
            background: "#1a1a1a", borderRadius: 16,
            padding: "24px", marginBottom: 24, border: "1px solid #2a2a2a",
          }}>
            <p style={{ color: "#666", fontSize: 13, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 1 }}>
              Balance
            </p>
            <p style={{ fontSize: 36, fontWeight: 700, margin: "0 0 20px", color: "#fff" }}>
              ₹{balance !== null ? balance.toFixed(2) : "—"}
            </p>

            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount (₹)"
                type="number"
                min="1"
                style={{
                  flex: 1, background: "#111", border: "1px solid #2a2a2a",
                  borderRadius: 10, padding: "10px 14px",
                  color: "#fff", fontSize: 15, outline: "none",
                }}
              />
              <button
                onClick={handleRecharge}
                disabled={paying || !amount}
                style={{
                  background: paying ? "#1a1a1a" : "#22c55e",
                  color: paying ? "#555" : "#fff",
                  border: paying ? "1px solid #2a2a2a" : "none",
                  borderRadius: 10, padding: "10px 20px",
                  fontWeight: 600, fontSize: 14,
                  cursor: paying || !amount ? "not-allowed" : "pointer",
                  opacity: !amount ? 0.5 : 1,
                  whiteSpace: "nowrap",
                }}
              >
                {paying ? "Opening..." : "Add Money"}
              </button>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              {[100, 250, 500, 1000].map((a) => (
                <button
                  key={a}
                  onClick={() => setAmount(String(a))}
                  style={{
                    flex: 1, padding: "6px 0",
                    background: amount === String(a) ? "#22c55e22" : "#111",
                    border: `1px solid ${amount === String(a) ? "#22c55e" : "#2a2a2a"}`,
                    borderRadius: 8,
                    color: amount === String(a) ? "#22c55e" : "#555",
                    fontSize: 12, cursor: "pointer", fontWeight: 600,
                  }}
                >
                  ₹{a}
                </button>
              ))}
            </div>
          </div>

          {/* Call section */}
          <div style={{
            background: "#1a1a1a", borderRadius: 16,
            padding: "24px", border: "1px solid #2a2a2a", marginBottom: 12,
          }}>
            <p style={{ color: "#666", fontSize: 13, margin: "0 0 16px", textTransform: "uppercase", letterSpacing: 1 }}>
              Start a Call
            </p>

            <div style={{
              display: "flex", background: "#111",
              borderRadius: 10, padding: 4, marginBottom: 20,
            }}>
              {(["VOICE", "VIDEO"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setCallType(t)}
                  style={{
                    flex: 1, padding: "10px", borderRadius: 8, border: "none",
                    cursor: "pointer", fontWeight: 600, fontSize: 14,
                    background: callType === t ? "#fff" : "transparent",
                    color: callType === t ? "#000" : "#555",
                    transition: "all 0.15s",
                  }}
                >
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
                    width: 16, height: 16,
                    border: "2px solid #555", borderTopColor: "#888",
                    borderRadius: "50%", display: "inline-block",
                    animation: "spin 0.8s linear infinite",
                  }} />
                  Connecting...
                </>
              ) : `${callType === "VOICE" ? "🎙" : "🎥"} Start ${callType === "VOICE" ? "Voice" : "Video"} Call`}
            </button>

            {error && (
              <p style={{ color: "#ef4444", fontSize: 13, marginTop: 12, textAlign: "center" }}>
                {error}
              </p>
            )}
          </div>

          <button
            onClick={() => router.push("/history")}
            style={{
              width: "100%", padding: "12px",
              background: "transparent", border: "1px solid #2a2a2a",
              borderRadius: 12, color: "#555", fontSize: 14,
              cursor: "pointer", marginBottom: 24,
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