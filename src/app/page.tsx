"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const router = useRouter();

  const handleLogin = async () => {
  const res = await fetch("http://localhost:8080/auth/login", {
    method: "POST",
    headers: {
     "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (data.success) {
    localStorage.setItem("token", data.data.token);
    router.push("/dashboard");
  }

  setResult(data);
  };

  return (
    <div style={{ padding: "40px" }}>
      <h1>TEST PAGE</h1>

      <input
        placeholder="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <br /><br />

      <input
        type="password"
        placeholder="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <br /><br />
      <p>Do not have account? <a href="/signup">Signup</a></p>
      <button onClick={handleLogin}>Login</button>
      

      <pre>{JSON.stringify(result, null, 2)}</pre>
    </div>
  );
}