import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthContext from './contexts/AuthContext';
import SocketContext from './contexts/SocketContext';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ChatRoom from './components/Chat/ChatRoom';
import Lobby from './components/Lobby/Lobby';
import LoadingSpinner from './components/UI/LoadingSpinner';
import ErrorBoundary from './components/UI/ErrorBoundary';
import { initializeSocket } from './services/socketService';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [socket, setSocket] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing auth token on app load
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setToken(storedToken);
        
        // Initialize socket connection
        const socketInstance = initializeSocket(storedToken);
        setSocket(socketInstance);
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
      }
    }
    
    setIsLoading(false);
  }, []);

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('authToken', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    
    // Initialize socket connection
    const socketInstance = initializeSocket(authToken);
    setSocket(socketInstance);
  };

  const logout = () => {
    if (socket) {
      socket.disconnect();
    }
    
    setUser(null);
    setToken(null);
    setSocket(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <ErrorBoundary>
      <AuthContext.Provider value={{ user, token, login, logout }}>
        <SocketContext.Provider value={socket}>
          <Router>
            <div className="App">
              <Routes>
                {/* Public routes */}
                <Route 
                  path="/login" 
                  element={!user ? <Login /> : <Navigate to="/lobby" replace />} 
                />
                <Route 
                  path="/register" 
                  element={!user ? <Register /> : <Navigate to="/lobby" replace />} 
                />
                
                {/* Protected routes */}
                <Route 
                  path="/lobby" 
                  element={user ? <Lobby /> : <Navigate to="/login" replace />} 
                />
                <Route 
                  path="/room/:roomId" 
                  element={user ? <ChatRoom /> : <Navigate to="/login" replace />} 
                />
                
                {/* Default redirect */}
                <Route 
                  path="/" 
                  element={<Navigate to={user ? "/lobby" : "/login"} replace />} 
                />
                
                {/* 404 fallback */}
                <Route 
                  path="*" 
                  element={<Navigate to={user ? "/lobby" : "/login"} replace />} 
                />
              </Routes>
            </div>
          </Router>
        </SocketContext.Provider>
      </AuthContext.Provider>
    </ErrorBoundary>
  );
}

export default App;