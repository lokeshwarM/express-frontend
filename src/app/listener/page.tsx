"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { api } from "@/services/api";

type SignalMessage = {
  type: "offer" | "answer" | "candidate" | "end" | "reject" | "ready" | "user_waiting";
  sessionId: string;
  payload?: RTCSessionDescriptionInit | RTCIceCandidateInit;
};

export default function ListenerPage() {
  const params = useSearchParams();
  const router = useRouter();
  const sessionId = params.get("sessionId") as string;

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const stompRef = useRef<Client | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startedRef = useRef(false);
  const endedRef = useRef(false);
  const readySentRef = useRef(false);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (connected) {
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [connected]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const toggleMute = () => {
    const stream = streamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    setMuted((m) => !m);
  };

  const toggleCamera = () => {
    const stream = streamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
    setCameraOff((c) => !c);
  };

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
    pcRef.current = null;
    stompRef.current?.deactivate();
    stompRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  };

  const handleRemoteEnd = () => {
    if (endedRef.current) return;
    endedRef.current = true;
    cleanup();
    api.endSession(sessionId).catch(console.error);
    setTimeout(() => router.push("/listener-dashboard"), 1000);
  };

  const sendReady = (client: Client) => {
    if (readySentRef.current) return;
    readySentRef.current = true;
    client.publish({
      destination: "/app/signal",
      body: JSON.stringify({ type: "ready", sessionId }),
    });
  };

  const connectWebSocket = () => {
    const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";
    const socket = new SockJS(`${BASE}/ws`);

    const client = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe("/topic/signal", async (msg) => {
          const data: SignalMessage = JSON.parse(msg.body);
          if (data.sessionId !== sessionId) return;

          const pc = pcRef.current;
          if (!pc) return;

          if (data.type === "user_waiting") sendReady(client);

          if (data.type === "offer") {
            if (pc.signalingState !== "stable") return;
            await pc.setRemoteDescription(
              new RTCSessionDescription(data.payload as RTCSessionDescriptionInit)
            );
            for (const c of pendingCandidatesRef.current) {
              try { await pc.addIceCandidate(c); } catch {}
            }
            pendingCandidatesRef.current = [];

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            client.publish({
              destination: "/app/signal",
              body: JSON.stringify({ type: "answer", sessionId, payload: answer }),
            });
          }

          if (data.type === "candidate") {
            if (pc.remoteDescription) {
              try { await pc.addIceCandidate(data.payload as RTCIceCandidateInit); } catch {}
            } else {
              pendingCandidatesRef.current.push(data.payload as RTCIceCandidateInit);
            }
          }

          if (data.type === "end") handleRemoteEnd();
        });

        sendReady(client);
      },
    });

    client.activate();
    stompRef.current = client;
  };

  const startListener = async () => {
    if (startedRef.current) return;
    startedRef.current = true;

    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    streamRef.current = stream;

    if (localVideoRef.current) localVideoRef.current.srcObject = stream;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    pcRef.current = pc;

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setConnected(true);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && stompRef.current?.connected) {
        stompRef.current.publish({
          destination: "/app/signal",
          body: JSON.stringify({ type: "candidate", sessionId, payload: event.candidate }),
        });
      }
    };

    connectWebSocket();
  };

  useEffect(() => {
    startListener();
    return () => { cleanup(); };
  }, []);

  const handleEndCall = async () => {
    if (endedRef.current) return;
    endedRef.current = true;

    if (stompRef.current?.connected) {
      stompRef.current.publish({
        destination: "/app/signal",
        body: JSON.stringify({ type: "end", sessionId }),
      });
    }

    await api.endSession(sessionId);
    cleanup();
    router.push("/listener-dashboard");
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0a",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'DM Sans', sans-serif",
      padding: 24,
    }}>
      <div style={{ marginBottom: 20, textAlign: "center" }}>
        <div style={{
          fontSize: 36,
          fontWeight: 700,
          color: "#fff",
          letterSpacing: 2,
          fontVariantNumeric: "tabular-nums",
        }}>
          {formatTime(seconds)}
        </div>
        <div style={{ fontSize: 12, marginTop: 4, color: connected ? "#22c55e" : "#f59e0b" }}>
          {connected ? "● Connected" : "● Connecting..."}
        </div>
      </div>

      <div style={{ position: "relative", marginBottom: 24 }}>
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          style={{
            width: "min(480px, 90vw)",
            aspectRatio: "4/3",
            borderRadius: 16,
            background: "#1a1a1a",
            objectFit: "cover",
            display: "block",
          }}
        />
        <div style={{
          position: "absolute",
          bottom: 12,
          right: 12,
          width: 100,
          borderRadius: 10,
          overflow: "hidden",
          border: "2px solid #333",
          background: "#111",
        }}>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: "100%",
              aspectRatio: "4/3",
              objectFit: "cover",
              display: "block",
              opacity: cameraOff ? 0.2 : 1,
            }}
          />
          {cameraOff && (
            <div style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 20,
            }}>
              🚫
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <button
          onClick={toggleMute}
          style={{
            width: 52, height: 52, borderRadius: "50%", border: "none",
            cursor: "pointer", fontSize: 20,
            background: muted ? "#ef4444" : "#2a2a2a", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.2s",
          }}
        >
          {muted ? "🔇" : "🎙"}
        </button>

        <button
          onClick={handleEndCall}
          style={{
            width: 64, height: 64, borderRadius: "50%", border: "none",
            cursor: "pointer", fontSize: 24,
            background: "#ef4444", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 0 4px #ef444433",
          }}
        >
          📵
        </button>

        <button
          onClick={toggleCamera}
          style={{
            width: 52, height: 52, borderRadius: "50%", border: "none",
            cursor: "pointer", fontSize: 20,
            background: cameraOff ? "#ef4444" : "#2a2a2a", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.2s",
          }}
        >
          {cameraOff ? "🚫" : "🎥"}
        </button>
      </div>

      <p style={{ color: "#333", fontSize: 11, marginTop: 16 }}>
        Session {sessionId?.slice(0, 8)}...
      </p>
    </div>
  );
}