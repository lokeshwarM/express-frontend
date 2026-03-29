"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import AuthGuard from "@/components/AuthGuard";

type Stats = { totalSessions: number; flagCount: number; rating: number; isBlacklisted: boolean };

function StarRating({ rating }: { rating: number }) {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} style={{
          fontSize: 20,
          color: "#f59e0b",
          opacity: rating >= star ? 1 : rating >= star - 0.5 ? 0.6 : 0.2,
        }}>★</span>
      ))}
      <span style={{ fontSize: 16, color: "#888", marginLeft: 4, fontWeight: 700 }}>
        {rating.toFixed(1)} / 5.0
      </span>
    </div>
  );
}

export default function ListenerReviewsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getListenerStats()
      .then(setStats)
      .catch(() => router.push("/"))
      .finally(() => setLoading(false));
  }, []);

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
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Reviews & Flags</h1>
          </div>

          {loading ? (
            <p style={{ color: "#555", textAlign: "center", marginTop: 40 }}>Loading...</p>
          ) : (
            <>
              {/* Rating card */}
              <div style={{
                background: "#1a1a1a", borderRadius: 16,
                padding: "24px", marginBottom: 16, border: "1px solid #2a2a2a",
                textAlign: "center",
              }}>
                <p style={{ color: "#666", fontSize: 13, margin: "0 0 16px", textTransform: "uppercase", letterSpacing: 1 }}>
                  Your Rating
                </p>
                <div style={{ fontSize: 56, fontWeight: 800, color: "#fff", marginBottom: 8 }}>
                  {stats?.rating.toFixed(1)}
                </div>
                {stats && <StarRating rating={stats.rating} />}
                <p style={{ color: "#444", fontSize: 13, marginTop: 12 }}>
                  Based on {stats?.totalSessions || 0} completed sessions
                </p>
              </div>

              {/* Flag count card */}
              <div style={{
                background: stats && stats.flagCount > 0 ? "#ef444410" : "#22c55e10",
                borderRadius: 16, padding: "24px", marginBottom: 16,
                border: `1px solid ${stats && stats.flagCount > 0 ? "#ef444430" : "#22c55e30"}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ color: "#666", fontSize: 13, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 1 }}>
                      Flag Count
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 24 }}>🚩</span>
                      <span style={{
                        fontSize: 32, fontWeight: 800,
                        color: stats && stats.flagCount > 0 ? "#ef4444" : "#22c55e",
                      }}>
                        {stats?.flagCount || 0}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{
                      margin: 0, fontSize: 12,
                      color: stats && stats.flagCount >= 3 ? "#ef4444" : "#666",
                    }}>
                      {stats && stats.flagCount >= 3
                        ? "⚠️ Account at risk"
                        : stats && stats.flagCount > 0
                        ? "Keep it clean!"
                        : "✅ No flags"}
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: 11, color: "#444" }}>
                      3 flags = blacklisted
                    </p>
                  </div>
                </div>

                {stats?.isBlacklisted && (
                  <div style={{
                    marginTop: 16, padding: "12px", background: "#ef444420",
                    borderRadius: 8, border: "1px solid #ef444440",
                  }}>
                    <p style={{ color: "#ef4444", fontSize: 13, margin: 0, fontWeight: 600 }}>
                      ⛔ Your account has been blacklisted due to multiple flags. Contact support.
                    </p>
                  </div>
                )}
              </div>

              {/* How rating works */}
              <div style={{
                background: "#1a1a1a", borderRadius: 16,
                padding: "20px 24px", border: "1px solid #2a2a2a",
              }}>
                <p style={{ color: "#666", fontSize: 13, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: 1 }}>
                  How ratings work
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { label: "Starting rating", value: "5.0 ★" },
                    { label: "Each flag reduces by", value: "−0.3 ★" },
                    { label: "Minimum rating", value: "1.0 ★" },
                    { label: "Blacklist threshold", value: "3 flags" },
                  ].map((item) => (
                    <div key={item.label} style={{
                      display: "flex", justifyContent: "space-between",
                      padding: "8px 0", borderBottom: "1px solid #2a2a2a",
                    }}>
                      <span style={{ color: "#666", fontSize: 13 }}>{item.label}</span>
                      <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}