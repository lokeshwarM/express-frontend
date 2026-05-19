"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/services/api";

type Step = "email" | "otp" | "profile";

export default function SignupPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState<"USER" | "LISTENER">("USER");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  //  Re-initialize Google GSI whenever role changes so callback captures latest role
  useEffect(() => {
    if (typeof window === "undefined" || !window.google) return;
    window.google.accounts.id.initialize({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      callback: handleGoogleCallback,
    });
    if (step === "email") renderGoogleBtn();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);


  useEffect(() => {
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
    return () => { document.body.removeChild(script); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (step === "email" && typeof window !== "undefined" && window.google) {
      renderGoogleBtn();
    }
  }, [role, step]);

  const renderGoogleBtn = () => {
    const btn = document.getElementById("google-signup-btn");
    if (!btn || !window.google) return;
    btn.innerHTML = "";
    window.google.accounts.id.renderButton(btn, {
      type: "standard",
      theme: "filled_black",
      size: "large",
      text: "signup_with",
      width: 360,
      logo_alignment: "left",
    });
  };

  const handleGoogleCallback = async (response: { credential: string }) => {
    setError(null);
    setLoading(true);
    try {
      // ✅ role state is correctly captured here
      const data = await api.googleAuth(response.credential, role);
      localStorage.setItem("token", data.token);
      router.push(data.role === "LISTENER" ? "/listener-dashboard" : "/dashboard");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Google signup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!email) return;
    setError(null);
    setLoading(true);
    try {
      await api.sendSignupOtp(email);
      setStep("otp");
      setCountdown(60);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
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
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) setOtp(pasted.split(""));
  };

  const handleVerifyOtp = () => {
    if (otp.join("").length !== 6) return;
    setError(null);
    setStep("profile");
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.sendSignupOtp(email);
      setCountdown(60);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to resend");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    console.log("Submitting with role:", role);
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
      const data = await api.completeSignup({
        email,
        otp: otp.join(""),
        password,
        role,
      });
      localStorage.setItem("token", data.token);
      router.push(data.role === "LISTENER" ? "/listener-dashboard" : "/dashboard");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Signup failed";
      if (msg.includes("OTP")) {
        setStep("otp");
        setOtp(["", "", "", "", "", ""]);
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
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

  const btnStyle = (active: boolean): React.CSSProperties => ({
    width: "100%",
    padding: "14px",
    background: active ? "#fff" : "#1a1a1a",
    color: active ? "#000" : "#555",
    border: active ? "none" : "1px solid #2a2a2a",
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 700,
    cursor: active ? "pointer" : "not-allowed",
    marginTop: 16,
  });

  const rolePicker = (currentRole: "USER" | "LISTENER") => (
    <div style={{ marginBottom: 20 }}>
      <p style={{ color: "#666", fontSize: 11, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 1 }}>
        I want to join as
      </p>
      <div style={{
        display: "flex", background: "#1a1a1a",
        borderRadius: 10, padding: 4, border: "1px solid #2a2a2a",
      }}>
        {(["USER", "LISTENER"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            style={{
              flex: 1, padding: "10px", borderRadius: 8, border: "none",
              cursor: "pointer", fontWeight: 600, fontSize: 13,
              background: currentRole === r ? "#fff" : "transparent",
              color: currentRole === r ? "#000" : "#555",
              transition: "all 0.15s",
            }}
          >
            {r === "USER" ? "👤 User" : "🎧 Listener"}
            <span style={{
              display: "block", fontSize: 10, fontWeight: 400,
              marginTop: 2, color: currentRole === r ? "#666" : "#444",
            }}>
              {r === "USER" ? "Make calls" : "Earn money"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );

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
      <div style={{ width: "100%", maxWidth: 380 }}>

        {/* Step indicator */}
        <div style={{ display: "flex", gap: 6, marginBottom: 32 }}>
          {(["email", "otp", "profile"] as Step[]).map((s, i) => (
            <div
              key={s}
              style={{
                flex: 1, height: 3, borderRadius: 2,
                background: step === s
                  ? "#fff"
                  : (["email", "otp", "profile"].indexOf(step) > i ? "#555" : "#2a2a2a"),
                transition: "background 0.3s",
              }}
            />
          ))}
        </div>

        {/* ─── STEP 1: Email ─────────────────────────────────────────────── */}
        {step === "email" && (
          <>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>
              Create Account
            </h1>
            <p style={{ color: "#555", margin: "0 0 24px", fontSize: 14 }}>
              Step 1 of 3 — Enter your email
            </p>

            {/* ✅ Single role picker — controls both Google and email signup */}
            {rolePicker(role)}

            <div id="google-signup-btn" style={{ marginBottom: 16 }} />

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 1, background: "#2a2a2a" }} />
              <span style={{ color: "#444", fontSize: 12 }}>or use email</span>
              <div style={{ flex: 1, height: 1, background: "#2a2a2a" }} />
            </div>

            <input
              style={inputStyle}
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
            />

            {error && <p style={{ color: "#ef4444", fontSize: 13, marginTop: 10 }}>{error}</p>}

            <button
              onClick={handleSendOtp}
              disabled={loading || !email}
              style={btnStyle(!!email && !loading)}
            >
              {loading ? "Sending OTP..." : "Send OTP →"}
            </button>

            <p style={{ marginTop: 20, textAlign: "center", color: "#555", fontSize: 13 }}>
              Already have an account?{" "}
              <Link href="/login" style={{ color: "#fff", textDecoration: "none" }}>Sign in</Link>
            </p>
          </>
        )}

        {/* ─── STEP 2: OTP ───────────────────────────────────────────────── */}
        {step === "otp" && (
          <>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>
              Verify Email
            </h1>
            <p style={{ color: "#555", margin: "0 0 4px", fontSize: 14 }}>
              Step 2 of 3 — Enter the 6-digit OTP
            </p>
            <p style={{ color: "#888", margin: "0 0 28px", fontSize: 13 }}>
              Sent to <span style={{ color: "#fff" }}>{email}</span>
            </p>

            <div
              style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 24 }}
              onPaste={handleOtpPaste}
            >
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  maxLength={1}
                  inputMode="numeric"
                  style={{
                    width: 48, height: 58,
                    background: "#1a1a1a",
                    border: `1px solid ${digit ? "#fff" : "#2a2a2a"}`,
                    borderRadius: 10, color: "#fff",
                    fontSize: 22, fontWeight: 700,
                    textAlign: "center", outline: "none",
                    transition: "border 0.15s",
                  }}
                />
              ))}
            </div>

            {error && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 12, textAlign: "center" }}>{error}</p>}

            <button
              onClick={handleVerifyOtp}
              disabled={otp.join("").length !== 6}
              style={btnStyle(otp.join("").length === 6)}
            >
              Verify & Continue →
            </button>

            <div style={{ marginTop: 16, textAlign: "center" }}>
              {countdown > 0 ? (
                <p style={{ color: "#444", fontSize: 13 }}>Resend in {countdown}s</p>
              ) : (
                <button
                  onClick={handleResendOtp}
                  disabled={loading}
                  style={{
                    background: "transparent", border: "none",
                    color: "#888", fontSize: 13, cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  {loading ? "Sending..." : "Resend OTP"}
                </button>
              )}
            </div>

            <button
              onClick={() => { setStep("email"); setError(null); }}
              style={{
                marginTop: 12, width: "100%", background: "transparent",
                border: "none", color: "#444", fontSize: 13, cursor: "pointer",
              }}
            >
              ← Change email
            </button>
          </>
        )}

        {/* ─── STEP 3: Profile ───────────────────────────────────────────── */}
        {step === "profile" && (
          <>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>
              Set Password
            </h1>
            <p style={{ color: "#555", margin: "0 0 24px", fontSize: 14 }}>
              Step 3 of 3 — Confirm your role & set password
            </p>

            {/* ✅ Role shown again in step 3 — pre-selected from step 1 */}
            {rolePicker(role)}

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                style={inputStyle}
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
              />
              <input
                style={{
                  ...inputStyle,
                  border: `1px solid ${confirm && confirm !== password ? "#ef4444" : "#2a2a2a"}`,
                }}
                placeholder="Confirm password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                type="password"
                onKeyDown={(e) => e.key === "Enter" && handleComplete()}
              />
            </div>

            {password && (
              <div style={{ marginTop: 8, display: "flex", gap: 4 }}>
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1, height: 3, borderRadius: 2,
                      background: password.length >= i * 3
                        ? (password.length >= 10 ? "#22c55e" : password.length >= 6 ? "#f59e0b" : "#ef4444")
                        : "#2a2a2a",
                      transition: "background 0.2s",
                    }}
                  />
                ))}
              </div>
            )}

            {error && <p style={{ color: "#ef4444", fontSize: 13, marginTop: 10 }}>{error}</p>}

            <button
              onClick={handleComplete}
              disabled={loading || !password || !confirm}
              style={btnStyle(!!password && !!confirm && !loading)}
            >
              {loading ? "Creating account..." : "Create Account ✓"}
            </button>

            <button
              onClick={() => { setStep("otp"); setError(null); }}
              style={{
                marginTop: 12, width: "100%", background: "transparent",
                border: "none", color: "#444", fontSize: 13, cursor: "pointer",
              }}
            >
              ← Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}