import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { candidatesAPI } from '../api/client'
import Layout from '../components/Layout'
import LoadingSpinner from '../components/LoadingSpinner'

function CandidateDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAdmin } = useAuth()
  const [candidate, setCandidate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [scoreForm, setScoreForm] = useState({ category: '', score: 5, note: '' })
  const [submitting, setSubmitting] = useState(false)
  const [generatingSummary, setGeneratingSummary] = useState(false)
  const [summary, setSummary] = useState(null)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes] = useState('')
  const [updating, setUpdating] = useState(false)

  const fetchCandidate = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await candidatesAPI.getOne(id)
      setCandidate(response.data)
      setNotes(response.data.internal_notes || '')
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Candidate not found')
      } else {
        setError('Failed to load candidate')
      }
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCandidate()
  }, [id])

  const handleSubmitScore = async (e) => {
    e.preventDefault()
    if (!scoreForm.category) {
      setError('Please select a category')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await candidatesAPI.submitScore(id, scoreForm)
      setScoreForm({ category: '', score: 5, note: '' })
      fetchCandidate()
    } catch (err) {
      setError('Failed to submit score')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleGenerateSummary = async () => {
    setGeneratingSummary(true)
    setError(null)
    try {
      const response = await candidatesAPI.generateSummary(id)
      setSummary(response.data.summary)
    } catch (err) {
      setError('Failed to generate summary')
      console.error(err)
    } finally {
      setGeneratingSummary(false)
    }
  }

  const handleUpdateNotes = async () => {
    setUpdating(true)
    setError(null)
    try {
      await candidatesAPI.update(id, { internal_notes: notes })
      setEditingNotes(false)
      fetchCandidate()
    } catch (err) {
      setError('Failed to update notes')
      console.error(err)
    } finally {
      setUpdating(false)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      new: '#3b82f6',
      reviewed: '#f59e0b',
      hired: '#22c55e',
      rejected: '#ef4444',
      archived: '#9ca3af',
    }
    return colors[status] || '#6b7280'
  }

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <LoadingSpinner size={40} />
        </div>
      </Layout>
    )
  }

  if (error && !candidate) {
    return (
      <Layout>
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <h2 style={{ color: '#dc2626' }}>{error}</h2>
          <button className="btn-primary" onClick={() => navigate('/')} style={{ marginTop: '16px' }}>
            Back to Candidates
          </button>
        </div>
      </Layout>
    )
  }

  if (!candidate) {
    return (
      <Layout>
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <h2>Candidate not found</h2>
          <button className="btn-primary" onClick={() => navigate('/')} style={{ marginTop: '16px' }}>
            Back to Candidates
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <button className="btn-secondary" onClick={() => navigate('/')}>← Back</button>
        </div>
        <span style={{ 
          padding: '4px 16px', 
          borderRadius: '12px', 
          fontSize: '14px', 
          background: getStatusColor(candidate.status),
          color: 'white'
        }}>
          {candidate.status}
        </span>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#dc2626', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Profile Info */}
      <div className="card">
        <h2 style={{ marginBottom: '8px' }}>{candidate.name}</h2>
        <p style={{ color: '#6b7280' }}>{candidate.email}</p>
        <p style={{ marginTop: '4px' }}><strong>Role Applied:</strong> {candidate.role_applied}</p>
        <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {candidate.skills?.map(skill => (
            <span key={skill} style={{ padding: '4px 12px', background: '#e0e7ff', borderRadius: '16px', fontSize: '13px' }}>
              {skill}
            </span>
          ))}
        </div>
        <p style={{ marginTop: '8px', fontSize: '14px', color: '#6b7280' }}>
          Created: {new Date(candidate.created_at).toLocaleDateString()}
        </p>
      </div>

      {/* Internal Notes (Admin Only) */}
      {isAdmin && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3>Internal Notes</h3>
            <button className="btn-secondary" onClick={() => setEditingNotes(!editingNotes)}>
              {editingNotes ? 'Cancel' : 'Edit'}
            </button>
          </div>
          {editingNotes ? (
            <div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                style={{ width: '100%' }}
              />
              <button className="btn-primary" onClick={handleUpdateNotes} disabled={updating} style={{ marginTop: '8px' }}>
                {updating ? <LoadingSpinner size={16} /> : 'Save Notes'}
              </button>
            </div>
          ) : (
            <p style={{ color: '#4b5563', whiteSpace: 'pre-wrap' }}>
              {candidate.internal_notes || 'No notes yet.'}
            </p>
          )}
        </div>
      )}

      {/* AI Summary */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3>AI Summary</h3>
          <button 
            className="btn-primary" 
            onClick={handleGenerateSummary} 
            disabled={generatingSummary}
          >
            {generatingSummary ? <LoadingSpinner size={16} /> : 'Generate Summary'}
          </button>
        </div>
        {summary ? (
          <p style={{ color: '#4b5563' }}>{summary}</p>
        ) : (
          <p style={{ color: '#9ca3af' }}>Click "Generate Summary" to get an AI-powered review.</p>
        )}
        {generatingSummary && (
          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280' }}>
            <LoadingSpinner size={16} />
            Generating summary...
          </div>
        )}
      </div>

      {/* Scores */}
      <div className="card">
        <h3>Scores</h3>
        {candidate.scores && candidate.scores.length > 0 ? (
          <div style={{ display: 'grid', gap: '8px', marginTop: '12px' }}>
            {candidate.scores.map(score => (
              <div key={score.id} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '8px 12px',
                background: '#f9fafb',
                borderRadius: '6px'
              }}>
                <div>
                  <strong>{score.category}</strong>
                  <span style={{ marginLeft: '8px', fontWeight: 'bold', color: '#4a6cf7' }}>
                    {score.score}/5
                  </span>
                  {score.note && <span style={{ marginLeft: '8px', color: '#6b7280', fontSize: '14px' }}>— {score.note}</span>}
                </div>
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                  {score.reviewer_email || `Reviewer #${score.reviewer_id}`}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#9ca3af', marginTop: '8px' }}>No scores yet.</p>
        )}
      </div>

      {/* Submit Score */}
      <div className="card">
        <h3>Submit Score</h3>
        <form onSubmit={handleSubmitScore} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '12px', marginTop: '12px' }}>
          <input
            placeholder="Category (e.g., Technical)"
            value={scoreForm.category}
            onChange={(e) => setScoreForm({ ...scoreForm, category: e.target.value })}
            required
          />
          <select
            value={scoreForm.score}
            onChange={(e) => setScoreForm({ ...scoreForm, score: parseInt(e.target.value) })}
          >
            {[1, 2, 3, 4, 5].map(n => (
              <option key={n} value={n}>{n} - {['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][n-1]}</option>
            ))}
          </select>
          <input
            placeholder="Note (optional)"
            value={scoreForm.note}
            onChange={(e) => setScoreForm({ ...scoreForm, note: e.target.value })}
          />
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? <LoadingSpinner size={16} /> : 'Submit'}
          </button>
        </form>
      </div>
    </Layout>
  )
}

export default CandidateDetail
