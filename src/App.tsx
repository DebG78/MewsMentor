import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Settings from "./pages/Settings";
import AdminLogin from "./pages/AdminLogin";
import AdminOverview from "./pages/admin/AdminOverview";
import MentoringCohorts from "./pages/admin/MentoringCohorts";
import CohortDetail from "./pages/admin/CohortDetail";
import MentoringUnassigned from "./pages/admin/MentoringUnassigned";
import MentoringSessions from "./pages/admin/MentoringSessions";
import MatchingModelManager from "./pages/admin/MatchingModelManager";
import CheckInsTracker from "./pages/admin/CheckInsTracker";
import CohortRunbook from "./pages/admin/CohortRunbook";
import SuccessMetricsDashboard from "./pages/admin/SuccessMetricsDashboard";
import VIPManagement from "./pages/admin/VIPManagement";
import PeopleProfiles from "./pages/admin/PeopleProfiles";
import PeopleAnalytics from "./pages/admin/PeopleAnalytics";
import NotFound from "./pages/NotFound";
import { UserProvider } from "./contexts/UserContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AdminLayout } from "./components/admin/AdminLayout";
import { ProtectedRoute, PublicRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider>
        <UserProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Root redirects to admin login */}
              <Route path="/" element={<Navigate to="/admin/login" replace />} />

              {/* Admin login */}
              <Route
                path="/admin/login"
                element={
                  <PublicRoute redirectTo="/admin">
                    <AdminLogin />
                  </PublicRoute>
                }
              />

              {/* Admin Overview */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminLayout>
                      <AdminOverview />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />

              {/* Mentoring Program Admin Routes */}
              <Route
                path="/admin/mentoring/cohorts/:cohortId?"
                element={
                  <ProtectedRoute>
                    <AdminLayout>
                      <MentoringCohorts />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/mentoring/cohort/:cohortId/:tab?"
                element={
                  <ProtectedRoute>
                    <AdminLayout>
                      <CohortDetail />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/mentoring/unassigned"
                element={
                  <ProtectedRoute>
                    <AdminLayout>
                      <MentoringUnassigned />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/mentoring/sessions"
                element={
                  <ProtectedRoute>
                    <AdminLayout>
                      <MentoringSessions />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/mentoring/matching-models"
                element={
                  <ProtectedRoute>
                    <AdminLayout>
                      <MatchingModelManager />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/mentoring/check-ins"
                element={
                  <ProtectedRoute>
                    <AdminLayout>
                      <CheckInsTracker />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/mentoring/runbook/:cohortId?"
                element={
                  <ProtectedRoute>
                    <AdminLayout>
                      <CohortRunbook />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />

              {/* Analytics Admin Routes */}
              <Route
                path="/admin/analytics/metrics"
                element={
                  <ProtectedRoute>
                    <AdminLayout>
                      <SuccessMetricsDashboard />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/analytics/vip"
                element={
                  <ProtectedRoute>
                    <AdminLayout>
                      <VIPManagement />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />

              {/* People & Analytics Admin Routes */}
              <Route
                path="/admin/people/profiles"
                element={
                  <ProtectedRoute>
                    <AdminLayout>
                      <PeopleProfiles />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/people/analytics"
                element={
                  <ProtectedRoute>
                    <AdminLayout>
                      <PeopleAnalytics />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />

              {/* Admin Settings Route */}
              <Route
                path="/admin/settings"
                element={
                  <ProtectedRoute>
                    <AdminLayout>
                      <Settings />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />

              {/* Catch-all route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </UserProvider>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
