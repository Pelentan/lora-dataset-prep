import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import ProjectNav from '../components/ProjectNav'

function ArtifactList() {
  const { projectName } = useParams()
  const navigate = useNavigate()
  const [artifacts, setArtifacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadArtifacts()
  }, [projectName])

  async function loadArtifacts() {
    try {
      setLoading(true)
      const data = await api.artifacts.list(projectName)
      setArtifacts(data.artifacts || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(artifactId) {
    if (!confirm('Delete this artifact?')) return
    
    try {
      await api.artifacts.delete(projectName, artifactId)
      loadArtifacts()
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return <div className="loading">Loading artifacts...</div>
  }

  return (
    <>
      <ProjectNav projectName={projectName} />
      <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Artifacts</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => navigate(`/projects/${projectName}`)}>Back</button>
          <button className="primary" onClick={() => navigate(`/projects/${projectName}/artifacts/new`)}>
            New Artifact
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {artifacts.length === 0 ? (
        <div className="card">
          <p style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
            No artifacts yet. Create your first artifact to get started.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
          {artifacts.map((artifact) => (
            <div key={artifact.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ margin: 0 }}>{artifact.name}</h3>
                  <div style={{ color: '#666', fontSize: '12px', marginTop: '4px' }}>
                    {artifact.id}
                  </div>
                </div>
              </div>
              
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                <div><strong>Type:</strong> {artifact.artifact_type_code}</div>
                {artifact.manufacturer_code && (
                  <div><strong>Manufacturer:</strong> {artifact.manufacturer_code}</div>
                )}
                <div><strong>Universe:</strong> {artifact.universe}</div>
              </div>

              {artifact.description && (
                <p style={{ fontSize: '14px', color: '#333', marginBottom: '12px' }}>
                  {artifact.description.length > 100 
                    ? artifact.description.substring(0, 100) + '...' 
                    : artifact.description}
                </p>
              )}

              {(artifact.length_m || artifact.width_m || artifact.height_m) && (
                <div style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>
                  Dimensions: {artifact.length_m}m × {artifact.width_m}m × {artifact.height_m}m
                </div>
              )}

              {artifact.primary_colors && (
                <div style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>
                  Colors: {Array.isArray(artifact.primary_colors) 
                    ? artifact.primary_colors.join(', ') 
                    : artifact.primary_colors}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button 
                  onClick={() => navigate(`/projects/${projectName}/artifacts/${artifact.id}/edit`)}
                  style={{ flex: 1 }}
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleDelete(artifact.id)} 
                  style={{ color: '#dc3545' }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </>
  )
}

export default ArtifactList