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
          try {
            const data = JSON.parse(msg.body) as unknown;
            const normalizedCall = normalizeIncomingCallMessage(data);
            if (normalizedCall) setIncomingCall(normalizedCall);
          } catch {
            // Ignore malformed messages
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
    </ListenerSocketContext.Provider>
  );
}