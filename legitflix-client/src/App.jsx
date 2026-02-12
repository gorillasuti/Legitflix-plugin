import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import Home from './pages/Home/Home';
import SeriesDetail from './pages/SeriesDetail/SeriesDetail';
import MovieDetail from './pages/MovieDetail/MovieDetail';
import Profile from './pages/Profile/Profile';
import SelectServer from './pages/Auth/SelectServer';
import SelectUser from './pages/Auth/SelectUser';
import Login from './pages/Auth/Login';
import ProtectedRoute from './components/ProtectedRoute';
import LegacyRouteHandler from './components/LegacyRouteHandler';
import ItemRedirect from './pages/ItemRedirect/ItemRedirect';
import SkeletonLoader from './components/SkeletonLoader'; // Global loader? Or page level?
// import './App.css'; // Use index.css primarily

function AppContent() {
  const { config } = useTheme();

  return (
    <>
      {config.appBackground && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundImage: `url('${config.appBackground}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            zIndex: -1,
            opacity: 0.3,
            filter: 'grayscale(0.5) brightness(0.5)'
          }}
        />
      )}
      <Router>
        <LegacyRouteHandler />
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/login/select-server" element={<SelectServer />} />
          <Route path="/login/select-user" element={<SelectUser />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Home />} />
            <Route path="/series/:id" element={<SeriesDetail />} />
            <Route path="/movie/:id" element={<MovieDetail />} />
            <Route path="/item/:id" element={<ItemRedirect />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<Home />} />
          </Route>
        </Routes>
      </Router>
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
