import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, User, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import AuthContext from '../../contexts/AuthContext';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: ''
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

  const validatePassword = (password) => {
    const validations = {
      minLength: password.length >= 6,
      hasNumber: /\d/.test(password),
      hasLetter: /[a-zA-Z]/.test(password)
    };
    
    return validations;
  };

  const validateForm = () => {
    const newErrors = {};

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 2) {
      newErrors.username = 'Username must be at least 2 characters';
    } else if (formData.username.length > 30) {
      newErrors.username = 'Username must be less than 30 characters';
    } else if (!/^[a-zA-Z0-9_\-\s]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, spaces, hyphens, and underscores';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else {
      const passwordChecks = validatePassword(formData.password);
      if (!passwordChecks.minLength) {
        newErrors.password = 'Password must be at least 6 characters';
      } else if (!passwordChecks.hasNumber || !passwordChecks.hasLetter) {
        newErrors.password = 'Password must contain at least one letter and one number';
      }
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: formData.username.trim(),
          password: formData.password
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Auto-login after successful registration
        const loginResponse = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: formData.username.trim(),
            password: formData.password
          })
        });

        const loginData = await loginResponse.json();
        
        if (loginResponse.ok) {
          login(loginData.user, loginData.token);
          navigate('/lobby');
        } else {
          navigate('/login');
        }
      } else {
        setErrors({ general: data.error || 'Registration failed' });
      }
    } catch (error) {
      console.error('Registration error:', error);
      setErrors({ general: 'Network error. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const passwordValidation = validatePassword(formData.password);

  return (
    <div className="flex flex-center" style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '2rem'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '450px' }}>
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
            <UserPlus size={24} color="white" />
          </div>
          <h1 className="card-title">Create Account</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Join the secure chatroom community
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
              placeholder="Choose a username"
              disabled={isLoading}
              autoComplete="username"
            />
            {errors.username && (
              <div style={{ color: 'var(--accent-error)', fontSize: '14px', marginTop: '4px' }}>
                {errors.username}
              </div>
            )}
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              2-30 characters, letters, numbers, spaces, hyphens, and underscores only
            </div>
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
              placeholder="Create a secure password"
              disabled={isLoading}
              autoComplete="new-password"
            />
            {errors.password && (
              <div style={{ color: 'var(--accent-error)', fontSize: '14px', marginTop: '4px' }}>
                {errors.password}
              </div>
            )}
            
            {/* Password strength indicators */}
            {formData.password && (
              <div style={{ marginTop: '8px', fontSize: '12px' }}>
                <div style={{ marginBottom: '4px', color: 'var(--text-secondary)' }}>
                  Password Requirements:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ 
                    color: passwordValidation.minLength ? 'var(--accent-success)' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {passwordValidation.minLength ? <CheckCircle size={12} /> : <div style={{ width: '12px', height: '12px', border: '1px solid currentColor', borderRadius: '50%' }} />}
                    At least 6 characters
                  </div>
                  <div style={{ 
                    color: passwordValidation.hasLetter ? 'var(--accent-success)' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {passwordValidation.hasLetter ? <CheckCircle size={12} /> : <div style={{ width: '12px', height: '12px', border: '1px solid currentColor', borderRadius: '50%' }} />}
                    Contains letters
                  </div>
                  <div style={{ 
                    color: passwordValidation.hasNumber ? 'var(--accent-success)' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {passwordValidation.hasNumber ? <CheckCircle size={12} /> : <div style={{ width: '12px', height: '12px', border: '1px solid currentColor', borderRadius: '50%' }} />}
                    Contains numbers
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">
              <Lock size={16} style={{ marginRight: '8px' }} />
              Confirm Password
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
              placeholder="Confirm your password"
              disabled={isLoading}
              autoComplete="new-password"
            />
            {errors.confirmPassword && (
              <div style={{ color: 'var(--accent-error)', fontSize: '14px', marginTop: '4px' }}>
                {errors.confirmPassword}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginBottom: '1rem' }}
            disabled={isLoading}
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="text-center">
          <p style={{ color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <Link 
              to="/login" 
              style={{ 
                color: 'var(--accent-primary)', 
                textDecoration: 'none',
                fontWeight: '500'
              }}
            >
              Sign in here
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
          <p style={{ marginBottom: '8px' }}>🔒 <strong>Privacy & Security:</strong></p>
          <ul style={{ margin: 0, paddingLeft: '1rem' }}>
            <li>Your password is encrypted and never stored in plain text</li>
            <li>Private messages use end-to-end encryption</li>
            <li>We don't share your data with third parties</li>
            <li>You can delete your account and data at any time</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Register;