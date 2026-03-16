"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  email: string;
  role: string;
};

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [callType, setCallType] = useState("VOICE");
  const router = useRouter();

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const fetchBalance = async (userId: string) => {
    const res = await fetch(
      `http://localhost:8080/wallet/${userId}/balance`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await res.json();
    setBalance(data.data);
  };

  useEffect(() => {
    fetch("http://localhost:8080/users/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        const userData = data.data;
        setUser(userData);
        fetchBalance(userData.id);
      });
  }, []);

  const recharge = async () => {
    if (!user) return;

    const res = await fetch(
      `http://localhost:8080/wallet/${user.id}/recharge?amount=${amount}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await res.json();
    setBalance(data.data);
    setAmount("");
  };

  const startSession = async () => {
    const res = await fetch("http://localhost:8080/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        type: callType,
      }),
    });

    const data = await res.json();

    if (data.success) {
      setSessionId(data.data.id);
    }
  };

  const startCall = async () => {
  if (!sessionId) return;

  await fetch(`http://localhost:8080/sessions/${sessionId}/start`, {
      method: "POST",
      headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  router.push(`/call?sessionId=${sessionId}`);
  };

  const endCall = async () => {
    if (!sessionId || !user) return;

    await fetch(`http://localhost:8080/sessions/${sessionId}/end`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    await fetchBalance(user.id);

    setSessionId(null);
  };
  const logout = () => {
    localStorage.removeItem("token");
    router.push("/");
  };

  return (
    <div style={{ padding: "40px" }}>
      <h1>Dashboard</h1>
      <button onClick={logout}>Logout</button>

      {user && (
        <>
          <p>Email: {user.email}</p>
          <p>Role: {user.role}</p>
        </>
      )}

      {balance !== null && (
        <h2>Wallet Balance: ₹{balance}</h2>
      )}

      <br />

      <h3>Recharge Wallet</h3>

      <input
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <button onClick={recharge}>Recharge</button>

      <br /><br />

      <h3>Select Call Type</h3>

      <select
        value={callType}
        onChange={(e) => setCallType(e.target.value)}
      >
        <option value="VOICE">Voice Call</option>
        <option value="VIDEO">Video Call</option>
      </select>

      <br /><br />

      <h3>Session</h3>

      <button onClick={startSession}>
        Start Session
      </button>

      {sessionId && <p>Session Created: {sessionId}</p>}

      {sessionId && (
        <>
          <br /><br />
          <button onClick={startCall}>Start Call</button>
          <button onClick={endCall}>End Call</button>
        </>
      )}
    </div>
  );
}