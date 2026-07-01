import React from 'react'

function LoadingSpinner({ size = 20 }) {
  return (
    <div 
      className="loading-spinner" 
      style={{ 
        width: size, 
        height: size,
        borderWidth: size > 20 ? '4px' : '3px'
      }}
    />
  )
}

export default LoadingSpinner
