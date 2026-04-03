"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";

type IncomingCall = { sessionId: string; callType: string };

interface ListenerSocketContextValue {
  incomingCall: IncomingCall | null;
  acceptCall: () => void;
  rejectCall: () => void;
}

const ListenerSocketContext = createContext<ListenerSocketContextValue>({
  incomingCall: null,
  acceptCall: () => {},
  rejectCall: () => {},
});

export function useListenerSocket() {
  return useContext(ListenerSocketContext);
}

export function ListenerSocketProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const stompRef = useRef<Client | null>(null);
  const userIdRef = useRef<string | null>(null);

  // Connect (or reconnect) once we know the userId
  const connect = useCallback((userId: string) => {
    if (stompRef.current?.connected) return; // already connected

    const WS_BASE =
      typeof window !== "undefined" && window.location.protocol === "https:"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

    const client = new Client({
      webSocketFactory: () => new SockJS(`${WS_BASE}/ws`),
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe(`/topic/listener/${userId}`, (msg) => {
          const data = JSON.parse(msg.body);
          if (data.type === "incoming_call") {
            setIncomingCall({
              sessionId: data.sessionId,
              callType: data.callType,
            });
          }
        });
      },
    });

    client.activate();
    stompRef.current = client;
  }, []);

  // Resolve userId from JWT token on mount (works on every page)
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      // Decode JWT payload (no library needed — just base64)
      const payload = JSON.parse(atob(token.split(".")[1]));
      const role: string = payload.role || "";

      // Only connect for listeners
      if (role !== "LISTENER") return;

      // Fetch the real user ID from the /users/me endpoint
      fetch("/api/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((body) => {
          const userId: string = body?.data?.id;
          if (!userId) return;
          userIdRef.current = userId;
          connect(userId);
        })
        .catch(() => {/* silent — not a listener or not logged in */});
    } catch {
      // Invalid token — ignore
    }

    return () => {
      stompRef.current?.deactivate();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const acceptCall = useCallback(() => {
    if (!incomingCall) return;
    const { sessionId, callType } = incomingCall;
    setIncomingCall(null);
    router.push(`/listener?sessionId=${sessionId}&type=${callType}`);
  }, [incomingCall, router]);

  const rejectCall = useCallback(() => {
    if (!incomingCall) return;
    stompRef.current?.publish({
      destination: "/app/signal",
      body: JSON.stringify({ type: "reject", sessionId: incomingCall.sessionId }),
    });
    // Re-mark listener as available via API
    const token = localStorage.getItem("token");
    if (token) {
      fetch("/api/listeners/me/availability?available=true", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    setIncomingCall(null);
  }, [incomingCall]);

  return (
    <ListenerSocketContext.Provider
      value={{ incomingCall, acceptCall, rejectCall }}
    >
      {children}

      {/* Global incoming call overlay — visible on ANY page */}
      {incomingCall && (
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
                background:
                  incomingCall.callType === "VOICE"
                    ? "#22c55e22"
                    : "#3b82f622",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 32,
                margin: "0 auto 20px",
                animation: "ls-pulse 1.5s ease-in-out infinite",
              }}
            >
              {incomingCall.callType === "VOICE" ? "🎙" : "🎥"}
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
              style={{ fontSize: 22, fontWeight: 700, margin: "0 0 6px", color: "#fff" }}
            >
              {incomingCall.callType === "VOICE" ? "Voice" : "Video"} Call
            </h2>
            <p style={{ color: "#555", fontSize: 13, margin: "0 0 32px" }}>
              Session {incomingCall.sessionId.slice(0, 8)}...
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
        </div>
      )}

      <style>{`
        @keyframes ls-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
          50%       { box-shadow: 0 0 0 16px rgba(34,197,94,0); }
        }
      `}</style>
    </ListenerSocketContext.Provider>
  );
}