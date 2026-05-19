"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/services/api";

export const dynamic = "force-dynamic";

type LoginMode = "password" | "otp";

export default function LoginPage() {
  const [mode, setMode] = useState<LoginMode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          callback: handleGoogleCallback,
        });
        renderGoogleBtn();
      }
    };
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) document.body.removeChild(script);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const renderGoogleBtn = () => {
    const btn = document.getElementById("google-login-btn");
    if (!btn || !window.google) return;
    btn.innerHTML = "";
    window.google.accounts.id.renderButton(btn, {
      type: "standard",
      theme: "filled_black",
      size: "large",
      text: "signin_with",
      width: 360,
      logo_alignment: "left",
    });
  };

  const handleGoogleCallback = async (response: { credential: string }) => {
    setError(null);
    setLoading(true);
    try {
      const data = await api.googleAuth(response.credential, "USER");
      localStorage.setItem("token", data.token);
      router.push(
        data.role === "LISTENER" ? "/listener-dashboard" :
        data.role === "ADMIN" ? "/admin" :
        "/dashboard"
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Google login failed");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async () => {
    if (!email || !password) return;
    setError(null);
    setLoading(true);
    try {
      const data = await api.login(email, password);
      localStorage.setItem("token", data.token);
      router.push(
        data.role === "LISTENER" ? "/listener-dashboard" :
        data.role === "ADMIN" ? "/admin" :
        "/dashboard"
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Login failed";
      if (msg === "EMAIL_NOT_VERIFIED") {
        router.push(`/verify-otp?email=${encodeURIComponent(email)}&mode=verify`);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendLoginOtp = async () => {
    if (!email) return;
    setError(null);
    setLoading(true);
    try {
      await api.resendOtp(email, "EMAIL_VERIFY");
      setOtpSent(true);
      setCountdown(60);
      setOtp(["", "", "", "", "", ""]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) {
      const inputs = document.querySelectorAll<HTMLInputElement>(".otp-input");
      inputs[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const inputs = document.querySelectorAll<HTMLInputElement>(".otp-input");
      inputs[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) setOtp(pasted.split(""));
  };

  const handleOtpLogin = async () => {
    const code = otp.join("");
    if (code.length !== 6) return;
    setError(null);
    setLoading(true);
    try {
      const data = await api.verifyEmail(email, code);
      localStorage.setItem("token", data.token);
      router.push(
        data.role === "LISTENER" ? "/listener-dashboard" :
        data.role === "ADMIN" ? "/admin" :
        "/dashboard"
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m: LoginMode) => {
    setMode(m);
    setError(null);
    setOtpSent(false);
    setOtp(["", "", "", "", "", ""]);
    setPassword("");
  };

  const inputStyle: React.CSSProperties = {
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: 10,
    padding: "12px 16px",
    color: "#fff",
    fontSize: 15,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };

  if (!mounted) return null;

  return (
    <div
      suppressHydrationWarning
      style={{
        minHeight: "100vh",
        background: "#0f0f0f",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'DM Sans', sans-serif",
        padding: 24,
      }}
    >
      <div suppressHydrationWarning style={{ width: "100%", maxWidth: 380 }}>

        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#fff", margin: "0 0 8px" }}>
          Express
        </h1>
        <p style={{ color: "#555", margin: "0 0 28px", fontSize: 14 }}>
          Sign in to continue
        </p>

        <div id="google-login-btn" style={{ marginBottom: 20 }} />

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: "#2a2a2a" }} />
          <span style={{ color: "#444", fontSize: 12 }}>or sign in with</span>
          <div style={{ flex: 1, height: 1, background: "#2a2a2a" }} />
        </div>

        <div style={{
          display: "flex", background: "#1a1a1a",
          borderRadius: 10, padding: 4,
          border: "1px solid #2a2a2a", marginBottom: 20,
        }}>
          {(["password", "otp"] as LoginMode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              style={{
                flex: 1, padding: "10px", borderRadius: 8, border: "none",
                cursor: "pointer", fontWeight: 600, fontSize: 13,
                background: mode === m ? "#fff" : "transparent",
                color: mode === m ? "#000" : "#555",
                transition: "all 0.15s",
              }}
            >
              {m === "password" ? "🔑 Password" : "📱 OTP"}
            </button>
          ))}
        </div>

        <input
          suppressHydrationWarning
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          style={{ ...inputStyle, marginBottom: 12 }}
        />

        {mode === "password" && (
          <>
            <input
              suppressHydrationWarning
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              onKeyDown={(e) => e.key === "Enter" && handlePasswordLogin()}
              style={inputStyle}
            />
            {error && <p style={{ color: "#ef4444", fontSize: 13, marginTop: 10 }}>{error}</p>}
            <button
              onClick={handlePasswordLogin}
              disabled={loading || !email || !password}
              style={{
                width: "100%", marginTop: 16, padding: "14px",
                background: email && password && !loading ? "#fff" : "#1a1a1a",
                color: email && password && !loading ? "#000" : "#555",
                border: email && password ? "none" : "1px solid #2a2a2a",
                borderRadius: 10, fontSize: 15, fontWeight: 700,
                cursor: email && password && !loading ? "pointer" : "not-allowed",
              }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </>
        )}

        {mode === "otp" && (
          <>
            {!otpSent ? (
              <>
                {error && <p style={{ color: "#ef4444", fontSize: 13, marginTop: 4 }}>{error}</p>}
                <button
                  onClick={handleSendLoginOtp}
                  disabled={loading || !email}
                  style={{
                    width: "100%", marginTop: 4, padding: "14px",
                    background: email && !loading ? "#fff" : "#1a1a1a",
                    color: email && !loading ? "#000" : "#555",
                    border: email ? "none" : "1px solid #2a2a2a",
                    borderRadius: 10, fontSize: 15, fontWeight: 700,
                    cursor: email && !loading ? "pointer" : "not-allowed",
                  }}
                >
                  {loading ? "Sending OTP..." : "Send OTP →"}
                </button>
              </>
            ) : (
              <>
                <p style={{ color: "#888", fontSize: 13, margin: "0 0 16px" }}>
                  OTP sent to <span style={{ color: "#fff" }}>{email}</span>
                </p>
                <div
                  style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 16 }}
                  onPaste={handleOtpPaste}
                >
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      className="otp-input"
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      maxLength={1}
                      inputMode="numeric"
                      style={{
                        width: 48, height: 58, background: "#1a1a1a",
                        border: `1px solid ${digit ? "#fff" : "#2a2a2a"}`,
                        borderRadius: 10, color: "#fff",
                        fontSize: 22, fontWeight: 700,
                        textAlign: "center", outline: "none",
                      }}
                    />
                  ))}
                </div>
                {error && (
                  <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 12, textAlign: "center" }}>
                    {error}
                  </p>
                )}
                <button
                  onClick={handleOtpLogin}
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
                  {loading ? "Verifying..." : "Verify & Sign In"}
                </button>
                <div style={{ marginTop: 12, textAlign: "center" }}>
                  {countdown > 0 ? (
                    <p style={{ color: "#444", fontSize: 13 }}>Resend in {countdown}s</p>
                  ) : (
                    <button
                      onClick={handleSendLoginOtp}
                      style={{
                        background: "transparent", border: "none",
                        color: "#888", fontSize: 13, cursor: "pointer",
                        textDecoration: "underline",
                      }}
                    >
                      Resend OTP
                    </button>
                  )}
                </div>
              </>
            )}
          </>
        )}

        <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between" }}>
          <Link href="/signup" style={{ color: "#555", fontSize: 13, textDecoration: "none" }}>
            Create account
          </Link>
          <Link href="/forgot-password" style={{ color: "#555", fontSize: 13, textDecoration: "none" }}>
            Forgot password?
          </Link>
        </div>
      </div>
    </div>
  );
}