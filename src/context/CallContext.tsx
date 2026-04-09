"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useListenerSocket } from "@/context/ListenerSocketContext";

export interface Session {
  id: string;
  status: string;
  type?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

interface CallContextValue {
  incomingCall: Session | null;
  setIncomingCall: (session: Session | null) => void;
  acceptCall: () => void;
  rejectCall: () => void;
}

const CallContext = createContext<CallContextValue>({
  incomingCall: null,
  // In this project, call lifecycle is driven by WebSocket events.
  // setIncomingCall is primarily useful for clearing the popup.
  setIncomingCall: () => {},
  acceptCall: () => {},
  rejectCall: () => {},
});

export function useCallContext(): CallContextValue {
  return useContext(CallContext);
}

export function CallProvider({ children }: { children: ReactNode }) {
  const { incomingCall, acceptCall, rejectCall } = useListenerSocket();

  const value = useMemo<CallContextValue>(
    () => ({
      incomingCall: incomingCall
        ? {
            id: incomingCall.sessionId,
            status: "CREATED",
            type: incomingCall.callType,
          }
        : null,
      // For now, this simply clears any visible call from UI without
      // touching the underlying signaling – safe no-op for non-null.
      setIncomingCall: () => {
        /* no-op; WebSocket drives state */
      },
      acceptCall,
      rejectCall,
    }),
    [incomingCall, acceptCall, rejectCall]
  );

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

