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
    </ListenerSocketContext.Provider>
  );
}