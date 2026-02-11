import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingFallback from './components/LoadingFallback';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import NetworkStatus from './components/NetworkStatus';

// Lazy load pages for code splitting
const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const MatchesPage = lazy(() => import('./pages/MatchesPage'));
const SwapsPage = lazy(() => import('./pages/SwapsPage'));
const SkillsPage = lazy(() => import('./pages/SkillsPage'));
const ConnectionsPage = lazy(() => import('./pages/Connections'));
const GamificationPage = lazy(() => import('./pages/GamificationDashboard'));
const EventDetailsPage = lazy(() => import('./pages/EventDetails'));
const PricingPage = lazy(() => import('./pages/Pricing'));
const SubscriptionPage = lazy(() => import('./pages/SubscriptionDashboard'));
const NotificationPrefsPage = lazy(() => import('./pages/NotificationPreferences'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboard'));
const AdminUsersPage = lazy(() => import('./pages/AdminUsers'));
const AdminModerationPage = lazy(() => import('./pages/AdminModeration'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function App() {
  return (
    <ErrorBoundary>
      <NetworkStatus />
      <Toaster position="top-right" />
      <Suspense fallback={<LoadingFallback fullScreen />}>
        <Routes>
          {/* Public Routes (No Layout) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Routes (With Layout & Sidebar) */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <HomePage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <DashboardPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Layout>
                  <ProfilePage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/matches"
            element={
              <ProtectedRoute>
                <Layout>
                  <MatchesPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/swaps"
            element={
              <ProtectedRoute>
                <Layout>
                  <SwapsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/skills"
            element={
              <ProtectedRoute>
                <Layout>
                  <SkillsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/connections"
            element={
              <ProtectedRoute>
                <Layout>
                  <ConnectionsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/gamification"
            element={
              <ProtectedRoute>
                <Layout>
                  <GamificationPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/events"
            element={
              <ProtectedRoute>
                <Layout>
                  <div className="text-center py-12">
                    <h1 className="text-3xl font-bold text-gray-900">Events</h1>
                    <p className="mt-4 text-gray-600">Events listing page coming soon!</p>
                  </div>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/events/:eventId"
            element={
              <ProtectedRoute>
                <Layout>
                  <EventDetailsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/pricing"
            element={
              <Layout>
                <PricingPage />
              </Layout>
            }
          />
          <Route
            path="/subscription"
            element={
              <ProtectedRoute>
                <Layout>
                  <SubscriptionPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/notifications"
            element={
              <ProtectedRoute>
                <Layout>
                  <NotificationPrefsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Layout>
                  <AdminDashboardPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute>
                <Layout>
                  <AdminUsersPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/moderation"
            element={
              <ProtectedRoute>
                <Layout>
                  <AdminModerationPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* 404 Not Found - Catch all unmatched routes */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
