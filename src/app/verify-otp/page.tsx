"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/services/api";

export default function VerifyOtpPage() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") || "";
  const mode = params.get("mode") || "verify"; // "verify" | "reset"

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
    }
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length !== 6) return;
    setError(null);
    setLoading(true);

    try {
      if (mode === "verify") {
        const data = await api.verifyEmail(email, code);
        localStorage.setItem("token", data.token);
        router.push(data.role === "LISTENER" ? "/listener-dashboard" : "/dashboard");
      } else {
        router.push(`/reset-password?email=${encodeURIComponent(email)}&otp=${code}`);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError(null);
    try {
      await api.resendOtp(
        email,
        mode === "verify" ? "EMAIL_VERIFY" : "PASSWORD_RESET"
      );
      setCountdown(60);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to resend");
    } finally {
      setResending(false);
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
      <div style={{ width: "100%", maxWidth: 380, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>
          {mode === "verify" ? "📧" : "🔐"}
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#fff", margin: "0 0 8px" }}>
          {mode === "verify" ? "Verify your email" : "Enter OTP"}
        </h1>
        <p style={{ color: "#555", margin: "0 0 8px", fontSize: 14 }}>
          We sent a 6-digit code to
        </p>
        <p style={{ color: "#fff", margin: "0 0 32px", fontSize: 14, fontWeight: 600 }}>
          {email}
        </p>

        {/* OTP inputs */}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 24 }}
          onPaste={handlePaste}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              maxLength={1}
              inputMode="numeric"
              style={{
                width: 48, height: 56,
                background: "#1a1a1a",
                border: `1px solid ${digit ? "#fff" : "#2a2a2a"}`,
                borderRadius: 10,
                color: "#fff",
                fontSize: 22,
                fontWeight: 700,
                textAlign: "center",
                outline: "none",
                transition: "border 0.15s",
              }}
            />
          ))}
        </div>

        {error && (
          <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{error}</p>
        )}

        <button
          onClick={handleVerify}
          disabled={loading || otp.join("").length !== 6}
          style={{
            width: "100%", padding: "14px",
            background: otp.join("").length === 6 && !loading ? "#fff" : "#1a1a1a",
            color: otp.join("").length === 6 && !loading ? "#000" : "#555",
            border: otp.join("").length === 6 ? "none" : "1px solid #2a2a2a",
            borderRadius: 10, fontSize: 15, fontWeight: 700,
            cursor: otp.join("").length === 6 && !loading ? "pointer" : "not-allowed",
          }}
        >
          {loading ? "Verifying..." : mode === "verify" ? "Verify Email" : "Continue"}
        </button>

        {/* Resend */}
        <div style={{ marginTop: 20 }}>
          {countdown > 0 ? (
            <p style={{ color: "#444", fontSize: 13 }}>
              Resend in {countdown}s
            </p>
          ) : (
            <button
              onClick={handleResend}
              disabled={resending}
              style={{
                background: "transparent", border: "none",
                color: "#888", fontSize: 13, cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              {resending ? "Sending..." : "Resend OTP"}
            </button>
          )}
        </div>

        <button
          onClick={() => router.push("/login")}
          style={{
            marginTop: 16, background: "transparent",
            border: "none", color: "#444", fontSize: 13, cursor: "pointer",
          }}
        >
          ← Back to login
        </button>
      </div>
    </div>
    
  );
}