"use client";

import { useEffect, useRef, useState } from "react";
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

const FLAG_REASONS = [
  "Inappropriate language",
  "Harassment or abuse",
  "Shared personal information",
  "Unprofessional behavior",
  "Fake or misleading identity",
  "Other",
];

export default function CallPage() {
  const params = useSearchParams();
  const router = useRouter();
  const sessionId = params.get("sessionId") as string;
  const sessionType = (params.get("type") || "VOICE") as "VOICE" | "VIDEO";
  const isVoice = sessionType === "VOICE";

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null); //  Audio element for voice calls
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const stompRef = useRef<Client | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startedRef = useRef(false);
  const endedRef = useRef(false);
  const connectedRef = useRef(false); //  Track if markConnected was already called
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(isVoice);
  const [seconds, setSeconds] = useState(0);
  const [connected, setConnected] = useState(false);
  const [ending, setEnding] = useState(false);
  const [volume, setVolume] = useState(1);

  const [showFlagModal, setShowFlagModal] = useState(false);
  const [flagReason, setFlagReason] = useState("");
  const [flagging, setFlagging] = useState(false);
  const [flagDone, setFlagDone] = useState(false);

  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [endedSessionId, setEndedSessionId] = useState<string | null>(null);

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
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
  };

  //  Called when WebRTC actually connects — tells backend billing clock starts NOW
  const handleActuallyConnected = (stream: MediaStream) => {
    if (connectedRef.current) return;
    connectedRef.current = true;
    setConnected(true);

    // Tell backend real connection time
    api.markSessionConnected(sessionId).catch(console.error);

    // For voice — attach stream to audio element
    if (isVoice && remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = stream;
      remoteAudioRef.current.play().catch(console.error);
    }
    // For video — attach to video element
    if (!isVoice && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream;
    }
  };

  const handleRemoteEnd = (rejected = false) => {
    if (endedRef.current) return;
    endedRef.current = true;
    cleanup();
    
    if (rejected) {
      setTimeout(() => router.push("/dashboard"), 800);
    } else {
      setEndedSessionId(sessionId);
      setShowRatingModal(true);
    }
  };

  const connectWebSocket = (pc: RTCPeerConnection) => {
    const WS_BASE = typeof window !== "undefined" && window.location.protocol === "https:"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080");

    const socket = new SockJS(`${WS_BASE}/ws`);
    const client = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      onConnect: async () => {
        client.subscribe("/topic/signal", async (msg) => {
          const data: SignalMessage = JSON.parse(msg.body);
          if (data.sessionId !== sessionId) return;
          const peer = pcRef.current;
          if (!peer) return;

          if (data.type === "ready") {
            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);
            client.publish({
              destination: "/app/signal",
              body: JSON.stringify({ type: "offer", sessionId, payload: offer }),
            });
          }

          if (data.type === "answer") {
            if (peer.signalingState !== "have-local-offer") return;
            await peer.setRemoteDescription(
              new RTCSessionDescription(data.payload as RTCSessionDescriptionInit)
            );
            for (const c of pendingCandidatesRef.current) {
              try { await peer.addIceCandidate(c); } catch {}
            }
            pendingCandidatesRef.current = [];
          }

          if (data.type === "candidate") {
            if (peer.remoteDescription) {
              try { await peer.addIceCandidate(data.payload as RTCIceCandidateInit); } catch {}
            } else {
              pendingCandidatesRef.current.push(data.payload as RTCIceCandidateInit);
            }
          }

          if (data.type === "end") handleRemoteEnd();
          if (data.type === "reject") { alert("Call rejected ❌"); handleRemoteEnd(true); }
        });

        client.subscribe(`/topic/session/${sessionId}`, (msg) => {
          const data = JSON.parse(msg.body);
          if (data.type === "session_ended") handleRemoteEnd();
        });

        client.publish({
          destination: "/app/signal",
          body: JSON.stringify({ type: "user_waiting", sessionId }),
        });
      },
    });
    client.activate();
    stompRef.current = client;
  };

  const startCall = async () => {
    if (startedRef.current) return;
    startedRef.current = true;

    //  Voice = audio only, Video = audio + video
    const constraints = isVoice
      ? { audio: true, video: false }
      : { audio: true, video: true };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    streamRef.current = stream;

    if (!isVoice && localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
      ],
    });
    pcRef.current = pc;

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    //  ontrack fires for BOTH audio and video streams
    pc.ontrack = (event) => {
      handleActuallyConnected(event.streams[0]);
    };

    //  Also detect connection via connectionState change — fallback for voice
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected" && !connectedRef.current) {
        // Get the remote stream from receivers
        const remoteStream = new MediaStream(
          pc.getReceivers().map((r) => r.track)
        );
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

    connectWebSocket(pc);
  };

  useEffect(() => {
    startCall();
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
      if (result && !result.success) {
        console.error("End session failed:", result.message);
      }
    } catch (e) {
      console.error("End session error:", e);
    } finally {
      cleanup();
      setEndedSessionId(sessionId);
      setEnding(false);
      setShowRatingModal(true);
    }
  };

  const handleSubmitFlag = async () => {
    if (!flagReason) return;
    setFlagging(true);
    try {
      await api.flagListener(sessionId, flagReason);
      setFlagDone(true);
      setTimeout(() => { setShowFlagModal(false); setFlagDone(false); setFlagReason(""); }, 2000);
    } catch (e) {
      console.error("Flag error:", e);
    } finally {
      setFlagging(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!endedSessionId || rating === 0) return;
    setSubmittingReview(true);
    try {
      await api.submitReview(endedSessionId, rating, reviewComment);
      // analyze sentiment of the review comment
      if (reviewComment.trim()) {
        await api.analyzeSessionSentiment(endedSessionId, reviewComment).catch(() => {});
      }
    } catch (e) {
      console.error("Review error:", e);
    } finally {
      setSubmittingReview(false);
      router.push("/dashboard");
    }
  };

  return (
    <AuthGuard>
      {/*  Hidden audio element for voice calls */}
      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: "none" }} />

      <div style={{
        minHeight: "100vh", background: "#0a0a0a",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        fontFamily: "'DM Sans', sans-serif", padding: 24,
      }}>

        {/* Flag Modal */}
        {showFlagModal && (
          <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
          }}>
            <div style={{
              background: "#1a1a1a", borderRadius: 20, padding: "32px 28px",
              width: "min(380px, 90vw)", border: "1px solid #2a2a2a",
            }}>
              {flagDone ? (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                  <p style={{ color: "#22c55e", fontWeight: 700, fontSize: 18, margin: 0 }}>Report submitted</p>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>🚩 Report Listener</h3>
                    <button onClick={() => { setShowFlagModal(false); setFlagReason(""); }}
                      style={{ background: "none", border: "none", color: "#555", fontSize: 20, cursor: "pointer" }}>✕</button>
                  </div>
                  <p style={{ color: "#666", fontSize: 13, marginBottom: 16 }}>Select a reason:</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                    {FLAG_REASONS.map((reason) => (
                      <button key={reason} onClick={() => setFlagReason(reason)} style={{
                        padding: "12px 16px", borderRadius: 10, textAlign: "left",
                        background: flagReason === reason ? "#ef444420" : "#111",
                        border: `1px solid ${flagReason === reason ? "#ef4444" : "#2a2a2a"}`,
                        color: flagReason === reason ? "#ef4444" : "#888",
                        fontSize: 14, cursor: "pointer", fontWeight: flagReason === reason ? 600 : 400,
                      }}>{reason}</button>
                    ))}
                  </div>
                  <button onClick={handleSubmitFlag} disabled={!flagReason || flagging} style={{
                    width: "100%", padding: "14px",
                    background: flagReason && !flagging ? "#ef4444" : "#1a1a1a",
                    color: flagReason && !flagging ? "#fff" : "#555",
                    border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700,
                    cursor: flagReason && !flagging ? "pointer" : "not-allowed",
                  }}>
                    {flagging ? "Submitting..." : "Submit Report"}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Rating Modal */}
        {showRatingModal && (
          <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
          }}>
            <div style={{
              background: "#1a1a1a", borderRadius: 24, padding: "40px 32px",
              width: "min(380px, 90vw)", border: "1px solid #2a2a2a", textAlign: "center",
            }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎧</div>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>How was your session?</h2>
              <p style={{ color: "#555", fontSize: 14, margin: "0 0 28px" }}>Rate your experience with the listener</p>

              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 8 }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <span key={star}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    style={{
                      fontSize: 40, cursor: "pointer",
                      color: (hoverRating || rating) >= star ? "#f59e0b" : "#2a2a2a",
                      transition: "color 0.1s",
                    }}>★</span>
                ))}
              </div>

              {rating > 0 && (
                <p style={{ color: "#f59e0b", fontSize: 14, margin: "0 0 16px", fontWeight: 600 }}>
                  {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating]}
                </p>
              )}

              <textarea
                placeholder="Leave a comment (optional)"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={3}
                style={{
                  width: "100%", background: "#111", border: "1px solid #2a2a2a",
                  borderRadius: 10, padding: "12px 14px", color: "#fff",
                  fontSize: 14, outline: "none", resize: "none",
                  boxSizing: "border-box", marginBottom: 16,
                }}
              />

              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={() => router.push("/dashboard")} style={{
                  flex: 1, padding: "14px", background: "transparent", color: "#555",
                  border: "1px solid #2a2a2a", borderRadius: 12,
                  fontSize: 14, fontWeight: 600, cursor: "pointer",
                }}>Skip</button>
                <button onClick={handleSubmitReview} disabled={rating === 0 || submittingReview} style={{
                  flex: 2, padding: "14px",
                  background: rating > 0 && !submittingReview ? "#22c55e" : "#1a1a1a",
                  color: rating > 0 && !submittingReview ? "#fff" : "#555",
                  border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700,
                  cursor: rating > 0 && !submittingReview ? "pointer" : "not-allowed",
                }}>
                  {submittingReview ? "Submitting..." : "Submit Rating"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Timer */}
        <div style={{ marginBottom: 20, textAlign: "center" }}>
          <div style={{ fontSize: 14, color: "#555", marginBottom: 4 }}>
            {isVoice ? "🎙 Voice Call" : "🎥 Video Call"}
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

        {/* Video — only for VIDEO calls */}
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
          }} title={muted ? "Unmute" : "Mute"}>
            {muted ? "🔇" : "🎙"}
          </button>

          <button onClick={handleEndCall} disabled={ending} style={{
            width: 64, height: 64, borderRadius: "50%", border: "none",
            cursor: ending ? "not-allowed" : "pointer",
            fontSize: 24, background: ending ? "#7f1d1d" : "#ef4444",
            color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 0 4px #ef444433", opacity: ending ? 0.7 : 1,
          }} title="End call">📵</button>

          {!isVoice && (
            <button onClick={toggleCamera} style={{
              width: 52, height: 52, borderRadius: "50%", border: "none", cursor: "pointer",
              fontSize: 20, background: cameraOff ? "#ef4444" : "#2a2a2a", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s",
            }} title={cameraOff ? "Camera on" : "Camera off"}>
              {cameraOff ? "🚫" : "🎥"}
            </button>
          )}

          <button onClick={() => setShowFlagModal(true)} style={{
            width: 52, height: 52, borderRadius: "50%", border: "none", cursor: "pointer",
            fontSize: 20, background: flagDone ? "#ef444440" : "#2a2a2a", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
          }} title="Report listener">🚩</button>
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
          Session {sessionId?.slice(0, 8)}...
        </p>
      </div>
    </AuthGuard>
  );
}