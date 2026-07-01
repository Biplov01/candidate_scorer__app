import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { candidatesAPI } from '../api/client'
import Layout from '../components/Layout'
import LoadingSpinner from '../components/LoadingSpinner'

function Candidates() {
  const { user, isAdmin } = useAuth()
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({
    status: '',
    role_applied: '',
    skill: '',
    keyword: '',
  })
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
  })
  const [total, setTotal] = useState(0)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newCandidate, setNewCandidate] = useState({
    name: '',
    email: '',
    role_applied: '',
    skills: '',
    status: 'new',
  })

  const fetchCandidates = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {
        ...filters,
        page: pagination.page,
        page_size: pagination.pageSize,
      }
      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key]
      })
      
      const response = await candidatesAPI.getAll(params)
      setCandidates(response.data)
      setTotal(parseInt(response.headers['x-total-count'] || response.data.length))
    } catch (err) {
      setError('Failed to load candidates')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCandidates()
  }, [filters, pagination])

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 })) // Reset to first page
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      const data = {
        ...newCandidate,
        skills: newCandidate.skills.split(',').map(s => s.trim()).filter(Boolean),
      }
      await candidatesAPI.create(data)
      setShowCreateForm(false)
      setNewCandidate({ name: '', email: '', role_applied: '', skills: '', status: 'new' })
      fetchCandidates()
    } catch (err) {
      setError('Failed to create candidate')
      console.error(err)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to archive this candidate?')) return
    try {
      await candidatesAPI.delete(id)
      fetchCandidates()
    } catch (err) {
      setError('Failed to delete candidate')
      console.error(err)
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

  const totalPages = Math.ceil(total / pagination.pageSize)

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Candidates</h1>
        <button className="btn-primary" onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? 'Cancel' : '+ Add Candidate'}
        </button>
      </div>

      {showCreateForm && (
        <div className="card">
          <h3 style={{ marginBottom: '16px' }}>New Candidate</h3>
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <input
              placeholder="Name *"
              value={newCandidate.name}
              onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
              required
            />
            <input
              placeholder="Email *"
              type="email"
              value={newCandidate.email}
              onChange={(e) => setNewCandidate({ ...newCandidate, email: e.target.value })}
              required
            />
            <input
              placeholder="Role Applied *"
              value={newCandidate.role_applied}
              onChange={(e) => setNewCandidate({ ...newCandidate, role_applied: e.target.value })}
              required
            />
            <input
              placeholder="Skills (comma-separated)"
              value={newCandidate.skills}
              onChange={(e) => setNewCandidate({ ...newCandidate, skills: e.target.value })}
            />
            <select
              value={newCandidate.status}
              onChange={(e) => setNewCandidate({ ...newCandidate, status: e.target.value })}
            >
              <option value="new">New</option>
              <option value="reviewed">Reviewed</option>
              <option value="hired">Hired</option>
              <option value="rejected">Rejected</option>
            </select>
            <button type="submit" className="btn-primary" style={{ gridColumn: '1 / -1' }}>
              Create Candidate
            </button>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <select
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          style={{ width: 'auto', minWidth: '120px' }}
        >
          <option value="">All Status</option>
          <option value="new">New</option>
          <option value="reviewed">Reviewed</option>
          <option value="hired">Hired</option>
          <option value="rejected">Rejected</option>
          <option value="archived">Archived</option>
        </select>
        
        <input
          placeholder="Role"
          value={filters.role_applied}
          onChange={(e) => handleFilterChange('role_applied', e.target.value)}
          style={{ width: 'auto', minWidth: '150px' }}
        />
        
        <input
          placeholder="Skill"
          value={filters.skill}
          onChange={(e) => handleFilterChange('skill', e.target.value)}
          style={{ width: 'auto', minWidth: '150px' }}
        />
        
        <input
          placeholder="Search by name or email"
          value={filters.keyword}
          onChange={(e) => handleFilterChange('keyword', e.target.value)}
          style={{ flex: 1, minWidth: '200px' }}
        />
        
        <button className="btn-secondary" onClick={() => {
          setFilters({ status: '', role_applied: '', skill: '', keyword: '' })
          setPagination({ page: 1, pageSize: 20 })
        }}>
          Clear
        </button>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#dc2626', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <LoadingSpinner size={40} />
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '12px', fontSize: '14px', color: '#6b7280' }}>
            Showing {candidates.length} of {total} candidates
          </div>
          
          <div style={{ display: 'grid', gap: '12px' }}>
            {candidates.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', color: '#6b7280' }}>
                No candidates found
              </div>
            ) : (
              candidates.map(candidate => (
                <div key={candidate.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Link to={`/candidates/${candidate.id}`} style={{ fontSize: '18px', fontWeight: '600', color: '#1a1a2e', textDecoration: 'none' }}>
                      {candidate.name}
                    </Link>
                    <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                      {candidate.email} • {candidate.role_applied}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                      <span style={{ 
                        padding: '2px 10px', 
                        borderRadius: '12px', 
                        fontSize: '12px', 
                        background: getStatusColor(candidate.status),
                        color: 'white'
                      }}>
                        {candidate.status}
                      </span>
                      {candidate.skills?.map(skill => (
                        <span key={skill} style={{ padding: '2px 8px', background: '#f3f4f6', borderRadius: '4px', fontSize: '12px' }}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Link to={`/candidates/${candidate.id}`} className="btn-primary" style={{ textDecoration: 'none' }}>
                      View
                    </Link>
                    {isAdmin && (
                      <button className="btn-danger" onClick={() => handleDelete(candidate.id)}>
                        Archive
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
              <button
                className="btn-secondary"
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
              >
                Previous
              </button>
              <span style={{ padding: '8px 16px' }}>
                Page {pagination.page} of {totalPages}
              </span>
              <button
                className="btn-secondary"
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </Layout>
  )
}

export default Candidates
