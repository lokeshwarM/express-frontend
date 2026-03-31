"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import AuthGuard from "@/components/AuthGuard";

export default function UserProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email: string; publicDisplayId: string; role: string } | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    api.getMe().then(setUser).catch(() => router.push("/"));
  }, []);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All fields are required"); return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match"); return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters"); return;
    }
    setError(null); setSuccess(null); setLoading(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setSuccess("Password changed successfully!");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "#111", border: "1px solid #2a2a2a",
    borderRadius: 10, padding: "12px 16px", color: "#fff",
    fontSize: 15, outline: "none", boxSizing: "border-box",
  };

  return (
    <AuthGuard>
      <div style={{
        minHeight: "100vh", background: "#0f0f0f",
        color: "#fff", fontFamily: "'DM Sans', sans-serif", padding: "40px 24px",
      }}>
        <div style={{ maxWidth: 420, margin: "0 auto" }}>

          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
            <button onClick={() => router.back()} style={{
              background: "#1a1a1a", border: "1px solid #2a2a2a",
              color: "#fff", borderRadius: 8, padding: "6px 14px",
              cursor: "pointer", fontSize: 14,
            }}>← Back</button>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Profile</h1>
          </div>

          {/* Profile info */}
          <div style={{
            background: "#1a1a1a", borderRadius: 16,
            padding: "24px", marginBottom: 24, border: "1px solid #2a2a2a",
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "#3b82f622", border: "2px solid #3b82f644",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, marginBottom: 16,
            }}>👤</div>
            <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 18 }}>
              {user?.publicDisplayId || "—"}
            </p>
            <p style={{ margin: "0 0 8px", color: "#666", fontSize: 14 }}>
              {user?.email || "—"}
            </p>
            <span style={{
              display: "inline-block", padding: "3px 10px",
              background: "#3b82f622", color: "#3b82f6",
              borderRadius: 20, fontSize: 11, fontWeight: 600,
              textTransform: "uppercase", letterSpacing: 1,
            }}>User</span>
          </div>

          {/* Change password */}
          <div style={{
            background: "#1a1a1a", borderRadius: 16,
            padding: "24px", border: "1px solid #2a2a2a",
          }}>
            <p style={{ color: "#666", fontSize: 13, margin: "0 0 20px", textTransform: "uppercase", letterSpacing: 1 }}>
              Change Password
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input type="password" placeholder="Current password"
                value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                style={inputStyle} />
              <input type="password" placeholder="New password"
                value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                style={inputStyle} />
              <input type="password" placeholder="Confirm new password"
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                style={{
                  ...inputStyle,
                  border: `1px solid ${confirmPassword && confirmPassword !== newPassword ? "#ef4444" : "#2a2a2a"}`,
                }}
                onKeyDown={(e) => e.key === "Enter" && handleChangePassword()} />
            </div>

            {error && <p style={{ color: "#ef4444", fontSize: 13, marginTop: 10 }}>{error}</p>}
            {success && <p style={{ color: "#22c55e", fontSize: 13, marginTop: 10 }}>{success}</p>}

            <button onClick={handleChangePassword}
              disabled={loading || !currentPassword || !newPassword || !confirmPassword}
              style={{
                width: "100%", marginTop: 16, padding: "14px",
                background: currentPassword && newPassword && confirmPassword && !loading ? "#fff" : "#111",
                color: currentPassword && newPassword && confirmPassword && !loading ? "#000" : "#555",
                border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700,
                cursor: currentPassword && newPassword && confirmPassword && !loading ? "pointer" : "not-allowed",
              }}>
              {loading ? "Changing..." : "Change Password"}
            </button>

            <button
              onClick={() => router.push("/user-tags")}
              style={{
                width: "100%", marginTop: 16, padding: "14px",
                background: "#1a1a1a", border: "1px solid #2a2a2a",
                borderRadius: 12, color: "#fff", fontSize: 15,
                fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}
            >
              <span>🏷️ Manage Interests</span>
              <span style={{ color: "#555" }}>→</span>
            </button>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}