import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Home from './pages/Home/Home';
import SeriesDetail from './pages/SeriesDetail/SeriesDetail';
import MovieDetail from './pages/MovieDetail/MovieDetail';
import Profile from './pages/Profile/Profile';
import SkeletonLoader from './components/SkeletonLoader'; // Global loader? Or page level?
// import './App.css'; // Use index.css primarily

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/series/:id" element={<SeriesDetail />} />
          <Route path="/movie/:id" element={<MovieDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
