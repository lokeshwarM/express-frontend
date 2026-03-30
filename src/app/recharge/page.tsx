"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import AuthGuard from "@/components/AuthGuard";

export default function RechargePage() {
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [user, setUser] = useState<{ email: string } | null>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  useEffect(() => {
    api.getMe().then(setUser).catch(() => router.push("/"));
    api.getBalance().then(setBalance).catch(() => {});
  }, []);

  const handleRecharge = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return;
    setError(null);
    setSuccess(null);
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
            setSuccess(`₹${amt} added successfully! New balance: ₹${newBalance.toFixed(2)}`);
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

  return (
    <AuthGuard>
      <div style={{
        minHeight: "100vh", background: "#0f0f0f",
        color: "#fff", fontFamily: "'DM Sans', sans-serif", padding: "40px 24px",
      }}>
        <div style={{ maxWidth: 420, margin: "0 auto" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
            <button onClick={() => router.back()} style={{
              background: "#1a1a1a", border: "1px solid #2a2a2a",
              color: "#fff", borderRadius: 8, padding: "6px 14px",
              cursor: "pointer", fontSize: 14,
            }}>← Back</button>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Add Money</h1>
          </div>

          {/* Balance */}
          <div style={{
            background: "#1a1a1a", borderRadius: 16, padding: "20px 24px",
            marginBottom: 24, border: "1px solid #2a2a2a",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <p style={{ color: "#666", fontSize: 12, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 1 }}>
                Current Balance
              </p>
              <p style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>
                ₹{balance !== null ? balance.toFixed(2) : "—"}
              </p>
            </div>
            <span style={{ fontSize: 32 }}>💳</span>
          </div>

          {/* Amount input */}
          <div style={{
            background: "#1a1a1a", borderRadius: 16,
            padding: "24px", marginBottom: 16, border: "1px solid #2a2a2a",
          }}>
            <p style={{ color: "#666", fontSize: 13, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: 1 }}>
              Enter Amount
            </p>
            <div style={{ position: "relative", marginBottom: 12 }}>
              <span style={{
                position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)",
                color: "#fff", fontSize: 20, fontWeight: 700,
              }}>₹</span>
              <input
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
                style={{
                  width: "100%", background: "#111",
                  border: "1px solid #2a2a2a", borderRadius: 10,
                  padding: "14px 16px 14px 36px", color: "#fff",
                  fontSize: 24, fontWeight: 700, outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            {/* Quick amounts */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {[50, 100, 250, 500, 1000].map((a) => (
                <button key={a} onClick={() => setAmount(String(a))} style={{
                  flex: 1, padding: "8px 0",
                  background: amount === String(a) ? "#22c55e22" : "#111",
                  border: `1px solid ${amount === String(a) ? "#22c55e" : "#2a2a2a"}`,
                  borderRadius: 8,
                  color: amount === String(a) ? "#22c55e" : "#555",
                  fontSize: 12, cursor: "pointer", fontWeight: 600,
                }}>₹{a}</button>
              ))}
            </div>

            {/* Session info */}
            <div style={{ background: "#111", borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
              <p style={{ color: "#444", fontSize: 12, margin: "0 0 6px" }}>With ₹{amount || "0"} you can have:</p>
              <p style={{ color: "#fff", fontSize: 13, margin: "0 0 2px" }}>
                🎙 {amount ? Math.floor(Number(amount) / 2.5) : 0} min of Voice calls
              </p>
              <p style={{ color: "#fff", fontSize: 13, margin: 0 }}>
                🎥 {amount ? Math.floor(Number(amount) / 3.0) : 0} min of Video calls
              </p>
            </div>

            {error && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{error}</p>}
            {success && (
              <div style={{
                background: "#22c55e18", border: "1px solid #22c55e44",
                borderRadius: 10, padding: "12px 16px", marginBottom: 12,
              }}>
                <p style={{ color: "#22c55e", fontSize: 14, margin: 0 }}>{success}</p>
              </div>
            )}

            <button
              onClick={handleRecharge}
              disabled={paying || !amount || Number(amount) <= 0}
              style={{
                width: "100%", padding: "16px",
                background: amount && Number(amount) > 0 && !paying ? "#22c55e" : "#1a1a1a",
                color: amount && Number(amount) > 0 && !paying ? "#fff" : "#555",
                border: "none", borderRadius: 12,
                fontSize: 16, fontWeight: 700,
                cursor: amount && Number(amount) > 0 && !paying ? "pointer" : "not-allowed",
                opacity: !amount || Number(amount) <= 0 ? 0.5 : 1,
              }}
            >
              {paying ? "Opening payment..." : `Pay ₹${amount || "0"} via Razorpay`}
            </button>
          </div>

          <p style={{ color: "#333", fontSize: 12, textAlign: "center" }}>
            Secured by Razorpay · UPI, Cards, Net Banking accepted
          </p>
        </div>
      </div>
    </AuthGuard>
  );
}