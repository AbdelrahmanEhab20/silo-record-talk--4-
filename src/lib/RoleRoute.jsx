import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { isOrgAdmin, isSystemAdmin } from "@/lib/roles";

const AuthLoading = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
  </div>
);

/**
 * @param {{ children: import('react').ReactNode, requireSystemAdmin?: boolean }} props
 */
export default function RoleRoute({ children, requireSystemAdmin = false }) {
  const { user, isAuthenticated, isLoadingAuth, isLoadingPublicSettings } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) return <AuthLoading />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.status === "disabled") {
    return <Navigate to="/login" replace />;
  }

  if (requireSystemAdmin) {
    if (!isSystemAdmin(user)) {
      return <Navigate to="/home" replace />;
    }
  } else if (!isOrgAdmin(user)) {
    return <Navigate to="/home" replace />;
  }

  return children;
}
