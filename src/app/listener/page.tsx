"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { api } from "@/services/api";
import AuthGuard from "@/components/AuthGuard";

type SignalMessage = {
  type: "offer" | "answer" | "candidate" | "end" | "reject" | "ready" | "user_waiting" | "session_ended";
  sessionId: string;
  payload?: RTCSessionDescriptionInit | RTCIceCandidateInit;
};

type AiSuggestion = {
  isCritical: boolean;
  suggestions: string[];
  detectedEmotion: string;
  urgencyLevel: string;
  alert: string;
};

export default function ListenerCallPage() {
  const params = useSearchParams();
  const router = useRouter();
  const sessionId = params.get("sessionId") as string;
  const sessionType = (params.get("type") || "VOICE") as "VOICE" | "VIDEO";
  const isVoice = sessionType === "VOICE";

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const stompRef = useRef<Client | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startedRef = useRef(false);
  const endedRef = useRef(false);
  const readySentRef = useRef(false);
  const connectedRef = useRef(false);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const aiTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptRef = useRef<string>("");

  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(isVoice);
  const [seconds, setSeconds] = useState(0);
  const [connected, setConnected] = useState(false);
  const [ending, setEnding] = useState(false);
  const [volume, setVolume] = useState(1);

  // ✅ Phase 3 AI state
  const [aiSuggestion, setAiSuggestion] = useState<AiSuggestion | null>(null);
  const [showAiPanel, setShowAiPanel] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [userMood, setUserMood] = useState("neutral");
  const [showCriticalAlert, setShowCriticalAlert] = useState(false);
  const [detectedEmotion, setDetectedEmotion] = useState<string | null>(null);

  useEffect(() => {
    if (connected) {
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [connected]);

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.volume = volume;
    if (remoteAudioRef.current) remoteAudioRef.current.volume = volume;
  }, [volume]);

  // ✅ Fetch user's mood for context
  useEffect(() => {
    api.getUserMood().then(setUserMood).catch(() => {});
  }, []);

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

  //  Start speech recognition to capture transcript
  const startTranscription = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          // Keep last 500 chars — sliding window
          transcriptRef.current = (transcriptRef.current + " " + transcript)
            .slice(-500);
        } else {
          interim = transcript;
        }
      }
    };

    recognition.onerror = () => {
      // Silently restart on error
      setTimeout(() => {
        if (!endedRef.current) recognition.start();
      }, 2000);
    };

    recognition.onend = () => {
      if (!endedRef.current) recognition.start();
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  //  AI suggestion fetch — called every 60 seconds
  const fetchAiSuggestions = useCallback(async () => {
    const transcript = transcriptRef.current.trim();
    if (!transcript || transcript.length < 20) return; // need enough text

    setAiLoading(true);
    try {
      const result = await api.getAiSuggestions(sessionId, transcript, userMood);
      if (!result) return;

      setAiSuggestion(result);
      setDetectedEmotion(result.detectedEmotion);

      // Critical alert
      if (result.isCritical || result.urgencyLevel === "critical") {
        setShowCriticalAlert(true);
      }
    } catch (e) {
      console.error("AI suggestion error:", e);
    } finally {
      setAiLoading(false);
    }
  }, [sessionId, userMood]);

  //  Start AI polling once connected
  useEffect(() => {
    if (connected) {
      startTranscription();
      // First suggestion after 30s, then every 60s
      const firstTimeout = setTimeout(() => {
        fetchAiSuggestions();
        aiTimerRef.current = setInterval(fetchAiSuggestions, 60000);
      }, 30000);

      return () => {
        clearTimeout(firstTimeout);
        if (aiTimerRef.current) clearInterval(aiTimerRef.current);
        recognitionRef.current?.stop();
      };
    }
  }, [connected, fetchAiSuggestions]);

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (aiTimerRef.current) clearInterval(aiTimerRef.current);
    recognitionRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
    pcRef.current = null;
    stompRef.current?.deactivate();
    stompRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
  };

  const handleActuallyConnected = (stream: MediaStream) => {
    if (connectedRef.current) return;
    connectedRef.current = true;
    setConnected(true);
    if (isVoice && remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = stream;
      remoteAudioRef.current.play().catch(console.error);
    }
    if (!isVoice && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream;
    }
  };

  const handleRemoteEnd = () => {
    if (endedRef.current) return;
    endedRef.current = true;
    cleanup();
    setTimeout(() => router.push("/listener-dashboard"), 800);
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
    const WS_BASE = typeof window !== "undefined" && window.location.protocol === "https:"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080");

    const socket = new SockJS(`${WS_BASE}/ws`);
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

        client.subscribe(`/topic/session/${sessionId}`, (msg) => {
          const data = JSON.parse(msg.body);
          if (data.type === "session_ended") handleRemoteEnd();
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
    const constraints = isVoice ? { audio: true, video: false } : { audio: true, video: true };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    streamRef.current = stream;
    if (!isVoice && localVideoRef.current) localVideoRef.current.srcObject = stream;

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });
    pcRef.current = pc;
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.ontrack = (event) => { handleActuallyConnected(event.streams[0]); };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected" && !connectedRef.current) {
        const remoteStream = new MediaStream(pc.getReceivers().map((r) => r.track));
        handleActuallyConnected(remoteStream);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEndCall = async () => {
    if (endedRef.current) return;
    endedRef.current = true;
    setEnding(true);
    if (stompRef.current?.connected) {
      stompRef.current.publish({
        destination: "/app/signal",
        body: JSON.stringify({ type: "end", sessionId }),
      });
    }
    try {
      const result = await api.endSession(sessionId);
      if (result && !result.success) console.error("End session failed:", result.message);
    } catch (e) {
      console.error("End session error:", e);
    } finally {
      cleanup();
      router.push("/listener-dashboard");
    }
  };

  const emotionColor = (emotion: string) => {
    const map: Record<string, string> = {
      stressed: "#f59e0b", anxious: "#f59e0b", sad: "#3b82f6",
      angry: "#ef4444", crisis: "#ef4444", neutral: "#555", positive: "#22c55e",
    };
    return map[emotion] || "#555";
  };

  return (
    <AuthGuard>
      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: "none" }} />

      {/* ✅ Critical State Alert — full screen overlay */}
      {showCriticalAlert && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(239,68,68,0.95)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 300, flexDirection: "column", padding: 32, textAlign: "center",
        }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#fff", margin: "0 0 12px" }}>
            User May Be in Distress
          </h2>
          <p style={{ color: "#fff", fontSize: 16, margin: "0 0 8px", opacity: 0.9 }}>
            The AI has detected possible signs of a crisis situation.
          </p>
          <p style={{ color: "#fff", fontSize: 14, margin: "0 0 32px", opacity: 0.7 }}>
            Please respond calmly, ask if they are safe, and encourage professional help if needed.
          </p>
          <div style={{ display: "flex", gap: 16 }}>
            <button
              onClick={() => setShowCriticalAlert(false)}
              style={{
                padding: "14px 28px", background: "#fff", color: "#ef4444",
                border: "none", borderRadius: 12, fontSize: 15,
                fontWeight: 700, cursor: "pointer",
              }}
            >
              I Understand
            </button>
          </div>
        </div>
      )}

      <div style={{
        minHeight: "100vh", background: "#0a0a0a",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        fontFamily: "'DM Sans', sans-serif", padding: 24,
        position: "relative",
      }}>

        {/* ✅ AI Assistant Panel — visible only to listener, top right */}
        {connected && showAiPanel && (
          <div style={{
            position: "fixed", top: 16, right: 16,
            width: 280, background: "#111",
            borderRadius: 16, border: "1px solid #2a2a2a",
            padding: "16px", zIndex: 100,
            boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
          }}>
            {/* Panel header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 14 }}>🤖</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>AI Co-pilot</span>
                {aiLoading && (
                  <span style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: "#f59e0b", display: "inline-block",
                    animation: "pulse 1s ease-in-out infinite",
                  }} />
                )}
              </div>
              <button
                onClick={() => setShowAiPanel(false)}
                style={{ background: "none", border: "none", color: "#444", fontSize: 16, cursor: "pointer" }}
              >✕</button>
            </div>

            {/* Detected emotion */}
            {detectedEmotion && (
              <div style={{
                background: "#1a1a1a", borderRadius: 8, padding: "6px 10px",
                marginBottom: 10, display: "flex", alignItems: "center", gap: 6,
              }}>
                <span style={{ fontSize: 11, color: "#555" }}>Detected:</span>
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  color: emotionColor(detectedEmotion),
                  textTransform: "capitalize",
                }}>{detectedEmotion}</span>
              </div>
            )}

            {/* Suggestions */}
            {aiSuggestion ? (
              <div>
                <p style={{ color: "#555", fontSize: 10, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 1 }}>
                  Suggested Responses
                </p>
                {aiSuggestion.suggestions.map((s, i) => (
                  <div key={i} style={{
                    background: "#1a1a1a", borderRadius: 8,
                    padding: "10px 12px", marginBottom: 8,
                    border: "1px solid #2a2a2a", cursor: "pointer",
                  }}
                    onClick={() => {
                      // Copy to clipboard for easy use
                      navigator.clipboard?.writeText(s).catch(() => {});
                    }}
                    title="Click to copy"
                  >
                    <p style={{ color: "#ccc", fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                      {s}
                    </p>
                  </div>
                ))}
                <p style={{ color: "#333", fontSize: 10, margin: "8px 0 0", textAlign: "center" }}>
                  Updates every 60s · Click suggestion to copy
                </p>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "12px 0" }}>
                <p style={{ color: "#333", fontSize: 12, margin: 0 }}>
                  {connected
                    ? "AI suggestions will appear after 30s..."
                    : "Waiting for connection..."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Re-show AI panel button if hidden */}
        {connected && !showAiPanel && (
          <button
            onClick={() => setShowAiPanel(true)}
            style={{
              position: "fixed", top: 16, right: 16,
              padding: "8px 12px", background: "#1a1a1a",
              border: "1px solid #2a2a2a", borderRadius: 10,
              color: "#fff", fontSize: 12, cursor: "pointer",
              zIndex: 100,
            }}
          >
            🤖 AI
          </button>
        )}

        {/* Timer */}
        <div style={{ marginBottom: 20, textAlign: "center" }}>
          <div style={{ fontSize: 14, color: "#555", marginBottom: 4 }}>
            {isVoice ? "🎙 Voice Call" : "🎥 Video Call"} · Listener
          </div>
          <div style={{
            fontSize: 36, fontWeight: 700, color: "#fff",
            letterSpacing: 2, fontVariantNumeric: "tabular-nums",
          }}>
            {formatTime(seconds)}
          </div>
          <div style={{ fontSize: 12, marginTop: 4, color: connected ? "#22c55e" : "#f59e0b" }}>
            {ending ? "● Ending call..." : connected ? "● Connected" : "● Connecting..."}
          </div>
        </div>

        {/* Video — only for VIDEO */}
        {!isVoice && (
          <div style={{ position: "relative", marginBottom: 24 }}>
            <video ref={remoteVideoRef} autoPlay playsInline style={{
              width: "min(480px, 90vw)", aspectRatio: "4/3",
              borderRadius: 16, background: "#1a1a1a", objectFit: "cover", display: "block",
            }} />
            <div style={{
              position: "absolute", bottom: 12, right: 12, width: 100,
              borderRadius: 10, overflow: "hidden", border: "2px solid #333", background: "#111",
            }}>
              <video ref={localVideoRef} autoPlay playsInline muted style={{
                width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block",
                opacity: cameraOff ? 0.2 : 1,
              }} />
              {cameraOff && (
                <div style={{
                  position: "absolute", inset: 0, display: "flex",
                  alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 20,
                }}>🚫</div>
              )}
            </div>
          </div>
        )}

        {/* Voice avatar */}
        {isVoice && (
          <div style={{
            width: 120, height: 120, borderRadius: "50%",
            background: connected ? "#22c55e22" : "#1a1a1a",
            border: `2px solid ${connected ? "#22c55e44" : "#2a2a2a"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 48, marginBottom: 32, transition: "all 0.5s",
            boxShadow: connected ? "0 0 30px #22c55e22" : "none",
          }}>🎙</div>
        )}

        {/* Controls */}
        <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 20 }}>
          <button onClick={toggleMute} style={{
            width: 52, height: 52, borderRadius: "50%", border: "none", cursor: "pointer",
            fontSize: 20, background: muted ? "#ef4444" : "#2a2a2a", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s",
          }}>{muted ? "🔇" : "🎙"}</button>

          <button onClick={handleEndCall} disabled={ending} style={{
            width: 64, height: 64, borderRadius: "50%", border: "none",
            cursor: ending ? "not-allowed" : "pointer",
            fontSize: 24, background: ending ? "#7f1d1d" : "#ef4444",
            color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 0 4px #ef444433", opacity: ending ? 0.7 : 1,
          }}>📵</button>

          {!isVoice && (
            <button onClick={toggleCamera} style={{
              width: 52, height: 52, borderRadius: "50%", border: "none", cursor: "pointer",
              fontSize: 20, background: cameraOff ? "#ef4444" : "#2a2a2a", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s",
            }}>{cameraOff ? "🚫" : "🎥"}</button>
          )}
        </div>

        {/* Volume slider */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "#1a1a1a", borderRadius: 20, padding: "8px 16px", border: "1px solid #2a2a2a",
        }}>
          <span style={{ fontSize: 16 }}>{volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}</span>
          <input type="range" min={0} max={1} step={0.05} value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            style={{ width: 100, accentColor: "#22c55e", cursor: "pointer" }} />
          <span style={{ fontSize: 12, color: "#555", minWidth: 30 }}>{Math.round(volume * 100)}%</span>
        </div>

        <p style={{ color: "#333", fontSize: 11, marginTop: 16 }}>
          Session {sessionId?.slice(0, 8)}... · Listener
        </p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </AuthGuard>
  );
}