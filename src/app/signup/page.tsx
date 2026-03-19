"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("USER");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const handleSignup = async () => {
    const res = await fetch("http://localhost:8080/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        role,
      }),
    });

    const data = await res.json();
    setResult(data);

    if (data.success) {
      alert("Signup successful! Now login.");
      router.push("/");
    }
  };

  return (
    <div style={{ padding: "40px" }}>
      <h1>Signup</h1>

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

      <label>Select Role:</label>
      <br />

      <select value={role} onChange={(e) => setRole(e.target.value)}>
        <option value="USER">User</option>
        <option value="LISTENER">Listener</option>
      </select>

      <br /><br />

      <button onClick={handleSignup}>Signup</button>

      <br /><br />

      {result && (
        <pre>{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
}