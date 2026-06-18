import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/lib/ThemeContext";
import Settings from "./pages/Settings";
import Analytics from "./pages/Analytics";
import Dashboard from "./pages/Dashboard";
import Calendar from "./pages/Calendar";
import CalendarConnect from "./pages/CalendarConnect";
import SessionDetail from "./pages/SessionDetail";
import ExportStudio from "./pages/ExportStudio";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { pagesConfig } from "./pages.config";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  useLocation,
} from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import BrandingEffect from "@/lib/BrandingEffect";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";

import Recording from "./pages/Recording";
import Landing from "./pages/Landing";
import Workspaces from "./pages/Workspaces";
import Pricing from "./pages/Pricing";
import Usage from "./pages/Usage";
import ProductivityDashboard from "./pages/ProductivityDashboard";
import SEO from "./pages/SEO";
import ContactUs from "./pages/ContactUs";
import Integrations from "./pages/Integrations";
import Blog from "./pages/Blog";
import WordAnalysis from "./pages/WordAnalysis";
import PublicSessionView from "./pages/PublicSessionView";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Support from "./pages/Support";
import Insights from "./pages/Insights";
import ArchivedSessions from "./pages/ArchivedSessions";
import Courses from "./pages/Courses";
import AdminSettings from "./pages/AdminSettings";
import Login from "./pages/Login";
import AcceptInvite from "./pages/AcceptInvite";
import RoleRoute from "@/lib/RoleRoute";
import AdminLayout from "./pages/admin/AdminLayout";
import OrgOverview from "./pages/admin/OrgOverview";
import OrgUsers from "./pages/admin/OrgUsers";
import OrgUsage from "./pages/admin/OrgUsage";
import OrgInvites from "./pages/admin/OrgInvites";

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) =>
  Layout ? (
    <Layout currentPageName={currentPageName}>{children}</Layout>
  ) : (
    <>{children}</>
  );

const AuthLoading = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
  </div>
);

const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, isLoadingAuth, isLoadingPublicSettings } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) return <AuthLoading />;

  // If already logged in, don't show landing/login style pages
  if (isAuthenticated) return <Navigate to="/home" replace />;

  return children;
};

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoadingAuth, isLoadingPublicSettings } = useAuth();
  const location = useLocation();

  if (isLoadingPublicSettings || isLoadingAuth) return <AuthLoading />;

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return children;
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) return <AuthLoading />;

  if (authError) {
    if (authError.type === "user_not_registered") {
      return <UserNotRegisteredError />;
    }
    if (authError.type === "auth_required") {
      return <Navigate to="/login" replace />;
    }
  }

  return (
    <Routes>
      {/* Public */}
      <Route
        path="/"
        element={
          <PublicOnlyRoute>
            <Landing />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <Login />
          </PublicOnlyRoute>
        }
      />
      <Route path="/accept-invite" element={<AcceptInvite />} />
      <Route path="/share/:code" element={<PublicSessionView />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/support" element={<Support />} />
      <Route path="/Blog" element={<Blog />} />

      {/* Protected */}
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <LayoutWrapper currentPageName={mainPageKey}>
              <MainPage />
            </LayoutWrapper>
          </ProtectedRoute>
        }
      />

      {Object.entries(Pages)
        .filter(([path]) => path !== mainPageKey)
        .map(([path, Page]) => (
          <Route
            key={path}
            path={`/${path}`}
            element={
              <ProtectedRoute>
                <LayoutWrapper currentPageName={path}>
                  <Page />
                </LayoutWrapper>
              </ProtectedRoute>
            }
          />
        ))}

      <Route
        path="/Settings"
        element={
          <ProtectedRoute>
            <LayoutWrapper currentPageName="Settings">
              <Settings />
            </LayoutWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/Dashboard"
        element={
          <ProtectedRoute>
            <LayoutWrapper currentPageName="Dashboard">
              <Dashboard />
            </LayoutWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/Analytics"
        element={
          <ProtectedRoute>
            <LayoutWrapper currentPageName="Analytics">
              <Analytics />
            </LayoutWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/Calendar"
        element={
          <ProtectedRoute>
            <LayoutWrapper currentPageName="Calendar">
              <Calendar />
            </LayoutWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/CalendarConnect"
        element={
          <ProtectedRoute>
            <LayoutWrapper currentPageName="CalendarConnect">
              <CalendarConnect />
            </LayoutWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/SessionDetail"
        element={
          <ProtectedRoute>
            <LayoutWrapper currentPageName="SessionDetail">
              <SessionDetail />
            </LayoutWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ExportStudio"
        element={
          <ProtectedRoute>
            <LayoutWrapper currentPageName="ExportStudio">
              <ExportStudio />
            </LayoutWrapper>
          </ProtectedRoute>
        }
      />
      <Route path="/Pricing" element={<Navigate to="/Usage" replace />} />
      <Route
        path="/Usage"
        element={
          <ProtectedRoute>
            <LayoutWrapper currentPageName="Usage">
              <Usage />
            </LayoutWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/Workspaces"
        element={
          <ProtectedRoute>
            <LayoutWrapper currentPageName="Workspaces">
              <Workspaces />
            </LayoutWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ProductivityDashboard"
        element={
          <ProtectedRoute>
            <LayoutWrapper currentPageName="ProductivityDashboard">
              <ProductivityDashboard />
            </LayoutWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/SEO"
        element={
          <ProtectedRoute>
            <LayoutWrapper currentPageName="SEO">
              <SEO />
            </LayoutWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ContactUs"
        element={
          <ProtectedRoute>
            <LayoutWrapper currentPageName="ContactUs">
              <ContactUs />
            </LayoutWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/Integrations"
        element={
          <ProtectedRoute>
            <LayoutWrapper currentPageName="Integrations">
              <Integrations />
            </LayoutWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/WordAnalysis"
        element={
          <ProtectedRoute>
            <LayoutWrapper currentPageName="WordAnalysis">
              <WordAnalysis />
            </LayoutWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/Recording"
        element={
          <ProtectedRoute>
            <Recording />
          </ProtectedRoute>
        }
      />
      <Route
        path="/Insights"
        element={
          <ProtectedRoute>
            <LayoutWrapper currentPageName="Insights">
              <Insights />
            </LayoutWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ArchivedSessions"
        element={
          <ProtectedRoute>
            <LayoutWrapper currentPageName="ArchivedSessions">
              <ArchivedSessions />
            </LayoutWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/Courses"
        element={
          <ProtectedRoute>
            <LayoutWrapper currentPageName="Courses">
              <Courses />
            </LayoutWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/AdminSettings"
        element={<Navigate to="/admin/platform" replace />}
      />
      <Route
        path="/admin/platform"
        element={
          <ProtectedRoute>
            <RoleRoute requireSystemAdmin>
              <AdminSettings />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/org"
        element={
          <ProtectedRoute>
            <RoleRoute>
              <AdminLayout />
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<OrgOverview />} />
        <Route path="users" element={<OrgUsers />} />
        <Route path="usage" element={<OrgUsage />} />
        <Route path="invites" element={<OrgInvites />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <BrandingEffect />
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;