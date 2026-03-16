"use client";

import { useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function CallPage() {
  const params = useSearchParams();
  const router = useRouter();

  const sessionId = params.get("sessionId");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const startMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        console.log("Media stream started", stream);

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;

          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
          };
        }

      } catch (err) {
        console.error("getUserMedia failed:", err);
        alert("Camera or microphone permission failed.");
      }
    };

    startMedia();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };

  }, []);

  const endCall = async () => {
    const token = localStorage.getItem("token");

    try {
      await fetch(`http://localhost:8080/sessions/${sessionId}/end`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (err) {
      console.error("Failed to end session", err);
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    router.push("/dashboard");
  };

  return (
    <div style={{ padding: "40px" }}>
      <h1>Call Session</h1>

      <p>Session ID: {sessionId}</p>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: "500px",
          background: "black",
          border: "2px solid black",
        }}
      />

      <p>Camera and microphone active</p>

      <br />

      <button onClick={endCall}>End Call</button>
    </div>
  );
}