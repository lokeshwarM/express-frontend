const BASE = typeof window !== "undefined" && window.location.protocol === "https:"
  ? "/api"
  : (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080");

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

  async sendSignupOtp(email: string) {
    const res = await fetch(`${BASE}/auth/send-signup-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Failed to send OTP");
  },

  async completeSignup(payload: {
    email: string;
    otp: string;
    password: string;
    role: string;
  }) {
    const res = await fetch(`${BASE}/auth/complete-signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Signup failed");
    return data.data as { userId: string; email: string; token: string; role: string };
  },

  async login(email: string, password: string) {
    const res = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Login failed");
    return data.data as { userId: string; email: string; token: string; role: string };
  },

  async verifyEmail(email: string, otp: string) {
    const res = await fetch(`${BASE}/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Invalid OTP");
    return data.data as { userId: string; email: string; token: string; role: string };
  },

  async resendOtp(email: string, type: "EMAIL_VERIFY" | "PASSWORD_RESET") {
    await fetch(`${BASE}/auth/resend-otp?email=${encodeURIComponent(email)}&type=${type}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  },

  async forgotPassword(email: string) {
    const res = await fetch(`${BASE}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Failed");
  },

  async resetPassword(email: string, otp: string, newPassword: string) {
    const res = await fetch(`${BASE}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp, newPassword }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Reset failed");
  },

  async googleAuth(credential: string, role: string) {
    const res = await fetch(`${BASE}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential, role }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Google auth failed");
    return data.data as { userId: string; email: string; token: string; role: string };
  },

  async getMe() {
    const res = await fetch(`${BASE}/users/me`, { headers: authHeaders() });
    const data = await res.json();
    if (!data.success) throw new Error("Unauthorized");
    return data.data as { id: string; email: string; role: string; publicDisplayId: string };
  },

  async getBalance(): Promise<number> {
    const res = await fetch(`${BASE}/wallet/me/balance`, { headers: authHeaders() });
    const data = await res.json();
    return data.data as number;
  },

  async createPaymentOrder(amount: number) {
    const res = await fetch(`${BASE}/payment/create-order`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ amount }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Failed to create order");
    return data.data as { orderId: string; amount: number; currency: string; keyId: string };
  },

  async verifyPayment(payload: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    amount: number;
  }): Promise<number> {
    const res = await fetch(`${BASE}/payment/verify`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Payment verification failed");
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

  async endSession(sessionId: string): Promise<{ success: boolean; message?: string } | null> {
    try {
      const res = await fetch(`${BASE}/sessions/${sessionId}/end`, {
        method: "POST",
        headers: authHeaders(),
      });
      return await res.json();
    } catch (e) {
      console.error("End session error:", e);
      return null;
    }
  },

  async getActiveSession(): Promise<{ id: string; type: string; status: string } | null> {
    try {
      const res = await fetch(`${BASE}/sessions/active`, { headers: authHeaders() });
      const data = await res.json();
      if (!data.success || !data.data) return null;
      return data.data as { id: string; type: string; status: string };
    } catch {
      return null;
    }
  },

  async getSession(sessionId: string) {
    const res = await fetch(`${BASE}/sessions/${sessionId}`, { headers: authHeaders() });
    const data = await res.json();
    return data.data as { id: string; status: string; type: string };
  },

  async getSessionHistory() {
    const res = await fetch(`${BASE}/sessions/my`, { headers: authHeaders() });
    const data = await res.json();
    return data.data as Array<{ id: string; status: string; type: string; startedAt: string; endedAt: string }>;
  },

  async getTransactions() {
    const res = await fetch(`${BASE}/wallet/me/transactions`, { headers: authHeaders() });
    const data = await res.json();
    return data.data as Array<{ id: string; type: string; amount: number; createdAt: string }>;
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

  // ✅ NEW: Listener withdrawal
  async withdraw(amount: number): Promise<number> {
    const res = await fetch(`${BASE}/wallet/me/withdraw`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ amount }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Withdrawal failed");
    return data.data as number;
  },

  async heartbeat(sessionId: string) {
    await fetch(`${BASE}/sessions/${sessionId}/heartbeat`, {
      method: "POST",
      headers: authHeaders(),
    });
  },
};