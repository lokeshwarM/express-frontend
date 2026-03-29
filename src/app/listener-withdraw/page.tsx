"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import AuthGuard from "@/components/AuthGuard";

type PaymentMethod = "UPI" | "BANK";

export default function ListenerWithdrawPage() {
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("UPI");
  const [upiId, setUpiId] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccount, setConfirmAccount] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    api.getBalance().then(setBalance).catch(() => {});
  }, []);

  const handleWithdraw = async () => {
    const amt = Number(amount);
    if (!amt || amt < 100) {
      setError("Minimum withdrawal amount is ₹100");
      return;
    }
    if (balance !== null && amt > balance) {
      setError("Insufficient balance");
      return;
    }
    if (method === "UPI" && !upiId.trim()) {
      setError("Please enter your UPI ID");
      return;
    }
    if (method === "BANK") {
      if (!accountHolderName.trim()) { setError("Please enter account holder name"); return; }
      if (!accountNumber.trim()) { setError("Please enter account number"); return; }
      if (accountNumber !== confirmAccount) { setError("Account numbers do not match"); return; }
      if (!ifscCode.trim()) { setError("Please enter IFSC code"); return; }
    }

    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const newBalance = await api.withdraw(amt, method, upiId, accountNumber, ifscCode, accountHolderName);
      setBalance(newBalance);
      setSuccess(`₹${amt.toFixed(2)} withdrawal request submitted! It will be processed within 2-3 business days.`);
      setAmount("");
      setUpiId("");
      setAccountNumber("");
      setConfirmAccount("");
      setIfscCode("");
      setAccountHolderName("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Withdrawal failed");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "#111",
    border: "1px solid #2a2a2a", borderRadius: 10,
    padding: "12px 16px", color: "#fff",
    fontSize: 15, outline: "none", boxSizing: "border-box",
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
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Withdraw</h1>
          </div>

          {/* Balance */}
          <div style={{
            background: "#1a1a1a", borderRadius: 16,
            padding: "20px 24px", marginBottom: 24, border: "1px solid #2a2a2a",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <p style={{ color: "#666", fontSize: 12, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 1 }}>
                Available Balance
              </p>
              <p style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>
                ₹{balance !== null ? balance.toFixed(2) : "—"}
              </p>
            </div>
            <span style={{ fontSize: 32 }}>💰</span>
          </div>

          {/* Amount */}
          <div style={{
            background: "#1a1a1a", borderRadius: 16,
            padding: "24px", marginBottom: 16, border: "1px solid #2a2a2a",
          }}>
            <p style={{ color: "#666", fontSize: 13, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: 1 }}>
              Amount
            </p>
            <input
              type="number"
              placeholder="Enter amount (min ₹100)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="100"
              style={inputStyle}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              {[100, 250, 500, 1000].map((a) => (
                <button key={a} onClick={() => setAmount(String(a))} style={{
                  flex: 1, padding: "6px 0",
                  background: amount === String(a) ? "#f59e0b22" : "#111",
                  border: `1px solid ${amount === String(a) ? "#f59e0b" : "#2a2a2a"}`,
                  borderRadius: 8,
                  color: amount === String(a) ? "#f59e0b" : "#555",
                  fontSize: 12, cursor: "pointer", fontWeight: 600,
                }}>₹{a}</button>
              ))}
            </div>
          </div>

          {/* Payment Method */}
          <div style={{
            background: "#1a1a1a", borderRadius: 16,
            padding: "24px", marginBottom: 16, border: "1px solid #2a2a2a",
          }}>
            <p style={{ color: "#666", fontSize: 13, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: 1 }}>
              Payment Method
            </p>

            {/* Method toggle */}
            <div style={{
              display: "flex", background: "#111",
              borderRadius: 10, padding: 4, marginBottom: 20,
              border: "1px solid #2a2a2a",
            }}>
              {(["UPI", "BANK"] as PaymentMethod[]).map((m) => (
                <button key={m} onClick={() => setMethod(m)} style={{
                  flex: 1, padding: "10px", borderRadius: 8, border: "none",
                  cursor: "pointer", fontWeight: 600, fontSize: 13,
                  background: method === m ? "#fff" : "transparent",
                  color: method === m ? "#000" : "#555",
                  transition: "all 0.15s",
                }}>
                  {m === "UPI" ? "📱 UPI" : "🏦 Bank Transfer"}
                </button>
              ))}
            </div>

            {/* UPI fields */}
            {method === "UPI" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <input
                  placeholder="Enter UPI ID (e.g. name@upi)"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  style={inputStyle}
                />
                <p style={{ color: "#444", fontSize: 12, margin: 0 }}>
                  ℹ️ Money will be sent directly to your UPI ID within 2-3 business days.
                </p>
              </div>
            )}

            {/* Bank fields */}
            {method === "BANK" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <input
                  placeholder="Account holder name"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  style={inputStyle}
                />
                <input
                  placeholder="Account number"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  style={inputStyle}
                />
                <input
                  placeholder="Confirm account number"
                  value={confirmAccount}
                  onChange={(e) => setConfirmAccount(e.target.value)}
                  style={{
                    ...inputStyle,
                    border: `1px solid ${confirmAccount && confirmAccount !== accountNumber ? "#ef4444" : "#2a2a2a"}`,
                  }}
                />
                <input
                  placeholder="IFSC code"
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                  style={inputStyle}
                />
                <p style={{ color: "#444", fontSize: 12, margin: 0 }}>
                  ℹ️ Bank transfers are processed within 2-3 business days.
                </p>
              </div>
            )}
          </div>

          {error && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{error}</p>}
          {success && (
            <div style={{
              background: "#22c55e18", border: "1px solid #22c55e44",
              borderRadius: 12, padding: "16px", marginBottom: 16,
            }}>
              <p style={{ color: "#22c55e", fontSize: 14, margin: 0 }}>{success}</p>
            </div>
          )}

          <button
            onClick={handleWithdraw}
            disabled={loading || !amount}
            style={{
              width: "100%", padding: "16px",
              background: amount && !loading ? "#f59e0b" : "#1a1a1a",
              color: amount && !loading ? "#000" : "#555",
              border: "none", borderRadius: 12,
              fontSize: 16, fontWeight: 700,
              cursor: amount && !loading ? "pointer" : "not-allowed",
              opacity: !amount ? 0.5 : 1,
            }}
          >
            {loading ? "Processing..." : "💸 Request Withdrawal"}
          </button>

          <p style={{ color: "#333", fontSize: 12, textAlign: "center", marginTop: 16 }}>
            Minimum withdrawal: ₹100 · Processing: 2-3 business days
          </p>
        </div>
      </div>
    </AuthGuard>
  );
}