import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const { login, register, error } = useAuth()
  const navigate = useNavigate()
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    let result
    if (isLogin) {
      result = await login(email, password)
    } else {
      result = await register(email, password)
    }
    
    setLoading(false)
    if (result.success) {
      navigate('/')
    }
  }
  
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      background: '#f5f7fa'
    }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%', padding: '40px' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '8px', color: '#1a1a2e' }}>
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h1>
        <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '24px' }}>
          {isLogin ? 'Sign in to access the dashboard' : 'Register as a reviewer'}
        </p>
        
        {error && (
          <div style={{ 
            background: '#fee2e2', 
            color: '#dc2626', 
            padding: '12px', 
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>
          
          <button 
            type="submit" 
            className="btn-primary"
            disabled={loading}
            style={{ 
              width: '100%', 
              padding: '12px',
              fontSize: '16px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {loading && <div className="loading-spinner" style={{ width: '16px', height: '16px' }} />}
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>
        
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="btn-secondary"
            style={{ background: 'transparent', color: '#4a6cf7' }}
          >
            {isLogin ? "Don't have an account? Register" : 'Already have an account? Sign In'}
          </button>
        </div>
        
        <div style={{ marginTop: '24px', padding: '16px', background: '#f3f4f6', borderRadius: '6px', fontSize: '13px', color: '#6b7280' }}>
          <p><strong>Test Accounts:</strong></p>
          <p>Reviewer: reviewer@example.com / password123</p>
          <p>Admin: admin@example.com / admin123</p>
          <p style={{ fontSize: '12px', marginTop: '4px' }}>⚠️ Registration always creates reviewer accounts</p>
        </div>
      </div>
    </div>
  )
}

export default Login
