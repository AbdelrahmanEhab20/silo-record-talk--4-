import { apiRequest } from "@/api/nodeBackendClient";

export const adminApi = {
  listUsers() {
    return apiRequest("/admin/users");
  },
  inviteUser({ email, role, full_name }) {
    return apiRequest("/admin/users/invite", {
      method: "POST",
      body: { email, role, full_name },
    });
  },
  patchUser(id, body) {
    return apiRequest(`/admin/users/${id}`, { method: "PATCH", body });
  },
  usageSummary() {
    return apiRequest("/admin/usage/summary");
  },
  listInvites() {
    return apiRequest("/admin/invites");
  },
  resendInvite(id) {
    return apiRequest(`/admin/invites/${id}/resend`, { method: "POST" });
  },
  revokeInvite(id) {
    return apiRequest(`/admin/invites/${id}`, { method: "DELETE" });
  },
  getDeploymentSettings() {
    return apiRequest("/admin/deployment-settings");
  },
  updateDeploymentSettings(patch) {
    return apiRequest("/admin/deployment-settings", { method: "PATCH", body: patch });
  },
};
