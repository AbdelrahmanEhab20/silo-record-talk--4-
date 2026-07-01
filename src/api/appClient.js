import { apiRequest, setAuthToken } from "@/api/nodeBackendClient";

function createEntityClient(entity) {
  return {
    async create(payload) {
      return apiRequest(`/entities/${entity}`, { method: "POST", body: payload });
    },
    async get(id) {
      return apiRequest(`/entities/${entity}/${id}`);
    },
    async update(id, payload) {
      return apiRequest(`/entities/${entity}/${id}`, { method: "PATCH", body: payload });
    },
    async delete(id) {
      return apiRequest(`/entities/${entity}/${id}`, { method: "DELETE" });
    },
    async filter(filter = {}, sort, limit) {
      const params = new URLSearchParams();
      params.set("filter", JSON.stringify(filter));
      if (sort) params.set("sort", String(sort));
      if (limit) params.set("limit", String(limit));
      return apiRequest(`/entities/${entity}?${params.toString()}`);
    },
    async list(sort, limit) {
      return this.filter({}, sort, limit);
    },
    subscribe(_handler) {
      // Owned backend does not support realtime subscriptions yet.
      return () => {};
    }
  };
}

export const appClient = {
  auth: {
    async isAuthenticated() {
      const state = await apiRequest("/auth/session");
      return !!state.authenticated;
    },
    async me() {
      return apiRequest("/auth/me");
    },
    async updateMe(patch) {
      return apiRequest("/auth/me", { method: "PATCH", body: patch });
    },
    async devLogin(email) {
      const data = await apiRequest("/auth/dev-login", { method: "POST", body: { email } });
      if (data?.token) setAuthToken(data.token);
      return data;
    },
    async login(email, password) {
      const data = await apiRequest("/auth/login", { method: "POST", body: { email, password } });
      if (data?.token) setAuthToken(data.token);
      return data;
    },
    async getInviteInfo(token) {
      return apiRequest(`/auth/invite-info?token=${encodeURIComponent(token)}`, { skipAuth: true });
    },
    async acceptInvite({ token, password, full_name }) {
      const data = await apiRequest("/auth/accept-invite", {
        method: "POST",
        body: { token, password, full_name },
        skipAuth: true,
      });
      if (data?.token) setAuthToken(data.token);
      return data;
    },
    async logout(redirectTo = false) {
      setAuthToken(null);
      await apiRequest("/auth/logout", { method: "POST" }).catch(() => null);
      if (redirectTo !== false) {
        window.location.href = typeof redirectTo === "string" ? redirectTo : "/";
      }
    },
    redirectToLogin(returnTo = "") {
      const next = returnTo ? `?next=${encodeURIComponent(returnTo)}` : "";
      window.location.href = `/login${next}`;
    }
  },
  entities: {
    User: createEntityClient("User"),
    Session: createEntityClient("Session"),
    Workspace: createEntityClient("Workspace"),
    CreditLedger: createEntityClient("CreditLedger"),
    PlanSubscription: createEntityClient("PlanSubscription"),
    FolderReport: createEntityClient("FolderReport"),
    AISettings: createEntityClient("AISettings"),
  },
  functions: {
    async invoke(name, payload = {}) {
      return apiRequest(`/functions/${name}/invoke`, { method: "POST", body: payload });
    }
  },
  connectors: {
    async connectAppUser() {
      throw new Error("Connector auth is not configured on owned backend");
    },
    async disconnectAppUser() {
      return { success: true };
    }
  },
  integrations: {
    Core: {
      async UploadFile({ file, assetFolder }) {
        const formData = new FormData();
        formData.append("file", file);
        if (assetFolder) formData.append("asset_folder", assetFolder);
        return apiRequest("/integrations/core/upload-file", { method: "POST", body: formData });
      },
      async InvokeLLM(payload) {
        return apiRequest("/integrations/core/invoke-llm", { method: "POST", body: payload });
      }
    }
  },
  googleCalendar: {
    async getAuthUrl(returnTo) {
      const qs = returnTo ? `?return_to=${encodeURIComponent(returnTo)}` : "";
      return apiRequest(`/integrations/google/auth-url${qs}`);
    },
    async status() {
      return apiRequest("/integrations/google/status");
    },
    async listEvents(days = 14) {
      return apiRequest(`/integrations/google/calendar/events?days=${days}`);
    },
    async createEvent(event) {
      return apiRequest("/integrations/google/calendar/events", {
        method: "POST",
        body: { event },
      });
    },
    async disconnect() {
      return apiRequest("/integrations/google/disconnect", { method: "POST" });
    }
  },
  outlookCalendar: {
    async getAuthUrl(returnTo) {
      const qs = returnTo ? `?return_to=${encodeURIComponent(returnTo)}` : "";
      return apiRequest(`/integrations/microsoft/auth-url${qs}`);
    },
    async status() {
      return apiRequest("/integrations/microsoft/status");
    },
    async listEvents(days = 14) {
      return apiRequest(`/integrations/microsoft/calendar/events?days=${days}`);
    },
    async createEvent(event) {
      return apiRequest("/integrations/microsoft/calendar/events", {
        method: "POST",
        body: { event },
      });
    },
    async disconnect() {
      return apiRequest("/integrations/microsoft/disconnect", { method: "POST" });
    }
  },
  analytics: {
    track(..._args) {
      // no-op placeholder; replace with Segment/PostHog if needed.
    }
  },
  appLogs: {
    logUserInApp() {
      return Promise.resolve();
    }
  }
};
