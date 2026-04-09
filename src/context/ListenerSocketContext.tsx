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

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function normalizeIncomingCallMessage(raw: unknown): IncomingCall | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;

  const eventType = String(data.type ?? data.eventType ?? "").toLowerCase();
  const status = String(data.status ?? (data.session as Record<string, unknown> | undefined)?.status ?? "").toUpperCase();

  const sessionIdValue =
    data.sessionId ??
    (data.session as Record<string, unknown> | undefined)?.id ??
    data.id;
  const sessionId = typeof sessionIdValue === "string" ? sessionIdValue : "";

  const callTypeValue =
    data.callType ??
    data.sessionType ??
    (data.session as Record<string, unknown> | undefined)?.type ??
    "VOICE";
  const callType = typeof callTypeValue === "string" ? callTypeValue : "VOICE";

  const isIncomingEvent =
    eventType === "incoming_call" ||
    eventType === "incoming-call" ||
    eventType === "incomingcall" ||
    eventType === "call_created" ||
    status === "CREATED";

  if (!isIncomingEvent || !sessionId) return null;

  return { sessionId, callType };
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
  const isConnectingRef = useRef(false);

  // Build and activate a fresh STOMP client for the given userId.
  // Always tears down any prior client before creating a new one.
  const connect = useCallback((userId: string) => {
    // Guard: don't open a second connection if one is already alive
    if (stompRef.current?.connected) return;
    if (isConnectingRef.current) return;
    isConnectingRef.current = true;

    // Tear down any stale / disconnected client
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
      // STOMP's built-in reconnect re-runs onConnect, which re-subscribes
      reconnectDelay: 5000,
      onConnect: () => {
        isConnectingRef.current = false;
        // Re-subscribe every time the socket connects/reconnects
        client.subscribe(`/topic/listener/${userId}`, (msg) => {
          try {
            const data = JSON.parse(msg.body) as unknown;
            const normalizedCall = normalizeIncomingCallMessage(data);
            if (normalizedCall) setIncomingCall(normalizedCall);
          } catch {
            // Ignore malformed messages
          }
        });
      },
      onDisconnect: () => { isConnectingRef.current = false; },
      onStompError: ()  => { isConnectingRef.current = false; },
    });

    client.activate();
    stompRef.current = client;
  }, []);

  // Called whenever we need to ensure the socket is alive (e.g. back from call page)
  const ensureConnected = useCallback(() => {
    const userId = userIdRef.current;
    if (!userId) return;
    if (!stompRef.current?.connected && !isConnectingRef.current) {
      connect(userId);
    }
  }, [connect]);

  // Resolve userId from JWT token on mount (works on every page)
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const payload = decodeJwtPayload(token);
    const role = String(payload?.role ?? "").toUpperCase();

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

    return () => {
      // Deactivate only when the provider genuinely unmounts (e.g. full logout)
      stompRef.current?.deactivate();
      stompRef.current = null;
      isConnectingRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-check socket health whenever the tab regains focus or visibility.
  // This covers the case where the listener navigates back from /listener
  // and the STOMP client has gone stale / been closed by the call page.
  useEffect(() => {
    const handleFocus = () => ensureConnected();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") ensureConnected();
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [ensureConnected]);

  const acceptCall = useCallback(() => {
    if (!incomingCall) return;
    const { sessionId, callType } = incomingCall;
    // Clear popup immediately so it doesn't flash on the call page
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
    </ListenerSocketContext.Provider>
  );
}