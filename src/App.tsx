import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import GrowthJourneyHome from "./pages/GrowthJourneyHome";
import SkillsPortfolioPage from "./pages/SkillsPortfolioPage";
import UnifiedProfilePage from "./pages/UnifiedProfilePage";
import MentoringProgramPage from "./pages/MentoringProgramPage";
import Skills from "./pages/Skills";
import Sprints from "./pages/Sprints";
import Settings from "./pages/Settings";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLogin from "./pages/AdminLogin";
import AdminOverview from "./pages/admin/AdminOverview";
import MentoringCohorts from "./pages/admin/MentoringCohorts";
import CohortDetail from "./pages/admin/CohortDetail";
import MentoringUnassigned from "./pages/admin/MentoringUnassigned";
import MentoringSessions from "./pages/admin/MentoringSessions";
import MentoringMessages from "./pages/admin/MentoringMessages";
import PeopleProfiles from "./pages/admin/PeopleProfiles";
import PeopleAnalytics from "./pages/admin/PeopleAnalytics";
import Login from "./pages/Login";
import MentoringWorkspace from "./pages/MentoringWorkspace";
import MenteeSignup from "./pages/MenteeSignup";
import MentorSignup from "./pages/MentorSignup";
import NotFound from "./pages/NotFound";
import { UserProvider } from "./contexts/UserContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Layout } from "./components/Layout";
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
            {/* Public routes - redirect to dashboard if authenticated */}
            <Route
              path="/"
              element={
                <PublicRoute>
                  <LandingPage />
                </PublicRoute>
              }
            />
            <Route
              path="/signup/mentee"
              element={
                <PublicRoute>
                  <MenteeSignup />
                </PublicRoute>
              }
            />
            <Route
              path="/signup/mentor"
              element={
                <PublicRoute>
                  <MentorSignup />
                </PublicRoute>
              }
            />
            <Route
              path="/login"
              element={
                <PublicRoute redirectTo="/dashboard">
                  <Login />
                </PublicRoute>
              }
            />

            {/* Protected routes - require authentication and wrap with Layout */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/growth"
              element={
                <ProtectedRoute>
                  <Layout>
                    <GrowthJourneyHome />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/skills-portfolio"
              element={
                <ProtectedRoute>
                  <Layout>
                    <SkillsPortfolioPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Layout>
                    <UnifiedProfilePage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/programs/mentoring"
              element={
                <ProtectedRoute>
                  <Layout>
                    <MentoringProgramPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/skills"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Skills />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/sprints"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Sprints />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Settings />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/workspace/:sprintId"
              element={
                <ProtectedRoute>
                  <Layout>
                    <MentoringWorkspace />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Admin routes - use AdminLayout with sidebar */}
            <Route
              path="/admin/login"
              element={
                <PublicRoute redirectTo="/admin">
                  <AdminLogin />
                </PublicRoute>
              }
            />
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
              path="/admin/mentoring/messages"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <MentoringMessages />
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
