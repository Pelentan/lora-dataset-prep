import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import ProjectNav from '../components/ProjectNav'
import { api } from '../services/api'

export default function TrainingImages() {
  const { projectName } = useParams()

  const [images, setImages] = useState([])
  const [artifacts, setArtifacts] = useState([])
  const [selectedArtifact, setSelectedArtifact] = useState('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const [editingCaption, setEditingCaption] = useState(false)
  const [captionText, setCaptionText] = useState('')
  const [stats, setStats] = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')

  useEffect(() => {
    loadArtifacts()
    loadImages()
  }, [projectName])

  useEffect(() => {
    calculateStats()
  }, [images])

  async function loadArtifacts() {
    try {
      const data = await api.artifacts.list(projectName)
      setArtifacts(data.artifacts || [])
    } catch (err) {
      setError(err.message)
    }
  }

  async function loadImages() {
    try {
      setLoading(true)
      const artifactId = selectedArtifact === 'all' ? null : selectedArtifact
      const data = await api.images.list(projectName, artifactId)
      setImages(data.images || [])
      // Clear selection when loading new images
      setSelectedIds(new Set())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function calculateStats() {
    if (images.length === 0) {
      setStats(null)
      return
    }

    const byArtifact = {}
    const byAngle = {}
    const byLighting = {}

    images.forEach(img => {
      // Count by artifact
      byArtifact[img.artifact_id] = (byArtifact[img.artifact_id] || 0) + 1
      
      // Count by angle
      if (img.angle) {
        byAngle[img.angle] = (byAngle[img.angle] || 0) + 1
      }
      
      // Count by lighting
      if (img.lighting_condition) {
        byLighting[img.lighting_condition] = (byLighting[img.lighting_condition] || 0) + 1
      }
    })

    setStats({
      total: images.length,
      byArtifact,
      byAngle,
      byLighting
    })
  }

  function handleImageClick(image) {
    setSelectedImage(image)
    setCaptionText(image.caption_text || '')
    setEditingCaption(false)
  }

  function handleToggleSelection(imageId, e) {
    e.stopPropagation()
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(imageId)) {
        newSet.delete(imageId)
      } else {
        newSet.add(imageId)
      }
      return newSet
    })
  }

  function handleSelectAll(e) {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredImages.map(img => img.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  function handleBulkDelete() {
    if (selectedIds.size === 0) return
    setShowDeleteDialog(true)
  }

  async function confirmBulkDelete() {
    const confirmText = selectedArtifact === 'all' ? 'DELETE' : selectedArtifact
    
    if (deleteConfirmation !== confirmText) {
      setError('Confirmation text does not match')
      return
    }

    try {
      setLoading(true)
      
      // Delete each selected image
      const deletePromises = Array.from(selectedIds).map(id =>
        api.images.delete(projectName, id)
      )
      
      await Promise.all(deletePromises)
      
      // Remove from local state
      setImages(prev => prev.filter(img => !selectedIds.has(img.id)))
      setSelectedIds(new Set())
      setShowDeleteDialog(false)
      setDeleteConfirmation('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateCaption() {
    try {
      setLoading(true)
      await api.images.update(projectName, selectedImage.id, {
        caption_text: captionText
      })
      
      // Update local state
      setImages(prev => prev.map(img => 
        img.id === selectedImage.id 
          ? { ...img, caption_text: captionText }
          : img
      ))
      
      setSelectedImage({ ...selectedImage, caption_text: captionText })
      setEditingCaption(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteImage() {
    if (!confirm(`Delete this training image? This cannot be undone.`)) {
      return
    }

    try {
      setLoading(true)
      await api.images.delete(projectName, selectedImage.id)
      
      // Remove from local state
      setImages(prev => prev.filter(img => img.id !== selectedImage.id))
      setSelectedImage(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleExportDataset() {
    try {
      setLoading(true)
      const artifactId = selectedArtifact === 'all' ? null : selectedArtifact
      
      // Call export endpoint
      const response = await fetch(
        `http://localhost:8080/api/projects/${projectName}/images/export${artifactId ? `?artifact_id=${artifactId}` : ''}`,
        { method: 'POST' }
      )
      
      if (!response.ok) {
        throw new Error('Export failed')
      }
      
      // Download the ZIP file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${projectName}_training_images${artifactId ? `_${artifactId}` : ''}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredImages = selectedArtifact === 'all' 
    ? images 
    : images.filter(img => img.artifact_id === selectedArtifact)

  return (
    <>
      <ProjectNav projectName={projectName} />
      
      <div style={{ padding: '20px' }}>
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>Training Images</h1>
          <div style={{ display: 'flex', gap: '12px' }}>
            {selectedIds.size > 0 && (
              <button 
                onClick={handleBulkDelete}
                disabled={loading}
                style={{ backgroundColor: '#dc3545', color: 'white' }}
              >
                🗑️ Delete Selected ({selectedIds.size})
              </button>
            )}
            <button 
              onClick={handleExportDataset}
              disabled={filteredImages.length === 0 || loading}
              className="primary"
            >
              📦 Export Dataset ({filteredImages.length} images)
            </button>
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        {/* Filters and Stats */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '200px' }}>
              <label>Filter by Artifact</label>
              <select 
                value={selectedArtifact} 
                onChange={(e) => {
                  setSelectedArtifact(e.target.value)
                  setSelectedIds(new Set()) // Clear selection when changing filter
                }}
                style={{ width: '100%' }}
              >
                <option value="all">All Artifacts ({images.length})</option>
                {artifacts.map(artifact => (
                  <option key={artifact.id} value={artifact.id}>
                    {artifact.name} ({images.filter(img => img.artifact_id === artifact.id).length})
                  </option>
                ))}
              </select>
            </div>

            {filteredImages.length > 0 && (
              <div style={{ flex: '0', minWidth: '150px', display: 'flex', alignItems: 'flex-end' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '0' }}>
                  <input
                    type="checkbox"
                    checked={filteredImages.length > 0 && selectedIds.size === filteredImages.length}
                    onChange={handleSelectAll}
                  />
                  <span>Select All ({filteredImages.length})</span>
                </label>
              </div>
            )}

            {stats && (
              <div style={{ flex: '2', minWidth: '300px' }}>
                <strong>Dataset Statistics</strong>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                  gap: '12px',
                  marginTop: '8px'
                }}>
                  <div style={{ padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>
                      {stats.total}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Total Images</div>
                  </div>
                  <div style={{ padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
                      {Object.keys(stats.byArtifact).length}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Artifacts</div>
                  </div>
                  <div style={{ padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fd7e14' }}>
                      {Object.keys(stats.byAngle).length}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Angles</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Images Grid */}
        {loading ? (
          <div className="card">Loading...</div>
        ) : filteredImages.length === 0 ? (
          <div className="card">
            <p style={{ textAlign: 'center', color: '#666' }}>
              No training images yet. Use the Import Images page to create some!
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '16px'
          }}>
            {filteredImages.map(image => (
              <div
                key={image.id}
                onClick={() => handleImageClick(image)}
                className="card"
                style={{
                  cursor: 'pointer',
                  padding: '12px',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = ''
                }}
              >
                <div style={{
                  position: 'relative',
                  paddingBottom: '100%',
                  backgroundColor: '#000',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  marginBottom: '8px'
                }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(image.id)}
                    onChange={(e) => handleToggleSelection(image.id, e)}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      width: '20px',
                      height: '20px',
                      zIndex: 10,
                      cursor: 'pointer'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <img
                    src={`http://localhost:8080/api/projects/${projectName}/images/${image.id}/file`}
                    alt={image.original_filename || image.id}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain'
                    }}
                  />
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                  {image.original_filename || image.id}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: '#999',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {image.angle && `${image.angle} • `}
                  {image.lighting_condition && `${image.lighting_condition}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image Detail Modal */}
      {selectedImage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="card"
            style={{
              maxWidth: '1200px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              display: 'flex',
              gap: '20px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left: Image */}
            <div style={{ flex: '1', minWidth: '400px' }}>
              <img
                src={`http://localhost:8080/api/projects/${projectName}/images/${selectedImage.id}/file`}
                alt={selectedImage.original_filename}
                style={{
                  width: '100%',
                  height: 'auto',
                  backgroundColor: '#000',
                  borderRadius: '4px'
                }}
              />
              <div style={{ marginTop: '12px', fontSize: '12px', color: '#666' }}>
                <div><strong>ID:</strong> {selectedImage.id}</div>
                <div><strong>Filename:</strong> {selectedImage.original_filename}</div>
                {selectedImage.angle && <div><strong>Angle:</strong> {selectedImage.angle}</div>}
                {selectedImage.distance && <div><strong>Distance:</strong> {selectedImage.distance}</div>}
                {selectedImage.lighting_condition && <div><strong>Lighting:</strong> {selectedImage.lighting_condition}</div>}
                {selectedImage.condition_state && <div><strong>Condition:</strong> {selectedImage.condition_state}</div>}
              </div>
            </div>

            {/* Right: Caption */}
            <div style={{ flex: '1', minWidth: '400px', display: 'flex', flexDirection: 'column' }}>
              <h2>Caption</h2>
              
              {editingCaption ? (
                <>
                  <textarea
                    value={captionText}
                    onChange={(e) => setCaptionText(e.target.value)}
                    rows={12}
                    style={{
                      flex: 1,
                      fontFamily: 'monospace',
                      fontSize: '14px',
                      padding: '12px',
                      border: '1px solid #dee2e6',
                      borderRadius: '4px',
                      resize: 'vertical'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button onClick={handleUpdateCaption} className="primary" disabled={loading}>
                      Save Caption
                    </button>
                    <button onClick={() => {
                      setEditingCaption(false)
                      setCaptionText(selectedImage.caption_text || '')
                    }}>
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    overflowY: 'auto'
                  }}>
                    {selectedImage.caption_text || '(No caption)'}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button onClick={() => setEditingCaption(true)} className="primary">
                      Edit Caption
                    </button>
                    <button onClick={handleDeleteImage} style={{ backgroundColor: '#dc3545', color: 'white' }}>
                      Delete Image
                    </button>
                    <button onClick={() => setSelectedImage(null)}>
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Dialog */}
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
            <h3 style={{ color: '#dc3545' }}>⚠️ Delete Selected Images</h3>
            
            <p style={{ marginTop: '16px', marginBottom: '16px' }}>
              You are about to permanently delete <strong>{selectedIds.size}</strong> training image(s).
            </p>

            <p style={{ marginBottom: '16px', fontWeight: 'bold' }}>
              This will delete both the image files and caption files. This cannot be undone!
            </p>

            <div className="form-group">
              <label>
                Type <strong>{selectedArtifact === 'all' ? 'DELETE' : selectedArtifact}</strong> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder={selectedArtifact === 'all' ? 'DELETE' : selectedArtifact}
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button onClick={() => {
                setShowDeleteDialog(false)
                setDeleteConfirmation('')
              }}>Cancel</button>
              <button
                onClick={confirmBulkDelete}
                disabled={deleteConfirmation !== (selectedArtifact === 'all' ? 'DELETE' : selectedArtifact)}
                style={{
                  backgroundColor: deleteConfirmation === (selectedArtifact === 'all' ? 'DELETE' : selectedArtifact) ? '#dc3545' : '#ccc',
                  color: 'white',
                  cursor: deleteConfirmation === (selectedArtifact === 'all' ? 'DELETE' : selectedArtifact) ? 'pointer' : 'not-allowed',
                }}
              >
                Delete {selectedIds.size} Image(s)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}