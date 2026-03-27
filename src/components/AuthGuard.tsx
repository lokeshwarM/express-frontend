"use client";

import { useEffect, useState } from "react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem("token");

    if (!token) {
      window.location.replace("/");
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.exp * 1000 < Date.now()) {
        localStorage.removeItem("token");
        window.location.replace("/");
        return;
      }
    } catch {
      localStorage.removeItem("token");
      window.location.replace("/");
      return;
    }

    setChecked(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!mounted || !checked) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#0f0f0f",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#444",
        fontFamily: "sans-serif",
        fontSize: 14,
      }}>
        Loading...
      </div>
    );
  }

  return <>{children}</>;
}