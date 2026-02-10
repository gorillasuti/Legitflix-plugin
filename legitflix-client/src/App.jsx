import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Home from './pages/Home';
import SeriesDetail from './pages/SeriesDetail';
import MovieDetail from './pages/MovieDetail';
import SkeletonLoader from './components/SkeletonLoader'; // Global loader? Or page level?
// import './App.css'; // Use index.css primarily

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/series/:id" element={<SeriesDetail />} />
          <Route path="/details/:id" element={<MovieDetail />} />
          {/* Fallback for legacy hash format #!/details?id=... handling? 
              React Router might strictly match /details/:id. 
              We might need a wrapper to handle the query param style if we want to support old links.
              For now, let's stick to standard /details/:id and update our internal links.
           */}
          <Route path="*" element={<Home />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
