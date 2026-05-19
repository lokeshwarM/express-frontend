"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email) return;
    setError(null);
    setLoading(true);
    try {
      await api.forgotPassword(email);
      router.push(`/verify-otp?email=${encodeURIComponent(email)}&mode=reset`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
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
          Forgot password?
        </h1>
        <p style={{ color: "#555", margin: "0 0 32px", fontSize: 14 }}>
          Enter your email and we will send you an OTP to reset your password.
        </p>

        <input
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          style={{
            width: "100%", background: "#1a1a1a",
            border: "1px solid #2a2a2a", borderRadius: 10,
            padding: "12px 16px", color: "#fff", fontSize: 15,
            outline: "none", boxSizing: "border-box",
          }}
        />

        {error && (
          <p style={{ color: "#ef4444", fontSize: 13, marginTop: 10 }}>{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !email}
          style={{
            width: "100%", marginTop: 16, padding: "14px",
            background: email && !loading ? "#fff" : "#1a1a1a",
            color: email && !loading ? "#000" : "#555",
            border: email ? "none" : "1px solid #2a2a2a",
            borderRadius: 10, fontSize: 15, fontWeight: 700,
            cursor: email && !loading ? "pointer" : "not-allowed",
          }}
        >
          {loading ? "Sending OTP..." : "Send OTP"}
        </button>

        <button
          onClick={() => router.push("/login")}
          style={{
            marginTop: 16, width: "100%",
            background: "transparent", border: "none",
            color: "#444", fontSize: 13, cursor: "pointer",
          }}
        >
          ← Back to login
        </button>
      </div>
    </div>
    
  );
}