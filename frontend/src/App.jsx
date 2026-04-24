import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import {
  clearCurrentAuthUser,
  getCurrentAuthUser,
} from './utils/authStorage.js';
import {
  clearActiveProfileCache,
  getStoredProfile,
  saveStoredProfile,
} from './utils/profileStorage.js';
import AppPage from './pages/AppPage.jsx';
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import OnboardingPage from './pages/OnboardingPage.jsx';
import SignupPage from './pages/SignupPage.jsx';

function App() {
  const [authUser, setAuthUser] = useState(() => getCurrentAuthUser());
  const [userData, setUserData] = useState(() => {
    const currentAuth = getCurrentAuthUser();
    return currentAuth?.email ? getStoredProfile(currentAuth.email) : null;
  });

  useEffect(() => {
    if (!authUser?.email) {
      setUserData(null);
      clearActiveProfileCache();
      return;
    }

    const profile = getStoredProfile(authUser.email);
    console.log('📊 Profile loaded:', { email: authUser.email, profile });
    setUserData(profile);
  }, [authUser]);

  const handleAuthSuccess = (nextAuthUser) => {
    console.log('🔓 Auth success callback:', nextAuthUser);
    setAuthUser(nextAuthUser);
  };

  const handleOnboardingComplete = (profile) => {
    if (!authUser?.email) return;

    saveStoredProfile(authUser.email, profile);
    setUserData(profile);
  };

  const handleUserDataUpdate = (nextProfile) => {
    if (!authUser?.email) return;

    saveStoredProfile(authUser.email, nextProfile);
    setUserData(nextProfile);
  };

  const handleLogout = () => {
    clearCurrentAuthUser();
    clearActiveProfileCache();
    setAuthUser(null);
    setUserData(null);
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/signup"
          element={<SignupPage onAuthenticated={handleAuthSuccess} />}
        />
        <Route
          path="/login"
          element={<LoginPage onAuthenticated={handleAuthSuccess} />}
        />
        <Route
          path="/onboarding"
          element={
            !authUser ? (
              <Navigate to="/login" replace />
            ) : userData ? (
              <Navigate to="/app" replace />
            ) : (
              <OnboardingPage
                accountEmail={authUser.email}
                onComplete={handleOnboardingComplete}
              />
            )
          }
        />
        <Route
          path="/app"
          element={
            !authUser ? (
              <Navigate to="/login" replace />
            ) : !userData ? (
              <Navigate to="/onboarding" replace />
            ) : (
              <AppPage
                userData={userData}
                onUpdateUserData={handleUserDataUpdate}
                onLogout={handleLogout}
              />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
