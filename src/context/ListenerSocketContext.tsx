"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { useRouter, usePathname } from "next/navigation";
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

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "="
    );
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function ListenerSocketProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const stompRef = useRef<Client | null>(null);
  const userIdRef = useRef<string | null>(null);
  const isConnectingRef = useRef(false);

  const connect = useCallback((userId: string) => {
    if (stompRef.current?.connected) return;
    if (isConnectingRef.current) return;
    isConnectingRef.current = true;

    // Tear down any stale client first
    if (stompRef.current) {
      try { stompRef.current.deactivate(); } catch { /* ignore */ }
      stompRef.current = null;
    }

    const WS_BASE =
      typeof window !== "undefined" && window.location.protocol === "https:"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

    const client = new Client({
      webSocketFactory: () => new SockJS(`${WS_BASE}/ws`),
      reconnectDelay: 5000,
      onConnect: () => {
        isConnectingRef.current = false;
        client.subscribe(`/topic/listener/${userId}`, (msg) => {
          try {
            const data = JSON.parse(msg.body) as Record<string, unknown>;
            const type = String(data.type ?? "").toLowerCase();
            const sessionId = String(data.sessionId ?? data.id ?? "");
            const callType = String(data.callType ?? data.sessionType ?? "VOICE");
            if (
              (type === "incoming_call" || type === "incoming-call" || type === "call_created") &&
              sessionId
            ) {
              setIncomingCall({ sessionId, callType });
            }
          } catch { /* ignore malformed */ }
        });
      },
      onDisconnect: () => { isConnectingRef.current = false; },
      onStompError: () => { isConnectingRef.current = false; },
    });

    client.activate();
    stompRef.current = client;
  }, []);

  // ─── KEY FIX ───────────────────────────────────────────────────────────────
  // The root layout mounts on the login page (no token yet).
  // useEffect([], []) fires once — finds no token — returns early — socket never
  // connects. After login, Next.js navigates without remounting the layout, so
  // the effect never re-fires.
  //
  // Fix: depend on `pathname`. Every navigation (including / → /listener-dashboard
  // right after login) re-runs this effect with a fresh localStorage check.
  // Once connected, the guards at the top make it a no-op on further navigations.
  // ───────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Already alive — nothing to do
    if (stompRef.current?.connected || isConnectingRef.current) return;

    // userId already resolved — just reconnect
    if (userIdRef.current) {
      connect(userIdRef.current);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    const payload = decodeJwtPayload(token);
    if (String(payload?.role ?? "").toUpperCase() !== "LISTENER") return;

    // Use the Vercel /api proxy on HTTPS, direct URL in local dev
    const BASE =
      typeof window !== "undefined" && window.location.protocol === "https:"
        ? "/api"
        : process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

    fetch(`${BASE}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((body) => {
        const userId: string = body?.data?.id;
        if (!userId) return;
        userIdRef.current = userId;
        connect(userId);
      })
      .catch(() => {});
  }, [pathname, connect]); // re-run on every route change

  // Deactivate only when the provider truly unmounts (full logout / page close)
  useEffect(() => {
    return () => {
      stompRef.current?.deactivate();
      stompRef.current = null;
      isConnectingRef.current = false;
    };
  }, []);

  // Re-establish if the tab regains focus (covers returning from /listener page)
  useEffect(() => {
    const onFocus = () => {
      if (!stompRef.current?.connected && !isConnectingRef.current && userIdRef.current) {
        connect(userIdRef.current);
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [connect]);

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
    <ListenerSocketContext.Provider value={{ incomingCall, acceptCall, rejectCall }}>
      {children}

      {/* ── Global incoming-call overlay ── visible on every listener page ── */}
      {incomingCall && pathname !== "/listener" && (
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
                  incomingCall.callType === "VOICE" ? "#22c55e22" : "#3b82f622",
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

            <p style={{ color: "#888", fontSize: 13, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: 1 }}>
              Incoming
            </p>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 6px", color: "#fff" }}>
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

          <style>{`
            @keyframes ls-pulse {
              0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
              50%       { box-shadow: 0 0 0 16px rgba(34,197,94,0); }
            }
          `}</style>
        </div>
      )}
    </ListenerSocketContext.Provider>
  );
}