const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

function authHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

export const api = {
  async getMe() {
    const res = await fetch(`${BASE}/users/me`, { headers: authHeaders() });
    const data = await res.json();
    if (!data.success) throw new Error("Unauthorized");
    return data.data as {
      id: string;
      email: string;
      role: string;
      publicDisplayId: string;
    };
  },

  async getBalance(): Promise<number> {
    const res = await fetch(`${BASE}/wallet/me/balance`, { headers: authHeaders() });
    const data = await res.json();
    return data.data as number;
  },

  async recharge(amount: number): Promise<number> {
    const res = await fetch(`${BASE}/wallet/me/recharge?amount=${amount}`, {
      method: "POST",
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Recharge failed");
    return data.data as number;
  },

  async initiateCall(type: "VOICE" | "VIDEO") {
    const res = await fetch(`${BASE}/sessions/call`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ type }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Failed to start call");
    return data.data as { id: string; listenerId: string; status: string; type: string };
  },

  async endSession(sessionId: string) {
    try {
      const res = await fetch(`${BASE}/sessions/${sessionId}/end`, {
        method: "POST",
        headers: authHeaders(),
      });
      return await res.json();
    } catch (e) {
      console.error("End session error:", e);
    }
  },

  async getMyAvailability(): Promise<boolean> {
    const res = await fetch(`${BASE}/listeners/me`, { headers: authHeaders() });
    const data = await res.json();
    return data.data as boolean;
  },

  async setAvailability(available: boolean) {
    const res = await fetch(
      `${BASE}/listeners/me/availability?available=${available}`,
      { method: "POST", headers: authHeaders() }
    );
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Failed");
    return data.data as string;
  },

  // ✅ Session history
  async getSessionHistory() {
    const res = await fetch(`${BASE}/sessions/my`, { headers: authHeaders() });
    const data = await res.json();
    return data.data as Array<{
      id: string;
      status: string;
      type: string;
      startedAt: string;
      endedAt: string;
    }>;
  },

  // ✅ Transaction history
  async getTransactions() {
    const res = await fetch(`${BASE}/wallet/me/transactions`, { headers: authHeaders() });
    const data = await res.json();
    return data.data as Array<{
      id: string;
      type: string;
      amount: number;
      createdAt: string;
    }>;
  },
};