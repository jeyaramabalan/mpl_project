// mpl-project/mpl-frontend/src/App.jsx
import React, { Suspense, lazy } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';

// --- Core Components ---
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute'; // Component to protect admin routes
import LoadingFallback from './components/LoadingFallback'; // Loading indicator for lazy loading

// --- Lazy Load Pages (improves initial load time) ---
// Public Pages
const HomePage = lazy(() => import('./pages/HomePage'));
const PlayersPage = lazy(() => import('./pages/PlayersPage'));
const PlayerDetailPage = lazy(() => import('./pages/PlayerDetailPage'));
const SchedulePage = lazy(() => import('./pages/SchedulePage'));
const StandingsPage = lazy(() => import('./pages/StandingsPage'));
const MatchDetailPage = lazy(() => import('./pages/MatchDetailPage')); // Live match viewer
const AdminSchedulePage = lazy(() => import('./pages/admin/AdminSchedulePage'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));
// Admin Pages
const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage'));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminSeasonsPage = lazy(() => import('./pages/admin/AdminSeasonsPage'));
const AdminTeamsPage = lazy(() => import('./pages/admin/AdminTeamsPage'));
const AdminMatchSetupPage = lazy(() => import('./pages/admin/AdminMatchSetupPage'));
const AdminLiveScoringPage = lazy(() => import('./pages/admin/AdminLiveScoringPage'));
const AdminPlayersPage = lazy(() => import('./pages/admin/AdminPlayersPage'));
const AdminResolveMatchPage = lazy(() => import('./pages/admin/AdminResolveMatchPage'));
// TODO: Import other admin pages (e.g., AdminPaymentsPage, AdminPlayerManagementPage) when created

// Not Found Page
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function App() {
    return (
        <>
            <Navbar /> {/* Navigation bar present on all pages */}
            <main> {/* Main content area */}
                {/* Suspense provides a fallback UI while lazy-loaded components are loading */}
                <Suspense fallback={<LoadingFallback />}>
                    <Routes> {/* Defines the available routes */}

                        {/* --- Public Routes --- */}
                        <Route path="/" element={<HomePage />} />
                        <Route path="/players" element={<PlayersPage />} />
                        <Route path="/players/:id" element={<PlayerDetailPage />} />
                        <Route path="/schedule" element={<SchedulePage />} />
                        <Route path="/standings" element={<StandingsPage />} />
                        <Route path="/matches/:matchId" element={<MatchDetailPage />} />
                        <Route path="/leaderboard" element={<LeaderboardPage />} />

                        {/* --- Admin Routes --- */}
                        {/* Admin Login Page (Publicly accessible) */}
                        <Route path="/admin/login" element={<AdminLoginPage />} />

                        {/* Protected Admin Area - uses PrivateRoute component */}
                        <Route path="/admin" element={<PrivateRoute />}>
                            {/* Nested routes accessible only if authenticated */}
                            {/* Redirect /admin to /admin/dashboard */}
                            <Route index element={<Navigate to="dashboard" replace />} />
                            <Route path="dashboard" element={<AdminDashboardPage />} />
                            <Route path="seasons" element={<AdminSeasonsPage />} />
                            {/* TODO: Define routes for managing teams within a season?
                                Maybe '/admin/seasons/:seasonId/teams' or handle season selection within AdminTeamsPage */}
                            <Route path="teams" element={<AdminTeamsPage />} />
                            <Route path="schedule" element={<AdminSchedulePage />} />
                            <Route path="players" element={<AdminPlayersPage />} />
                            <Route path="scoring/setup" element={<AdminMatchSetupPage />} />
                            <Route path="scoring/live/:matchId" element={<AdminLiveScoringPage />} />
                            <Route path="resolve" element={<AdminResolveMatchPage />} />
                            {/* Add other protected admin routes here */}
                            {/* Example: <Route path="payments" element={<AdminPaymentsPage />} /> */}
                        </Route>

                        {/* --- Catch-all 404 Not Found Route --- */}
                        {/* This route matches any path not defined above */}
                        <Route path="*" element={<NotFoundPage />} />

                    </Routes>
                </Suspense>
            </main>
            {/* Optional: Footer component */}
        </>
    );
}

export default App;