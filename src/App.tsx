import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
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
import { PrivateRoute } from './components/PrivateRoute';
import OrganizerProfilePage from './components/OrganizerProfilePage';
import { ForgotPassword } from './components/ForgotPassword';
import { OrganizerLayout } from './components/OrganizerLayout';
import { MyEventsPage } from './components/MyEventsPage';
import { FollowersPage } from './components/FollowersPage';
import { ManageCommentsPage } from './components/ManageCommentsPage';
import { AppLayout } from './components/AppLayout';

function AppRoutes() {
  const navigate = useNavigate();

  return (
    <>
      <CookieBanner />

      <Routes>
        {/* Páginas públicas sem layout */}
        <Route path="/" element={<LandingPage onExplore={() => navigate('/events')} onNavigateToPrivacy={() => navigate('/privacy-policy')} onNavigateToTerms={() => navigate('/terms-of-use')} />} />
        <Route path="/login" element={<LoginPage onLogin={() => navigate('/events')} onBack={() => navigate('/')} />} />
        <Route path="/signup" element={<SignupPage onSignup={() => navigate('/events')} onNavigateToLogin={() => navigate('/login')} onBack={() => navigate('/login')} />} />
        <Route path="/organizer-signup" element={<OrganizerSignupPage onBack={() => navigate('/login')} />} />
        <Route path="/organizer-login" element={<OrganizerLoginPage onBack={() => navigate('/login')} />} />
        <Route path="/forgot-password" element={<ForgotPassword onBack={() => navigate('/login')} />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage onBack={() => navigate('/events')} />} />
        <Route path="/terms-of-use" element={<TermsOfUsePage onBack={() => navigate('/events')} />} />

        {/* Rotas protegidas com layout dinâmico */}
        <Route element={<AppLayout />}>
          <Route path="/events" element={<EventsPage />} />
          <Route path="/event/:id" element={<EventDetailPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/organizer-dashboard" element={<OrganizerDashboard />} />
          <Route path="/create-event" element={<CreateEvent />} />
          <Route path="/organizer-profile" element={<OrganizerProfile />} />
          <Route path="/organizer/:id" element={<OrganizerProfilePage />} />
          <Route path="/my-events" element={<MyEventsPage />} />
          <Route path="/followers" element={<FollowersPage />} />
          <Route path="/manage-comments" element={<ManageCommentsPage />} />
          <Route path="/user-dashboard" element={<UserDashboard />} />
        </Route>
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen">
        <AppRoutes />
      </div>
    </Router>
  );
}