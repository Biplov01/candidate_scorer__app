import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Layout({ children }) {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  
  const handleLogout = () => {
    logout()
    navigate('/login')
  }
  
  return (
    <div>
      <nav style={{ 
        background: 'white', 
        padding: '12px 24px', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <Link to="/" style={{ fontWeight: 'bold', fontSize: '20px', color: '#4a6cf7', textDecoration: 'none' }}>
            🎯 Candidate Dashboard
          </Link>
          <Link to="/" style={{ color: '#1a1a2e', textDecoration: 'none' }}>Candidates</Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: '#6b7280', fontSize: '14px' }}>
            {user?.email} {isAdmin && '👑'}
          </span>
          <button onClick={handleLogout} className="btn-secondary" style={{ padding: '6px 12px' }}>
            Logout
          </button>
        </div>
      </nav>
      <div className="container">
        {children}
      </div>
    </div>
  )
}

export default Layout
