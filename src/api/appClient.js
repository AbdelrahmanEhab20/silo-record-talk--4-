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
    async filter(filter = {}) {
      return apiRequest(`/entities/${entity}?filter=${encodeURIComponent(JSON.stringify(filter))}`);
    }
  };
}

export const base44 = {
  auth: {
    async isAuthenticated() {
      const state = await apiRequest("/auth/session");
      return !!state.authenticated;
    },
    async me() {
      return apiRequest("/auth/me");
    },
    async devLogin(email) {
      const data = await apiRequest("/auth/dev-login", { method: "POST", body: { email } });
      if (data?.token) setAuthToken(data.token);
      return data;
    },
    logout() {
      setAuthToken(null);
      return apiRequest("/auth/logout", { method: "POST" }).catch(() => null);
    },
    redirectToLogin() {
      window.location.href = "/login";
    }
  },
  entities: {
    User: createEntityClient("User"),
    Session: createEntityClient("Session"),
    Workspace: createEntityClient("Workspace"),
    CreditLedger: createEntityClient("CreditLedger")
  },
  functions: {
    async invoke(name, payload = {}) {
      return apiRequest(`/functions/${name}/invoke`, { method: "POST", body: payload });
    }
  },
  integrations: {
    Core: {
      async UploadFile({ file }) {
        const formData = new FormData();
        formData.append("file", file);
        return apiRequest("/integrations/core/upload-file", { method: "POST", body: formData });
      },
      async InvokeLLM(payload) {
        return apiRequest("/integrations/core/invoke-llm", { method: "POST", body: payload });
      }
    }
  },
  analytics: {
    track() {
      // no-op placeholder; replace with Segment/PostHog if needed.
    }
  },
  appLogs: {
    logUserInApp() {
      return Promise.resolve();
    }
  }
};
