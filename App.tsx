import React, { useState, useEffect } from 'react';
import { DataProvider } from './context/DataContext';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import { User } from './types';

const AppContent: React.FC = () => {
  // Use lazy initialization to check localStorage immediately on first render
  // This implements the "Persistent Login" / Cache system
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('jg_current_user');
    try {
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('jg_current_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('jg_current_user');
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  if (currentUser.role === 'admin') {
    return <AdminDashboard onLogout={handleLogout} />;
  }

  return <TeacherDashboard user={currentUser} onLogout={handleLogout} />;
};

const App: React.FC = () => {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  );
};

export default App;