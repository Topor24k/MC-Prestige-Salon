import { lazy, Suspense, type ReactNode } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { ToastProvider } from './components/ui/Toast';
import AdminSignIn from './pages/auth/AdminSignIn';
import { AuthProvider } from './store/AuthProvider';
import { SalonProvider } from './store/SalonProvider';
import { useAuth } from './store/useAuth';

// The sign-in page loads first; the pages behind it arrive on demand.
const AppShell = lazy(() => import('./components/layout/AppShell'));
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const Appointments = lazy(() => import('./pages/appointments/Appointments'));
const Financial = lazy(() => import('./pages/financial/Financial'));
const Customers = lazy(() => import('./pages/customers/Customers'));
const Services = lazy(() => import('./pages/services/Services'));

function Loading() {
  return (
    <div className="route-loading" role="status" aria-label="Loading">
      <span className="route-loading__mark">M&amp;C</span>
      <span className="route-loading__bar" />
    </div>
  );
}

/** Everything in the system sits behind the staff sign-in. */
function RequireAdmin({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/admin/sign-in" replace />;
  return children;
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <SalonProvider>
        <AuthProvider>
          <ToastProvider>
            <HashRouter>
              <Suspense fallback={<Loading />}>
                <Routes>
                  <Route path="/admin/sign-in" element={<AdminSignIn />} />
                  <Route
                    path="/admin"
                    element={
                      <RequireAdmin>
                        <AppShell />
                      </RequireAdmin>
                    }
                  >
                    <Route index element={<Dashboard />} />
                    <Route path="appointments" element={<Appointments />} />
                    <Route path="financial-report" element={<Financial />} />
                    <Route path="customers" element={<Customers />} />
                    <Route path="services" element={<Services />} />
                  </Route>

                  <Route path="*" element={<Navigate to="/admin" replace />} />
                </Routes>
              </Suspense>
            </HashRouter>
          </ToastProvider>
        </AuthProvider>
      </SalonProvider>
    </MotionConfig>
  );
}
