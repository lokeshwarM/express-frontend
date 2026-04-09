"use client";

import { usePathname } from "next/navigation";
import { useCallContext } from "@/context/CallContext";

export default function IncomingCallPopup() {
  const { incomingCall, acceptCall, rejectCall } = useCallContext();
  const pathname = usePathname();

  // Don't show the popup while listener is already on the active call page
  if (!incomingCall || pathname === "/listener") return null;

  const isVoice = incomingCall.type === "VOICE";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div
        style={{
          background: "#1a1a1a",
          borderRadius: 24,
          padding: "40px 32px",
          textAlign: "center",
          width: 320,
          border: "1px solid #2a2a2a",
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: isVoice ? "#22c55e22" : "#3b82f622",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 32,
            margin: "0 auto 20px",
            animation: "ls-pulse 1.5s ease-in-out infinite",
          }}
        >
          {isVoice ? "🎙" : "🎥"}
        </div>

        <p
          style={{
            color: "#888",
            fontSize: 13,
            margin: "0 0 6px",
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          Incoming
        </p>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 700,
            margin: "0 0 6px",
            color: "#fff",
          }}
        >
          {isVoice ? "Voice" : "Video"} Call
        </h2>
        <p style={{ color: "#555", fontSize: 13, margin: "0 0 32px" }}>
          Session {incomingCall.id.slice(0, 8)}...
        </p>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={rejectCall}
            style={{
              flex: 1,
              padding: "14px",
              background: "#ef444422",
              color: "#ef4444",
              border: "1px solid #ef444444",
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ✕ Decline
          </button>
          <button
            onClick={acceptCall}
            style={{
              flex: 1,
              padding: "14px",
              background: "#22c55e",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ✓ Accept
          </button>
        </div>
      </div>

      <style>{`
        @keyframes ls-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
          50%       { box-shadow: 0 0 0 16px rgba(34,197,94,0); }
        }
      `}</style>
    </div>
  );
}

