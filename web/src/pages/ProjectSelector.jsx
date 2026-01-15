import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'

function ProjectSelector() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newProject, setNewProject] = useState({ name: '', universe: '' })
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletingProject, setDeletingProject] = useState(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    loadProjects()
  }, [])

  async function loadProjects() {
    try {
      setLoading(true)
      const data = await api.projects.list()
      setProjects(data.projects || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    try {
      await api.projects.create(newProject.name, newProject.universe)
      setShowCreate(false)
      setNewProject({ name: '', universe: '' })
      loadProjects()
    } catch (err) {
      setError(err.message)
    }
  }

  function openDeleteDialog(projectName) {
    setDeletingProject(projectName)
    setDeleteConfirmation('')
    setShowDeleteDialog(true)
  }

  async function handleDelete() {
    if (deleteConfirmation !== deletingProject) {
      setError('Project name does not match')
      return
    }

    try {
      await api.projects.delete(deletingProject)
      setShowDeleteDialog(false)
      setDeletingProject(null)
      setDeleteConfirmation('')
      loadProjects()
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return <div className="loading">Loading projects...</div>
  }

  return (
    <div className="container">
      <h1>LoRA Prep - Model Training Dataset Manager</h1>
      
      {error && <div className="error">{error}</div>}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Projects</h2>
          <button className="primary" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? 'Cancel' : 'New Project'}
          </button>
        </div>

        {showCreate && (
          <form onSubmit={handleCreate} style={{ marginBottom: '20px', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
            <div className="form-group">
              <label>Project Name</label>
              <input
                type="text"
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                placeholder="star-citizen"
                required
              />
            </div>
            <div className="form-group">
              <label>Universe</label>
              <input
                type="text"
                value={newProject.universe}
                onChange={(e) => setNewProject({ ...newProject, universe: e.target.value })}
                placeholder="Star Citizen"
                required
              />
            </div>
            <button type="submit" className="primary">Create Project</button>
          </form>
        )}

        {projects.length === 0 ? (
          <p style={{ color: '#666', textAlign: 'center', padding: '40px' }}>
            No projects yet. Create your first project to get started.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {projects.map((project) => (
              <div
                key={project}
                style={{
                  padding: '16px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div
                  onClick={() => navigate(`/projects/${project}`)}
                  style={{
                    flex: 1,
                    cursor: 'pointer',
                  }}
                >
                  <h3 style={{ marginBottom: '4px' }}>{project}</h3>
                  <p style={{ color: '#666', fontSize: '14px' }}>Click to open</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    openDeleteDialog(project)
                  }}
                  style={{ color: '#dc3545', marginLeft: '16px' }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', margin: '20px' }}>
            <h3 style={{ color: '#dc3545' }}>⚠️ Delete Project</h3>
            
            <p style={{ marginTop: '16px', marginBottom: '16px' }}>
              This will permanently delete the project <strong>{deletingProject}</strong> and all its data:
            </p>
            
            <ul style={{ marginLeft: '20px', marginBottom: '16px', color: '#666' }}>
              <li>Database and all artifacts</li>
              <li>All training images</li>
              <li>All exported datasets</li>
              <li>All lookup table customizations</li>
            </ul>

            <p style={{ marginBottom: '16px', fontWeight: 'bold' }}>
              This action cannot be undone!
            </p>

            <div className="form-group">
              <label>Type the project name <strong>{deletingProject}</strong> to confirm:</label>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder={deletingProject}
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowDeleteDialog(false)}>Cancel</button>
              <button
                onClick={handleDelete}
                disabled={deleteConfirmation !== deletingProject}
                style={{
                  backgroundColor: deleteConfirmation === deletingProject ? '#dc3545' : '#ccc',
                  color: 'white',
                  cursor: deleteConfirmation === deletingProject ? 'pointer' : 'not-allowed',
                }}
              >
                Delete Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProjectSelector