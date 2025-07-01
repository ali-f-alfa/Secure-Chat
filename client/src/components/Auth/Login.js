import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, User, Lock, AlertCircle } from 'lucide-react';
import AuthContext from '../../contexts/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        login(data.user, data.token);
        navigate('/lobby');
      } else {
        setErrors({ general: data.error || 'Login failed' });
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrors({ general: 'Network error. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-center" style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '2rem'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
        <div className="text-center mb-4">
          <div style={{ 
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            marginBottom: '1rem'
          }}>
            <LogIn size={24} color="white" />
          </div>
          <h1 className="card-title">Welcome Back</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Sign in to your secure chatroom account
          </p>
        </div>

        {errors.general && (
          <div className="error-message">
            <AlertCircle size={16} style={{ marginRight: '8px' }} />
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              <User size={16} style={{ marginRight: '8px' }} />
              Username
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className={`form-input ${errors.username ? 'error' : ''}`}
              placeholder="Enter your username"
              disabled={isLoading}
              autoComplete="username"
            />
            {errors.username && (
              <div style={{ color: 'var(--accent-error)', fontSize: '14px', marginTop: '4px' }}>
                {errors.username}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">
              <Lock size={16} style={{ marginRight: '8px' }} />
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={`form-input ${errors.password ? 'error' : ''}`}
              placeholder="Enter your password"
              disabled={isLoading}
              autoComplete="current-password"
            />
            {errors.password && (
              <div style={{ color: 'var(--accent-error)', fontSize: '14px', marginTop: '4px' }}>
                {errors.password}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginBottom: '1rem' }}
            disabled={isLoading}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="text-center">
          <p style={{ color: 'var(--text-secondary)' }}>
            Don't have an account?{' '}
            <Link 
              to="/register" 
              style={{ 
                color: 'var(--accent-primary)', 
                textDecoration: 'none',
                fontWeight: '500'
              }}
            >
              Sign up here
            </Link>
          </p>
        </div>

        <div style={{ 
          marginTop: '2rem', 
          padding: '1rem', 
          background: 'var(--bg-tertiary)', 
          borderRadius: 'var(--border-radius)',
          fontSize: '12px',
          color: 'var(--text-muted)'
        }}>
          <p style={{ marginBottom: '8px' }}>🔒 <strong>Security Features:</strong></p>
          <ul style={{ margin: 0, paddingLeft: '1rem' }}>
            <li>End-to-end encryption for private chats</li>
            <li>Secure authentication with JWT tokens</li>
            <li>No message data stored in plain text</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Login;