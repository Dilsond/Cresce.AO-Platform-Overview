import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import { LandingPage } from './components/LandingPage';
import { LoginPage } from './components/LoginPage';
import { SignupPage } from './components/SignupPage';
import { OrganizerLoginPage } from './components/OrganizerLoginPage';
import { OrganizerSignupPage } from './components/OrganizerSignupPage';
import { EventsPage } from './components/EventsPage';
import { PrivacyPolicyPage } from './components/PrivacyPolicyPage';
import { TermsOfUsePage } from './components/TermsOfUsePage';
import { CookieBanner } from './components/CookieBanner';
import { OrganizerDashboard } from './components/OrganizerDashboard';
import { FavoritesPage } from './components/FavoritesPage';
import { CreateEvent } from './components/CreateEvent';
import { EventDetailPage } from './components/EventDetailPage';
import { OrganizerProfile } from './components/OrganizerProfile';
import { UserDashboard } from './components/UserDashboard';
import { PrivateRoute } from "./components/PrivateRoute";
import OrganizerProfilePage from "./components/OrganizerProfilePage";

function AppRoutes() {

  const navigate = useNavigate();

  return (
    <>
      <CookieBanner />

      <Routes>

        <Route
          path="/"
          element={
            <LandingPage
              onExplore={() => navigate('/login')}
              onNavigateToPrivacy={() => navigate('/privacy-policy')}
              onNavigateToTerms={() => navigate('/terms-of-use')}
            />
          }
        />

        <Route
          path="/login"
          element={
            <LoginPage
              onLogin={() => navigate('/events')}
              onBack={() => navigate('/')}
            />
          }
        />

        <Route
          path="/signup"
          element={
            <SignupPage
              onSignup={() => navigate('/events')}
              onNavigateToLogin={() => navigate('/login')}
              onBack={() => navigate('/login')}
            />
          }
        />

        <Route
          path="/organizer-signup"
          element={<OrganizerSignupPage
            onBack={() => navigate('/login')}
          />
          }
        />

        <Route
          path="/organizer-login"
          element={
            <OrganizerLoginPage
              onBack={() => navigate('/login')}
            />
          }
        />

        <Route
          path="/organizer-dashboard"
          element={<PrivateRoute>
            <OrganizerDashboard />
          </PrivateRoute>
          }
        />

        <Route path="/favorites" element={<PrivateRoute><FavoritesPage /></PrivateRoute>} />

        <Route path="/create-event" element={<PrivateRoute><CreateEvent /></PrivateRoute>} />

        <Route path="/events" element={<PrivateRoute><EventsPage /></PrivateRoute>} />

        <Route path="/event/:id" element={<PrivateRoute><EventDetailPage /></PrivateRoute>} />

        <Route path="/organizer-profile" element={<PrivateRoute><OrganizerProfile /></PrivateRoute>} />

        <Route path="/user-dashboard" element={<PrivateRoute><UserDashboard /></PrivateRoute>} />

        <Route path="/organizer/:id" element={ <PrivateRoute><OrganizerProfilePage /></PrivateRoute>} />

        <Route
          path="/privacy-policy"
          element={<PrivacyPolicyPage onBack={() => navigate('/events')} />}
        />

        <Route
          path="/terms-of-use"
          element={<TermsOfUsePage onBack={() => navigate('/events')} />}
        />

      </Routes>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
        <AppRoutes />
      </div>
    </Router>
  );
}