import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import Home from './pages/Home/Home';
import SeriesDetail from './pages/SeriesDetail/SeriesDetail';
import MovieDetail from './pages/MovieDetail/MovieDetail';
import Profile from './pages/Profile/Profile';
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
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/series/:id" element={<SeriesDetail />} />
          <Route path="/movie/:id" element={<MovieDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Home />} />
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
