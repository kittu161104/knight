import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AuthLayout from './components/AuthLayout';
import AdminLayout from './components/AdminLayout';
import ErrorBoundary from './components/ErrorBoundary';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/admin/Dashboard';
import AdminContests from './pages/admin/Contests';
import AdminSubmissions from './pages/admin/Submissions';
import AdminSettings from './pages/admin/Settings';
import AdminTutorials from './pages/admin/Tutorials';
import AdminAnalytics from './pages/admin/Analytics';
import Collaborations from './pages/Collaborations';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen relative">
          {/* Parallax Background */}
          <div className="parallax-bg" />
          
          {/* Content */}
          <div className="relative z-10">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="contests" element={<AdminContests />} />
                <Route path="submissions" element={<AdminSubmissions />} />
                <Route path="tutorials" element={<AdminTutorials />} />
                <Route path="analytics" element={<AdminAnalytics />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>

              <Route element={<AuthLayout />}>
                <Route path="/*" element={<Home />} />
                <Route path="/collaborations" element={<Collaborations />} />
              </Route>
            </Routes>
          </div>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;