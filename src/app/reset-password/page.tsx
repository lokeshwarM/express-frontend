"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/services/api";

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") || "";
  const otp = params.get("otp") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async () => {
    if (!password || password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await api.resetPassword(email, otp, password);
      alert("Password reset successful! Please login.");
      router.push("/login");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (

    <div style={{
      minHeight: "100vh",
      background: "#0f0f0f",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'DM Sans', sans-serif",
      padding: 24,
    }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#fff", margin: "0 0 8px" }}>
          Set new password
        </h1>
        <p style={{ color: "#555", margin: "0 0 32px", fontSize: 14 }}>
          For {email}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            style={{
              background: "#1a1a1a", border: "1px solid #2a2a2a",
              borderRadius: 10, padding: "12px 16px",
              color: "#fff", fontSize: 15, outline: "none",
            }}
          />
          <input
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            type="password"
            onKeyDown={(e) => e.key === "Enter" && handleReset()}
            style={{
              background: "#1a1a1a",
              border: `1px solid ${confirm && confirm !== password ? "#ef4444" : "#2a2a2a"}`,
              borderRadius: 10, padding: "12px 16px",
              color: "#fff", fontSize: 15, outline: "none",
            }}
          />
        </div>

        {error && (
          <p style={{ color: "#ef4444", fontSize: 13, marginTop: 10 }}>{error}</p>
        )}

        <button
          onClick={handleReset}
          disabled={loading || !password || !confirm}
          style={{
            width: "100%", marginTop: 16, padding: "14px",
            background: password && confirm && !loading ? "#fff" : "#1a1a1a",
            color: password && confirm && !loading ? "#000" : "#555",
            border: password && confirm ? "none" : "1px solid #2a2a2a",
            borderRadius: 10, fontSize: 15, fontWeight: 700,
            cursor: password && confirm && !loading ? "pointer" : "not-allowed",
          }}
        >
          {loading ? "Resetting..." : "Reset Password"}
        </button>
      </div>
    </div>
  
  );
}