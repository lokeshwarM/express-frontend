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
  // Prevents re-calling /users/me on every route change once we know user is NOT a listener
  const notListenerRef = useRef(false);

  const connect = useCallback((userId: string) => {
    if (stompRef.current?.connected) return;
    if (isConnectingRef.current) return;
    isConnectingRef.current = true;

    if (stompRef.current) {
      try { stompRef.current.deactivate(); } catch { /* ignore */ }
      stompRef.current = null;
    }

    const WS_BASE =
      typeof window !== "undefined" && window.location.protocol === "https:"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

    console.log("[ListenerSocket] connecting for userId:", userId, "via", WS_BASE);

    const client = new Client({
      webSocketFactory: () => new SockJS(`${WS_BASE}/ws`),
      reconnectDelay: 5000,
      onConnect: () => {
        isConnectingRef.current = false;
        console.log("[ListenerSocket] STOMP connected. Subscribing to /topic/listener/" + userId);
        client.subscribe(`/topic/listener/${userId}`, (msg) => {
          try {
            const data = JSON.parse(msg.body) as Record<string, unknown>;
            console.log("[ListenerSocket] message received:", data);
            const type = String(data.type ?? "").toLowerCase();
            const sessionId = String(data.sessionId ?? data.id ?? "");
            const callType = String(data.callType ?? data.sessionType ?? "VOICE");
            if (
              (type === "incoming_call" || type === "incoming-call" || type === "call_created") &&
              sessionId
            ) {
              console.log("[ListenerSocket] INCOMING CALL →", { sessionId, callType });
              setIncomingCall({ sessionId, callType });
            }
          } catch { /* ignore malformed messages */ }
        });
      },
      onDisconnect: () => {
        console.log("[ListenerSocket] disconnected");
        isConnectingRef.current = false;
      },
      onStompError: (frame) => {
        console.error("[ListenerSocket] STOMP error:", frame);
        isConnectingRef.current = false;
      },
    });

    client.activate();
    stompRef.current = client;
  }, []);

  // ─── KEY FIX ───────────────────────────────────────────────────────────────
  // The JWT token only stores the user's email (no role field — confirmed in
  // JwtService.java). Decoding the JWT for role always returned undefined,
  // causing an early return and the socket never connecting.
  //
  // Fix: call /users/me directly to get the real role + userId, exactly like
  // the rest of the app does (api.getMe()). This effect re-runs on every
  // route change so it connects right after login navigates from "/" to
  // "/listener-dashboard" without a page refresh.
  // ───────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (stompRef.current?.connected || isConnectingRef.current) return;
    if (notListenerRef.current) return; // already confirmed not a listener
    if (userIdRef.current) { connect(userIdRef.current); return; } // reconnect

    const token = localStorage.getItem("token");
    if (!token) return;

    const BASE =
      typeof window !== "undefined" && window.location.protocol === "https:"
        ? "/api"
        : process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

    console.log("[ListenerSocket] fetching /users/me to determine role...");

    fetch(`${BASE}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((body) => {
        const user = body?.data as { id: string; role: string } | undefined;
        if (!user?.id) return;
        if (String(user.role ?? "").toUpperCase() !== "LISTENER") {
          notListenerRef.current = true; // stop retrying for non-listeners
          console.log("[ListenerSocket] user role is", user.role, "— skipping socket");
          return;
        }
        userIdRef.current = user.id;
        connect(user.id);
      })
      .catch(() => {
        console.warn("[ListenerSocket] /users/me fetch failed — will retry on next navigation");
      });
  }, [pathname, connect]); // re-runs on every route change

  // Deactivate only on provider unmount (logout / page close)
  useEffect(() => {
    return () => {
      stompRef.current?.deactivate();
      stompRef.current = null;
      isConnectingRef.current = false;
    };
  }, []);

  // Re-establish when tab regains focus (covers returning from /listener call page)
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

      {/* Global incoming-call overlay — appears on every listener page except /listener */}
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
                background: incomingCall.callType === "VOICE" ? "#22c55e22" : "#3b82f622",
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
                  flex: 1, padding: "14px", background: "#ef444422",
                  color: "#ef4444", border: "1px solid #ef444444",
                  borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer",
                }}
              >
                ✕ Decline
              </button>
              <button
                onClick={acceptCall}
                style={{
                  flex: 1, padding: "14px", background: "#22c55e",
                  color: "#fff", border: "none",
                  borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer",
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