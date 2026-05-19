"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import AuthGuard from "@/components/AuthGuard";

type Stats = { totalSessions: number; flagCount: number; rating: number; isBlacklisted: boolean };
type Review = { id: string; rating: number; comment: string; userDisplayId: string; sessionId: string; createdAt: string };
type Flag = { id: string; reason: string; sessionId: string; createdAt: string };
type Tab = "reviews" | "flags";

function StarRow({ rating }: { rating: number }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} style={{ fontSize: 14, color: rating >= s ? "#f59e0b" : "#2a2a2a" }}>★</span>
      ))}
    </div>
  );
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function ListenerReviewsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("reviews");
  const [stats, setStats] = useState<Stats | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getListenerStats(),
      api.getListenerReviews(),
      api.getListenerFlags(),
    ])
      .then(([s, r, f]) => {
        setStats(s);
        setReviews(r || []);
        setFlags(f || []);
      })
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthGuard>
      <div style={{
        minHeight: "100vh", background: "#0f0f0f",
        color: "#fff", fontFamily: "'DM Sans', sans-serif", padding: "40px 24px",
      }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <button onClick={() => router.back()} style={{
              background: "#1a1a1a", border: "1px solid #2a2a2a",
              color: "#fff", borderRadius: 8, padding: "6px 14px",
              cursor: "pointer", fontSize: 14,
            }}>← Back</button>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Reviews & Flags</h1>
          </div>

          {/* Rating summary */}
          {stats && (
            <div style={{
              background: "#1a1a1a", borderRadius: 16, padding: "20px 24px",
              marginBottom: 20, border: "1px solid #2a2a2a",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div>
                <p style={{ color: "#666", fontSize: 12, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 1 }}>
                  Overall Rating
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 32, fontWeight: 800 }}>{stats.rating.toFixed(1)}</span>
                  <div>
                    <div style={{ display: "flex", gap: 2 }}>
                      {[1,2,3,4,5].map((s) => (
                        <span key={s} style={{ fontSize: 16, color: stats.rating >= s ? "#f59e0b" : "#2a2a2a" }}>★</span>
                      ))}
                    </div>
                    <p style={{ color: "#444", fontSize: 11, margin: "2px 0 0" }}>
                      {reviews.length} review{reviews.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ color: "#666", fontSize: 12, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 1 }}>
                  Flags
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                  <span style={{ fontSize: 20 }}>🚩</span>
                  <span style={{
                    fontSize: 28, fontWeight: 800,
                    color: stats.flagCount > 0 ? "#ef4444" : "#22c55e",
                  }}>{stats.flagCount}</span>
                </div>
                {stats.isBlacklisted && (
                  <p style={{ color: "#ef4444", fontSize: 11, margin: "4px 0 0" }}>⛔ Blacklisted</p>
                )}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div style={{
            display: "flex", background: "#1a1a1a",
            borderRadius: 10, padding: 4, marginBottom: 20,
            border: "1px solid #2a2a2a",
          }}>
            {(["reviews", "flags"] as Tab[]).map((t) => (
              <button key={t} onClick={() => setTab(t)} style={{
                flex: 1, padding: "10px", borderRadius: 8, border: "none",
                cursor: "pointer", fontWeight: 600, fontSize: 13,
                background: tab === t ? "#fff" : "transparent",
                color: tab === t ? "#000" : "#555",
                transition: "all 0.15s",
              }}>
                {t === "reviews" ? `⭐ Reviews (${reviews.length})` : `🚩 Flags (${flags.length})`}
              </button>
            ))}
          </div>

          {loading ? (
            <p style={{ color: "#555", textAlign: "center", marginTop: 40 }}>Loading...</p>
          ) : (
            <>
              {/* REVIEWS TAB */}
              {tab === "reviews" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {reviews.length === 0 ? (
                    <div style={{
                      background: "#1a1a1a", borderRadius: 12,
                      padding: "40px 24px", textAlign: "center", border: "1px solid #2a2a2a",
                    }}>
                      <p style={{ color: "#555", margin: 0 }}>No reviews yet</p>
                      <p style={{ color: "#333", fontSize: 12, margin: "8px 0 0" }}>
                        Reviews appear after sessions are completed
                      </p>
                    </div>
                  ) : reviews.map((r) => (
                    <div key={r.id} style={{
                      background: "#1a1a1a", borderRadius: 12,
                      padding: "16px 20px", border: "1px solid #2a2a2a",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div>
                          <StarRow rating={r.rating} />
                          <p style={{ color: "#444", fontSize: 11, margin: "4px 0 0" }}>
                            by {r.userDisplayId}
                          </p>
                        </div>
                        <p style={{ color: "#444", fontSize: 11, margin: 0 }}>
                          {formatDate(r.createdAt)}
                        </p>
                      </div>
                      {r.comment && (
                        <p style={{ color: "#bbb", fontSize: 13, margin: "8px 0 0", lineHeight: 1.5 }}>
                          {r.comment}
                        </p>
                      )}
                      <p style={{ color: "#333", fontSize: 11, margin: "8px 0 0" }}>
                        Session: {r.sessionId.slice(0, 8)}...
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* FLAGS TAB */}
              {tab === "flags" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {flags.length === 0 ? (
                    <div style={{
                      background: "#1a1a1a", borderRadius: 12,
                      padding: "40px 24px", textAlign: "center", border: "1px solid #2a2a2a",
                    }}>
                      <p style={{ color: "#22c55e", margin: 0, fontWeight: 600 }}>✅ No flags</p>
                      <p style={{ color: "#333", fontSize: 12, margin: "8px 0 0" }}>
                        Keep up the good work!
                      </p>
                    </div>
                  ) : flags.map((f) => (
                    <div key={f.id} style={{
                      background: "#ef444410", borderRadius: 12,
                      padding: "16px 20px", border: "1px solid #ef444430",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 16 }}>🚩</span>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: "#ef4444" }}>
                            {f.reason}
                          </p>
                        </div>
                      </div>
                      <p style={{ color: "#666", fontSize: 12, margin: "4px 0 2px" }}>
                        📅 {formatDate(f.createdAt)}
                      </p>
                      <p style={{ color: "#444", fontSize: 11, margin: 0 }}>
                        Session: {f.sessionId.slice(0, 8)}...
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}