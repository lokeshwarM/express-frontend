"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import AuthGuard from "@/components/AuthGuard";

const AVAILABLE_TAGS = [
  { key: "stress", label: "😰 Stress", desc: "Work or life stress" },
  { key: "anxiety", label: "😟 Anxiety", desc: "Anxious feelings" },
  { key: "relationships", label: "💑 Relationships", desc: "Love & family" },
  { key: "career", label: "💼 Career", desc: "Work & growth" },
  { key: "mental health", label: "🧠 Mental Health", desc: "Overall wellbeing" },
  { key: "motivation", label: "🔥 Motivation", desc: "Getting inspired" },
  { key: "loneliness", label: "🫂 Loneliness", desc: "Feeling alone" },
  { key: "grief", label: "💔 Grief", desc: "Loss & healing" },
  { key: "life advice", label: "🌟 Life Advice", desc: "General guidance" },
  { key: "mindfulness", label: "🧘 Mindfulness", desc: "Calm & peace" },
];

export default function UserTagsPage() {
  const router = useRouter();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getUserTags()
      .then(setSelectedTags)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= 5) return prev; // max 5
      return [...prev, tag];
    });
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.saveUserTags(selectedTags);
      setSaved(true);
      setTimeout(() => router.back(), 1200);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthGuard>
      <div style={{
        minHeight: "100vh", background: "#0f0f0f",
        color: "#fff", fontFamily: "'DM Sans', sans-serif", padding: "40px 24px",
      }}>
        <div style={{ maxWidth: 420, margin: "0 auto" }}>

          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
            <button onClick={() => router.back()} style={{
              background: "#1a1a1a", border: "1px solid #2a2a2a",
              color: "#fff", borderRadius: 8, padding: "6px 14px",
              cursor: "pointer", fontSize: 14,
            }}>← Back</button>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Your Interests</h1>
          </div>

          <p style={{ color: "#555", fontSize: 14, margin: "0 0 28px" }}>
            Select up to 5 topics. We will match you with listeners who specialize in these areas.
          </p>

          {loading ? (
            <p style={{ color: "#444" }}>Loading...</p>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
                {AVAILABLE_TAGS.map((tag) => {
                  const selected = selectedTags.includes(tag.key);
                  return (
                    <button
                      key={tag.key}
                      onClick={() => toggleTag(tag.key)}
                      style={{
                        padding: "14px 18px", borderRadius: 12, textAlign: "left",
                        background: selected ? "#22c55e18" : "#1a1a1a",
                        border: `1px solid ${selected ? "#22c55e" : "#2a2a2a"}`,
                        cursor: "pointer", display: "flex",
                        justifyContent: "space-between", alignItems: "center",
                        transition: "all 0.15s",
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 600, fontSize: 14, color: selected ? "#22c55e" : "#fff" }}>
                          {tag.label}
                        </span>
                        <p style={{ color: "#555", fontSize: 12, margin: "2px 0 0" }}>{tag.desc}</p>
                      </div>
                      {selected && <span style={{ color: "#22c55e", fontSize: 18 }}>✓</span>}
                    </button>
                  );
                })}
              </div>

              <div style={{
                background: "#1a1a1a", borderRadius: 10, padding: "10px 16px",
                marginBottom: 20, border: "1px solid #2a2a2a",
              }}>
                <p style={{ color: "#555", fontSize: 12, margin: 0 }}>
                  Selected: <span style={{ color: "#fff", fontWeight: 600 }}>
                    {selectedTags.length}/5
                  </span>
                  {selectedTags.length > 0 && (
                    <span style={{ color: "#444" }}> — {selectedTags.join(", ")}</span>
                  )}
                </p>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  width: "100%", padding: "14px",
                  background: saved ? "#22c55e" : saving ? "#1a1a1a" : "#fff",
                  color: saved ? "#fff" : saving ? "#555" : "#000",
                  border: "none", borderRadius: 12,
                  fontSize: 15, fontWeight: 700,
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saved ? "✅ Saved!" : saving ? "Saving..." : "Save Interests"}
              </button>
            </>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}