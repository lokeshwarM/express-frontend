const BASE = typeof window !== "undefined" && window.location.protocol === "https:"
  ? "/api"
  : (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080");

/** Avoids cryptic JSON.parse errors when the proxy returns HTML/plain 502 pages. */
async function jsonOrThrow(res: Response): Promise<any> {
  const text = await res.text();
  if (!text.trim()) {
    throw new Error(
      res.status >= 500
        ? "Server is unavailable (empty response). Check that your API is reachable from the internet."
        : `Request failed (${res.status})`
    );
  }
  try {
    return JSON.parse(text);
  } catch {
    const preview = text.replace(/\s+/g, " ").slice(0, 160);
    throw new Error(
      res.status >= 502
        ? `Cannot reach API (${res.status}). If the app uses Vercel rewrites, confirm EC2 security group allows inbound on your app port and the server URL in vercel.json is correct.`
        : `Invalid response (${res.status}): ${preview}`
    );
  }
}

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
    const data = await jsonOrThrow(res);
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
    const data = await jsonOrThrow(res);
    if (!data.success) throw new Error(data.message || "Signup failed");
    return data.data as { userId: string; email: string; token: string; role: string };
  },

  async login(email: string, password: string) {
    const res = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await jsonOrThrow(res);
    if (!data.success) throw new Error(data.message || "Login failed");
    return data.data as { userId: string; email: string; token: string; role: string };
  },

  async verifyEmail(email: string, otp: string) {
    const res = await fetch(`${BASE}/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });
    const data = await jsonOrThrow(res);
    if (!data.success) throw new Error(data.message || "Invalid OTP");
    return data.data as { userId: string; email: string; token: string; role: string };
  },

  async resendOtp(email: string, type: "EMAIL_VERIFY" | "PASSWORD_RESET") {
    const res = await fetch(`${BASE}/auth/resend-otp?email=${encodeURIComponent(email)}&type=${type}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    // #region agent log
    fetch("http://127.0.0.1:7668/ingest/15120f85-35bf-43be-a8e5-ea26ca7ff35f", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "5e2811" },
      body: JSON.stringify({
        sessionId: "5e2811",
        runId: "pre-verify",
        hypothesisId: "H1",
        location: "api.ts:resendOtp",
        message: "resend-otp fetch completed",
        data: {
          httpStatus: res.status,
          ok: res.ok,
          baseRoute: typeof window !== "undefined" && window.location.protocol === "https:" ? "vercel-/api-proxy" : "direct-backend",
          otpType: type,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    const data = await jsonOrThrow(res);
    if (!data.success) throw new Error(data.message || "Failed to resend OTP");
  },

  async forgotPassword(email: string) {
    const res = await fetch(`${BASE}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await jsonOrThrow(res);
    if (!data.success) throw new Error(data.message || "Failed");
  },

  async resetPassword(email: string, otp: string, newPassword: string) {
    const res = await fetch(`${BASE}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp, newPassword }),
    });
    const data = await jsonOrThrow(res);
    if (!data.success) throw new Error(data.message || "Reset failed");
  },

  async googleAuth(credential: string, role: string) {
    const res = await fetch(`${BASE}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential, role }),
    });
    const data = await jsonOrThrow(res);
    if (!data.success) throw new Error(data.message || "Google auth failed");
    return data.data as { userId: string; email: string; token: string; role: string };
  },

  async getMe() {
    const res = await fetch(`${BASE}/users/me`, { headers: authHeaders() });
    const data = await jsonOrThrow(res);
    if (!data.success) throw new Error("Unauthorized");
    return data.data as { id: string; email: string; role: string; publicDisplayId: string };
  },

  async getBalance(): Promise<number> {
    const res = await fetch(`${BASE}/wallet/me/balance`, { headers: authHeaders() });
    const data = await jsonOrThrow(res);
    return data.data as number;
  },

  async createPaymentOrder(amount: number) {
    const res = await fetch(`${BASE}/payment/create-order`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ amount }),
    });
    const data = await jsonOrThrow(res);
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
    const data = await jsonOrThrow(res);
    if (!data.success) throw new Error(data.message || "Payment verification failed");
    return data.data as number;
  },

  async initiateCall(type: "VOICE" | "VIDEO") {
    const res = await fetch(`${BASE}/sessions/call`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ type }),
    });
    const data = await jsonOrThrow(res);
    if (!data.success) throw new Error(data.message || "Failed to start call");
    return data.data as { id: string; listenerId: string; status: string; type: string };
  },

  async endSession(sessionId: string): Promise<{ success: boolean; message?: string } | null> {
    try {
      const res = await fetch(`${BASE}/sessions/${sessionId}/end`, {
        method: "POST",
        headers: authHeaders(),
      });
      return await jsonOrThrow(res);
    } catch (e) {
      console.error("End session error:", e);
      return null;
    }
  },

  async getActiveSession(): Promise<{ id: string; type: string; status: string } | null> {
    try {
      const res = await fetch(`${BASE}/sessions/active`, { headers: authHeaders() });
      const data = await jsonOrThrow(res);
      if (!data.success || !data.data) return null;
      return data.data as { id: string; type: string; status: string };
    } catch {
      return null;
    }
  },

  async getSession(sessionId: string) {
    const res = await fetch(`${BASE}/sessions/${sessionId}`, { headers: authHeaders() });
    const data = await jsonOrThrow(res);
    return data.data as { id: string; status: string; type: string };
  },

  async getSessionHistory() {
    const res = await fetch(`${BASE}/sessions/my`, { headers: authHeaders() });
    const data = await jsonOrThrow(res);
    return data.data as Array<{ id: string; status: string; type: string; startedAt: string; endedAt: string }>;
  },

  async getTransactions() {
    const res = await fetch(`${BASE}/wallet/me/transactions`, { headers: authHeaders() });
    const data = await jsonOrThrow(res);
    return data.data as Array<{ id: string; type: string; amount: number; createdAt: string }>;
  },

  async getMyAvailability(): Promise<boolean> {
    const res = await fetch(`${BASE}/listeners/me`, { headers: authHeaders() });
    const data = await jsonOrThrow(res);
    return data.data as boolean;
  },

  async setAvailability(available: boolean) {
    const res = await fetch(
      `${BASE}/listeners/me/availability?available=${available}`,
      { method: "POST", headers: authHeaders() }
    );
    const data = await jsonOrThrow(res);
    if (!data.success) throw new Error(data.message || "Failed");
    return data.data as string;
  },

  async heartbeat(sessionId: string) {
    await fetch(`${BASE}/sessions/${sessionId}/heartbeat`, {
      method: "POST",
      headers: authHeaders(),
    });
  },

//  Listener stats (rating, flags, total sessions)
  async getListenerStats(): Promise<{
    totalSessions: number;
    flagCount: number;
    rating: number;
    isBlacklisted: boolean;
  }> {
    const res = await fetch(`${BASE}/listeners/me/stats`, { headers: authHeaders() });
    const data = await jsonOrThrow(res);
    if (!data.success) throw new Error(data.message || "Failed");
    return data.data;
  },

  //  Listener's own sessions
  async getListenerSessions(): Promise<Array<{
    id: string; type: string; status: string; startedAt: string; endedAt: string;
  }>> {
    const res = await fetch(`${BASE}/listeners/me/sessions`, { headers: authHeaders() });
    const data = await jsonOrThrow(res);
    return data.data || [];
  },

  //  Change password
  async changePassword(currentPassword: string, newPassword: string) {
    const res = await fetch(`${BASE}/users/me/change-password`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await jsonOrThrow(res);
    if (!data.success) throw new Error(data.message || "Failed to change password");
  },

  //  Updated withdraw with payment details
  async withdraw(
    amount: number,
    paymentMethod: string,
    upiId: string,
    accountNumber: string,
    ifscCode: string,
    accountHolderName: string
  ): Promise<number> {
    const res = await fetch(`${BASE}/wallet/me/withdraw`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ amount, paymentMethod, upiId, accountNumber, ifscCode, accountHolderName }),
    });
    const data = await jsonOrThrow(res);
    if (!data.success) throw new Error(data.message || "Withdrawal failed");
    return data.data as number;
  },

//  Flag a listener during session
  async flagListener(sessionId: string, reason: string) {
    const res = await fetch(`${BASE}/flags`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ sessionId, reason, confidenceScore: 1.0 }),
    });
    if (!res.ok) {
      throw new Error(`Failed to flag: ${res.status}`);
    }
  },

  //  Submit review after session
  async submitReview(sessionId: string, rating: number, comment: string) {
    const res = await fetch(`${BASE}/listeners/review`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ sessionId, rating, comment }),
    });
    const data = await jsonOrThrow(res);
    if (!data.success) throw new Error(data.message || "Failed to submit review");
  },

  //  Get listener reviews (for listener-reviews page)
  async getListenerReviews(): Promise<Array<{
    id: string; rating: number; comment: string;
    userDisplayId: string; sessionId: string; createdAt: string;
  }>> {
    const res = await fetch(`${BASE}/listeners/me/reviews`, { headers: authHeaders() });
    const data = await jsonOrThrow(res);
    return data.data || [];
  },

  //  Get listener flags with details
  async getListenerFlags(): Promise<Array<{
    id: string; reason: string; sessionId: string; createdAt: string;
  }>> {
    const res = await fetch(`${BASE}/listeners/me/flags`, { headers: authHeaders() });
    const data = await jsonOrThrow(res);
    return data.data || [];
  },

  //  Called when WebRTC actually connects — billing clock starts from this moment
  async markSessionConnected(sessionId: string) {
    try {
      await fetch(`${BASE}/sessions/${sessionId}/connected`, {
        method: "POST",
        headers: authHeaders(),
      });
    } catch (e) {
      console.error("markConnected error:", e);
    }
  },

// ──────────────────────────────────────────────────────────
  // ADMIN APIs
  // ──────────────────────────────────────────────────────────

  async adminGetStats() {
    const res = await fetch(`${BASE}/admin/stats`, { headers: authHeaders() });
    const data = await jsonOrThrow(res);
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  async adminGetListeners() {
    const res = await fetch(`${BASE}/admin/listeners`, { headers: authHeaders() });
    const data = await jsonOrThrow(res);
    return data.data || [];
  },

  async adminGetUsers() {
    const res = await fetch(`${BASE}/admin/users`, { headers: authHeaders() });
    const data = await jsonOrThrow(res);
    return data.data || [];
  },

  async adminGetFlags() {
    const res = await fetch(`${BASE}/admin/flags`, { headers: authHeaders() });
    const data = await jsonOrThrow(res);
    return data.data || [];
  },

  async adminGetReviews() {
    const res = await fetch(`${BASE}/admin/reviews`, { headers: authHeaders() });
    const data = await jsonOrThrow(res);
    return data.data || [];
  },

  async adminGetTransactions(filter: string) {
    const res = await fetch(`${BASE}/admin/transactions?filter=${filter}`, { headers: authHeaders() });
    const data = await jsonOrThrow(res);
    return data.data || [];
  },

  async adminGetSessions() {
    const res = await fetch(`${BASE}/admin/sessions`, { headers: authHeaders() });
    const data = await jsonOrThrow(res);
    return data.data || [];
  },

  async adminBlacklistListener(listenerId: string, blacklist: boolean) {
    const endpoint = blacklist ? "blacklist" : "unblacklist";
    const res = await fetch(`${BASE}/admin/listeners/${listenerId}/${endpoint}`, {
      method: "POST", headers: authHeaders(),
    });
    const data = await jsonOrThrow(res);
    if (!data.success) throw new Error(data.message);
  },

  async adminResetFlags(listenerId: string) {
    const res = await fetch(`${BASE}/admin/listeners/${listenerId}/reset-flags`, {
      method: "POST", headers: authHeaders(),
    });
    const data = await jsonOrThrow(res);
    if (!data.success) throw new Error(data.message);
  },

  // User interest tags
  async getUserTags(): Promise<string[]> {
    const res = await fetch(`${BASE}/ai/user/tags`, { headers: authHeaders() });
    const data = await jsonOrThrow(res);
    return data.data || [];
  },

  async saveUserTags(tags: string[]) {
    const res = await fetch(`${BASE}/ai/user/tags`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(tags),
    });
    const data = await jsonOrThrow(res);
    if (!data.success) throw new Error(data.message || "Failed to save tags");
  },

  // Listener expertise tags
  async getListenerTags(): Promise<string[]> {
    const res = await fetch(`${BASE}/ai/listener/tags`, { headers: authHeaders() });
    const data = await jsonOrThrow(res);
    return data.data || [];
  },

  async saveListenerTags(tags: string[]) {
    const res = await fetch(`${BASE}/ai/listener/tags`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(tags),
    });
    const data = await jsonOrThrow(res);
    if (!data.success) throw new Error(data.message || "Failed to save tags");
  },

  // User mood (pre-session)
  async saveUserMood(mood: string) {
    const res = await fetch(`${BASE}/ai/user/mood`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ mood }),
    });
    const data = await jsonOrThrow(res);
    if (!data.success) throw new Error(data.message || "Failed to save mood");
  },

  async getUserMood(): Promise<string> {
    const res = await fetch(`${BASE}/ai/user/mood`, { headers: authHeaders() });
    const data = await jsonOrThrow(res);
    return data.data || "neutral";
  },

  // Post-session sentiment analysis (Phase 2.1)
  async analyzeSessionSentiment(sessionId: string, reviewText: string) {
    const res = await fetch(`${BASE}/ai/session/${sessionId}/analyze`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ reviewText }),
    });
    const data = await jsonOrThrow(res);
    return data.data;
  },

  // Phase 3 — real-time AI suggestions for listener
  async getAiSuggestions(sessionId: string, transcript: string, userMood: string): Promise<{
    isCritical: boolean;
    suggestions: string[];
    detectedEmotion: string;
    urgencyLevel: string;
    alert: string;
  } | null> {
    try {
      const res = await fetch(`${BASE}/ai/session/${sessionId}/suggest`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ transcript, userMood }),
      });
      const data = await jsonOrThrow(res);
      return data.data;
    } catch {
      return null;
    }
  },

  // Phase 5 — User memory profile
  async getUserMemory(): Promise<{
    totalSessions: number;
    avgSatisfactionScore: number;
    dominantEmotion: string;
    recurringTopics: string;
    recurringStress: boolean;
    lastSessionSentiment: string;
    emotionalTrend: string;
    updatedAt: string;
  } | null> {
    try {
      const res = await fetch(`${BASE}/ai/user/memory`, { headers: authHeaders() });
      const data = await jsonOrThrow(res);
      return data.data;
    } catch {
      return null;
    }
  },

  // Phase 4 — Session evaluation
  async getSessionEvaluation(sessionId: string) {
    try {
      const res = await fetch(`${BASE}/ai/session/${sessionId}/evaluation`, { headers: authHeaders() });
      const data = await jsonOrThrow(res);
      return data.data;
    } catch {
      return null;
    }
  },

  async adminGetAnomalies() {
    const res = await fetch(`${BASE}/admin/anomalies`, { headers: authHeaders() });
    const data = await jsonOrThrow(res);
    return data.data || [];
  },

  async adminGetMemories() {
    const res = await fetch(`${BASE}/admin/user-memories`, { headers: authHeaders() });
    const data = await jsonOrThrow(res);
    return data.data || [];
  },
};