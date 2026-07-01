import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div className="loading-spinner" style={{ width: '40px', height: '40px' }}></div>
    </div>
  }
  
  if (!user) {
    return <Navigate to="/login" />
  }
  
  return children
}

export default ProtectedRoute
