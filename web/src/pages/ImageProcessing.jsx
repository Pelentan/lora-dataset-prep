import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ProjectNav from '../components/ProjectNav'
import CropModal from '../components/CropModal'
import { api } from '../services/api'

export default function ImageProcessing() {
  const { projectName } = useParams()
  const navigate = useNavigate()

  const [artifacts, setArtifacts] = useState([])
  const [selectedArtifact, setSelectedArtifact] = useState(null)
  const [lookupTables, setLookupTables] = useState({}) // Tables marked for image processing
  const [images, setImages] = useState([]) // Array of { file, preview, metadata, cropBox }
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [viewMode, setViewMode] = useState('carousel') // 'carousel' or 'grid'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [previewText, setPreviewText] = useState('')
  const [showCropModal, setShowCropModal] = useState(false)

  useEffect(() => {
    loadArtifacts()
    loadImageProcessingLookups()
  }, [projectName])

  useEffect(() => {
    // Global drag and drop handlers
    const handleDragOver = (e) => {
      e.preventDefault()
    }
    
    const handleGlobalDrop = (e) => {
      e.preventDefault()
      if (selectedArtifact) {
        handleDrop(e)
      }
    }

    // Keyboard navigation
    const handleKeyDown = (e) => {
      if (images.length === 0 || viewMode !== 'carousel') return
      
      if (e.key === 'ArrowLeft' && currentImageIndex > 0) {
        e.preventDefault()
        setCurrentImageIndex(currentImageIndex - 1)
      } else if (e.key === 'ArrowRight' && currentImageIndex < images.length - 1) {
        e.preventDefault()
        setCurrentImageIndex(currentImageIndex + 1)
      }
    }

    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('drop', handleGlobalDrop)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('drop', handleGlobalDrop)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedArtifact, images, currentImageIndex, viewMode])

  async function loadArtifacts() {
    try {
      const data = await api.artifacts.list(projectName)
      setArtifacts(data.artifacts || [])
    } catch (err) {
      setError(err.message)
    }
  }

  async function loadImageProcessingLookups() {
    try {
      // Get all lookup tables
      const tablesData = await api.lookups.listTables(projectName)
      const tables = tablesData.tables || []
      
      // Load schema and entries for each table
      const lookupData = {}
      for (const tableName of tables) {
        const schema = await api.lookups.getSchema(projectName, tableName)
        // Load entries for ALL tables (we need them to resolve artifact properties too)
        const entries = await api.lookups.list(projectName, tableName)
        lookupData[tableName] = {
          entries: entries.entries || [],
          label: tableName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          useForImageProcessing: schema.use_for_image_processing || false
        }
      }
      setLookupTables(lookupData)
    } catch (err) {
      setError(err.message)
    }
  }

  function handleFileSelect(e) {
    const files = Array.from(e.target.files)
    processFiles(files)
  }

  function handleFolderSelect(e) {
    const files = Array.from(e.target.files)
    processFiles(files)
  }

  function handleDrop(e) {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    processFiles(files)
  }

  function processFiles(files) {
    const imageFiles = files.filter(f => f.type.startsWith('image/'))
    
    const newImages = imageFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      metadata: {},
      cropBox: null, // Will be set during preprocessing
      processed: false,
      saved: false
    }))

    setImages(prev => [...prev, ...newImages])
  }

  function updateCurrentImageMetadata(field, value) {
    setImages(prev => {
      const updated = [...prev]
      updated[currentImageIndex].metadata[field] = value
      return updated
    })
  }

  function handleSelectImageFromGrid(index) {
    // If the selected image has no metadata, copy from current image
    setImages(prev => {
      const updated = [...prev]
      const selectedImage = updated[index]
      const currentMeta = updated[currentImageIndex].metadata
      
      // Check if selected image has any metadata
      const hasMetadata = Object.keys(selectedImage.metadata).some(key => selectedImage.metadata[key])
      
      // If empty, copy current metadata
      if (!hasMetadata && currentImageIndex !== index) {
        updated[index].metadata = { ...currentMeta }
      }
      
      return updated
    })
    
    // Switch to that image
    setCurrentImageIndex(index)
    
    // Switch to carousel view for editing
    setViewMode('carousel')
  }

  function handleCropSave(processedFile, cropParams) {
    setImages(prev => {
      const updated = [...prev]
      // Replace file and preview with processed version
      updated[currentImageIndex].file = processedFile
      updated[currentImageIndex].preview = URL.createObjectURL(processedFile)
      updated[currentImageIndex].cropBox = cropParams
      updated[currentImageIndex].processed = true
      return updated
    })
    setShowCropModal(false)
  }

  function handleRemoveImage() {
    const newImages = images.filter((_, i) => i !== currentImageIndex)
    setImages(newImages)
    
    if (newImages.length === 0) {
      // No images left, stay on carousel
      return
    }
    
    // Check if all remaining images are saved
    const allSaved = newImages.every(img => img.saved)
    if (allSaved) {
      // All done - go to grid view
      setViewMode('grid')
      setCurrentImageIndex(0)
    } else {
      // Find next unsaved image
      let nextUnsavedIndex = -1
      
      // First, check images after current index
      for (let i = currentImageIndex; i < newImages.length; i++) {
        if (!newImages[i].saved) {
          nextUnsavedIndex = i
          break
        }
      }
      
      // If not found, check from beginning
      if (nextUnsavedIndex === -1) {
        for (let i = 0; i < currentImageIndex && i < newImages.length; i++) {
          if (!newImages[i].saved) {
            nextUnsavedIndex = i
            break
          }
        }
      }
      
      // If we found an unsaved image, go there
      if (nextUnsavedIndex !== -1) {
        setCurrentImageIndex(nextUnsavedIndex)
      } else {
        // No unsaved images (shouldn't happen due to allSaved check, but just in case)
        setViewMode('grid')
        setCurrentImageIndex(0)
      }
    }
  }

  function generatePreview() {
    const image = images[currentImageIndex]
    const caption = generateCaptionText(image.metadata)
    setPreviewText(caption)
    setShowPreview(true)
  }

  async function saveCurrentImage() {
    try {
      setLoading(true)
      setError(null)
      
      const currentImage = images[currentImageIndex]
      const metadata = currentImage.metadata
      
      // Generate caption text
      const captionText = generateCaptionText(metadata)
      
      // Prepare metadata for API
      const imageMetadata = {
        artifact_id: selectedArtifact.id,
        caption_text: captionText,
        angle: metadata.angle_types || '',
        distance: metadata.distance_types || '',
        lighting_condition: metadata.lighting_types || '',
        condition_state: metadata.condition_states || '',
        environment_context: metadata.environment_context || '',
        specific_details: metadata.specific_details || '',
      }
      
      // Upload image with metadata
      await api.images.create(projectName, currentImage.file, imageMetadata)
      
      // Calculate which image to go to next BEFORE updating state
      let nextUnsavedIndex = -1
      
      // Create a temporary updated array to check
      const tempUpdated = [...images]
      tempUpdated[currentImageIndex].saved = true
      
      // Find next unsaved image in temp array
      for (let i = currentImageIndex + 1; i < tempUpdated.length; i++) {
        if (!tempUpdated[i].saved) {
          nextUnsavedIndex = i
          break
        }
      }
      // If not found after current, check from beginning
      if (nextUnsavedIndex === -1) {
        for (let i = 0; i < currentImageIndex; i++) {
          if (!tempUpdated[i].saved) {
            nextUnsavedIndex = i
            break
          }
        }
      }
      
      // Now update state with saved flag and metadata copy
      setImages(prev => {
        const updated = [...prev]
        updated[currentImageIndex].saved = true
        
        // Copy metadata to next unsaved image if it's empty
        if (nextUnsavedIndex !== -1) {
          const nextImage = updated[nextUnsavedIndex]
          const currentMeta = updated[currentImageIndex].metadata
          
          const hasMetadata = Object.keys(nextImage.metadata).some(key => nextImage.metadata[key])
          if (!hasMetadata) {
            updated[nextUnsavedIndex].metadata = { ...currentMeta }
          }
        }
        
        return updated
      })
      
      // Navigate to next unsaved image or grid view
      if (nextUnsavedIndex !== -1) {
        setCurrentImageIndex(nextUnsavedIndex)
      } else {
        // All images saved - go to grid view
        setViewMode('grid')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  
  function generateCaptionText(metadata) {
    // Helper to get full name from lookup code
    const getLookupName = (tableName, code) => {
      if (!code || !lookupTables[tableName]) return null
      const entry = lookupTables[tableName].entries.find(e => e.code === code)
      return entry ? entry.full_name : null
    }
    
    // Get values from image metadata
    const angle = getLookupName('angle_types', metadata.angle_types)
    const distance = getLookupName('distance_types', metadata.distance_types)
    const lighting = getLookupName('lighting_types', metadata.lighting_types)
    const condition = getLookupName('condition_states', metadata.condition_states)
    
    // Extract ALL artifact properties dynamically
    const artifactProperties = []
    if (selectedArtifact.additional_properties) {
      const addProps = typeof selectedArtifact.additional_properties === 'string'
        ? JSON.parse(selectedArtifact.additional_properties)
        : selectedArtifact.additional_properties
      
      // Get all properties from artifact (exclude image processing tables)
      Object.entries(addProps).forEach(([tableName, codes]) => {
        if (Array.isArray(codes) && codes.length > 0 && lookupTables[tableName]) {
          // Don't include image processing tables in artifact description
          if (!lookupTables[tableName].useForImageProcessing) {
            codes.forEach(code => {
              const name = getLookupName(tableName, code)
              if (name) {
                artifactProperties.push(name.toLowerCase())
              }
            })
          }
        }
      })
    }
    
    // Build structured caption
    let caption = ''
    
    // Start with view/angle if available
    if (angle && distance) {
      caption += `A ${angle.toLowerCase()} ${distance.toLowerCase()} view of `
    } else if (angle) {
      caption += `A ${angle.toLowerCase()} view of `
    } else if (distance) {
      caption += `A ${distance.toLowerCase()} shot of `
    } else {
      caption += `An image of `
    }
    
    // Add artifact name
    caption += selectedArtifact.name
    
    // Add artifact properties if any exist
    if (artifactProperties.length > 0) {
      caption += `, a ${artifactProperties.join(' ')}`
    }
    
    // Add condition if available
    if (condition) {
      caption += ` in ${condition.toLowerCase()} condition`
    }
    
    // Add lighting if available
    if (lighting) {
      caption += `, captured in ${lighting.toLowerCase()} lighting`
    }
    
    caption += '.'
    
    // Add artifact description if it exists
    if (selectedArtifact.description) {
      caption += ' ' + selectedArtifact.description
    }
    
    // Add environment context if provided
    if (metadata.environment_context) {
      caption += ' Environment: ' + metadata.environment_context + '.'
    }
    
    // Add specific details if provided
    if (metadata.specific_details) {
      caption += ' ' + metadata.specific_details
    }
    
    return caption
  }

  if (!selectedArtifact) {
    return (
      <>
        <ProjectNav projectName={projectName} />
        <div className="container">
          <h1>Image Processing</h1>
          
          <div className="card">
            <h2>Select Artifact</h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              Choose the artifact you want to add training images for
            </p>
            
            {artifacts.length === 0 ? (
              <p style={{ color: '#999' }}>
                No artifacts found. <a href={`/projects/${projectName}/artifacts/new`}>Create one first</a>
              </p>
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                {artifacts.map(artifact => (
                  <div
                    key={artifact.id}
                    onClick={() => setSelectedArtifact(artifact)}
                    style={{
                      padding: '16px',
                      border: '1px solid #dee2e6',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#007bff'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = '#dee2e6'}
                  >
                    <strong>{artifact.name}</strong>
                    <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                      ID: {artifact.id}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <ProjectNav projectName={projectName} />
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1>Image Processing: {selectedArtifact.name}</h1>
            <button 
              onClick={() => setSelectedArtifact(null)}
              style={{ marginTop: '8px' }}
            >
              ← Change Artifact
            </button>
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => setViewMode(viewMode === 'carousel' ? 'grid' : 'carousel')}
            >
              {viewMode === 'carousel' ? 'Grid View' : 'Carousel View'}
            </button>
            {images.filter(img => img.saved).length === images.length ? (
              <div style={{ 
                padding: '8px 16px', 
                backgroundColor: '#28a745', 
                color: 'white', 
                borderRadius: '4px',
                fontWeight: 'bold'
              }}>
                ✓ All Images Saved ({images.length})
              </div>
            ) : (
              <div style={{ 
                padding: '8px 16px', 
                backgroundColor: '#f8f9fa', 
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                color: '#666'
              }}>
                {images.filter(img => img.saved).length} / {images.length} Saved
              </div>
            )}
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        {images.length === 0 ? (
          <div className="card">
            <h2>Import Images</h2>
            
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              style={{
                border: '2px dashed #007bff',
                borderRadius: '8px',
                padding: '40px',
                textAlign: 'center',
                backgroundColor: '#f8f9fa'
              }}
            >
              <p style={{ fontSize: '18px', marginBottom: '16px' }}>
                Drag and drop images here
              </p>
              <p style={{ color: '#666', marginBottom: '16px' }}>or</p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <label className="primary" style={{ cursor: 'pointer', display: 'inline-block' }}>
                  Browse Files
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                </label>
                <label className="primary" style={{ cursor: 'pointer', display: 'inline-block' }}>
                  Select Folder
                  <input
                    type="file"
                    webkitdirectory=""
                    directory=""
                    multiple
                    onChange={handleFolderSelect}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>

            <div style={{ marginTop: '20px' }}>
              <h3>Available Metadata Fields</h3>
              <p style={{ color: '#666', fontSize: '14px' }}>
                The following lookup tables are configured for image processing:
              </p>
              <ul style={{ marginTop: '12px' }}>
                {Object.entries(lookupTables).filter(([_, data]) => data.useForImageProcessing).length === 0 ? (
                  <li style={{ color: '#999' }}>
                    No lookup tables configured. Visit Lookup Tables and enable "Use for Image Processing"
                  </li>
                ) : (
                  Object.entries(lookupTables)
                    .filter(([_, data]) => data.useForImageProcessing)
                    .map(([tableName, data]) => (
                      <li key={tableName}>{data.label}</li>
                    ))
                )}
              </ul>
            </div>
          </div>
        ) : (
          <div>
            {viewMode === 'carousel' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '20px' }}>
                {/* Left: Image Preview */}
                <div className="card">
                  <h2>Image Preview ({currentImageIndex + 1} of {images.length})</h2>
                  
                  <div style={{ 
                    position: 'relative', 
                    width: '100%', 
                    paddingBottom: '100%',
                    backgroundColor: '#000',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <img 
                      src={images[currentImageIndex].preview}
                      alt="Preview"
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

                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginTop: '16px' 
                  }}>
                    <button 
                      onClick={() => setCurrentImageIndex(Math.max(0, currentImageIndex - 1))}
                      disabled={currentImageIndex === 0}
                    >
                      ← Previous
                    </button>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '14px', color: '#666' }}>
                        {images[currentImageIndex].file.name}
                      </span>
                      {images[currentImageIndex].saved && (
                        <span style={{ fontSize: '12px', color: '#28a745', fontWeight: 'bold' }}>
                          ✓ Saved
                        </span>
                      )}
                    </div>
                    
                    <button 
                      onClick={() => setCurrentImageIndex(Math.min(images.length - 1, currentImageIndex + 1))}
                      disabled={currentImageIndex === images.length - 1}
                    >
                      Next →
                    </button>
                  </div>

                  <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => setShowCropModal(true)}
                      style={{ backgroundColor: '#007bff', color: 'white', flex: 1 }}
                    >
                      {images[currentImageIndex].processed ? '✓ Preprocessed' : 'Preprocess Image'}
                    </button>
                    <button 
                      onClick={handleRemoveImage}
                      style={{ backgroundColor: '#dc3545', color: 'white' }}
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {/* Right: Metadata Form */}
                <div className="card">
                  <h2>Image Metadata</h2>
                  <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
                    Fill out the metadata for this image, then save to move to the next one.
                  </p>

                  {Object.entries(lookupTables).filter(([_, data]) => data.useForImageProcessing).length === 0 ? (
                    <p style={{ color: '#999', fontStyle: 'italic' }}>
                      No lookup tables configured for image processing.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {Object.entries(lookupTables)
                        .filter(([tableName, data]) => data.useForImageProcessing)
                        .map(([tableName, data]) => (
                        <div key={tableName} className="form-group">
                          <label>{data.label}</label>
                          <select
                            value={images[currentImageIndex].metadata[tableName] || ''}
                            onChange={(e) => updateCurrentImageMetadata(tableName, e.target.value)}
                          >
                            <option value="">-- Select --</option>
                            {data.entries
                              .slice()
                              .sort((a, b) => a.full_name.localeCompare(b.full_name))
                              .map(entry => (
                                <option key={entry.code} value={entry.code}>
                                  {entry.full_name}
                                </option>
                              ))
                            }
                          </select>
                        </div>
                      ))}

                      <div className="form-group">
                        <label>Environment Context (Optional)</label>
                        <input
                          type="text"
                          value={images[currentImageIndex].metadata.environment_context || ''}
                          onChange={(e) => updateCurrentImageMetadata('environment_context', e.target.value)}
                          placeholder="e.g., hangar, space, planet surface"
                        />
                      </div>

                      <div className="form-group">
                        <label>Specific Details (Optional)</label>
                        <textarea
                          value={images[currentImageIndex].metadata.specific_details || ''}
                          onChange={(e) => updateCurrentImageMetadata('specific_details', e.target.value)}
                          placeholder="e.g., weapons visible, landing gear extended"
                          rows="3"
                        />
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #dee2e6', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button 
                      onClick={generatePreview}
                      style={{ width: '100%' }}
                    >
                      Preview Context
                    </button>
                    
                    <button 
                      className="primary"
                      style={{ width: '100%' }}
                      onClick={saveCurrentImage}
                      disabled={loading}
                    >
                      {loading ? 'Saving...' : 'Save & Next →'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // Grid View
              <div>
                <div style={{ 
                  padding: '16px', 
                  backgroundColor: '#f8f9fa', 
                  borderRadius: '4px',
                  marginBottom: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <strong>Progress:</strong> {images.filter(img => img.saved).length} of {images.length} images saved
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    Click an image to edit its metadata
                  </div>
                </div>

                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '16px',
                  marginBottom: '20px'
                }}>
                  {images.map((image, index) => (
                    <div
                      key={index}
                      onClick={() => handleSelectImageFromGrid(index)}
                      style={{
                        position: 'relative',
                        cursor: 'pointer',
                        border: currentImageIndex === index ? '3px solid #007bff' : '2px solid #dee2e6',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        backgroundColor: '#f8f9fa',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (currentImageIndex !== index) {
                          e.currentTarget.style.borderColor = '#007bff'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (currentImageIndex !== index) {
                          e.currentTarget.style.borderColor = '#dee2e6'
                        }
                      }}
                    >
                      <div style={{
                        position: 'relative',
                        paddingBottom: '100%',
                        backgroundColor: '#000'
                      }}>
                        <img
                          src={image.preview}
                          alt={`Image ${index + 1}`}
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
                        {image.saved && (
                          <div style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            backgroundColor: '#28a745',
                            color: 'white',
                            borderRadius: '50%',
                            width: '30px',
                            height: '30px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '18px'
                          }}>
                            ✓
                          </div>
                        )}
                        {image.processed && (
                          <div style={{
                            position: 'absolute',
                            bottom: '8px',
                            left: '8px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: 'bold'
                          }}>
                            1024x1024
                          </div>
                        )}
                      </div>
                      <div style={{
                        padding: '8px',
                        fontSize: '12px',
                        color: '#666',
                        textAlign: 'center',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {image.file.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add More Images */}
            <div className="card" style={{ marginTop: '20px' }}>
              <h3>Add More Images</h3>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <label className="primary" style={{ cursor: 'pointer', display: 'inline-block', margin: 0 }}>
                  Browse Files
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                </label>
                <label className="primary" style={{ cursor: 'pointer', display: 'inline-block', margin: 0 }}>
                  Select Folder
                  <input
                    type="file"
                    webkitdirectory=""
                    directory=""
                    multiple
                    onChange={handleFolderSelect}
                    style={{ display: 'none' }}
                  />
                </label>
                <span style={{ color: '#666', fontSize: '14px' }}>
                  or drag and drop anywhere on the page
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowPreview(false)}
        >
          <div 
            className="card"
            style={{
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Context Preview</h2>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>
              This is what will be saved as the caption for this image:
            </p>
            <div style={{
              padding: '16px',
              backgroundColor: '#f8f9fa',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '14px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}>
              {previewText || '(No metadata entered yet)'}
            </div>
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowPreview(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Crop Modal */}
      {showCropModal && images[currentImageIndex] && (
        <CropModal
          image={images[currentImageIndex]}
          onSave={handleCropSave}
          onCancel={() => setShowCropModal(false)}
        />
      )}
    </>
  )
}