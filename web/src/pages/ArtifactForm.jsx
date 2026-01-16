import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import ProjectNav from '../components/ProjectNav'

function ArtifactForm() {
  const { projectName, artifactId } = useParams()
  const navigate = useNavigate()
  const isEditing = !!artifactId

  const [formData, setFormData] = useState({
    artifact_type_code: '',
    name: '',
    description: '',
    // Physical properties (UI convenience - will be combined into JSON)
    length_m: '',
    width_m: '',
    height_m: '',
    mass_kg: '',
    // JSON fields
    additional_properties: '',
    tags: ''
  })

  // ID component selection - only tracks which tables to use
  const [idComponent1Table, setIdComponent1Table] = useState('')
  const [idComponent2Table, setIdComponent2Table] = useState('')

  // Static lookups (always loaded)
  const [artifactTypes, setArtifactTypes] = useState([])
  
  // Dynamic lookups (loaded based on artifact type) - stores both entries and metadata
  const [dynamicLookups, setDynamicLookups] = useState({})
  const [lookupConfigs, setLookupConfigs] = useState({}) // stores is_multi_select flags

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadStaticLookups()
    if (isEditing) {
      loadArtifact()
    }
  }, [projectName, artifactId])

  useEffect(() => {
    // When artifact type changes, reload relevant lookup tables
    if (formData.artifact_type_code) {
      loadDynamicLookups(formData.artifact_type_code)
    } else {
      setDynamicLookups({})
    }
  }, [formData.artifact_type_code])

  async function loadStaticLookups() {
    try {
      const artifactTypesData = await api.lookups.list(projectName, 'artifact_type_codes')
      setArtifactTypes(artifactTypesData.entries || [])
    } catch (err) {
      setError('Failed to load artifact types: ' + err.message)
    }
  }

  async function loadDynamicLookups(artifactTypeCode) {
    try {
      // Get tables for this artifact type
      const tablesData = await api.lookups.listTables(projectName, artifactTypeCode)
      const relevantTables = tablesData.tables || []

      // Load data and config for each relevant table
      const newDynamicLookups = {}
      const newLookupConfigs = {}
      
      for (const tableName of relevantTables) {
        // Skip only artifact_type_codes (that's truly static)
        if (tableName === 'artifact_type_codes') {
          continue
        }
        
        try {
          // Load entries
          const data = await api.lookups.list(projectName, tableName)
          newDynamicLookups[tableName] = data.entries || []
          
          // Load config (including is_multi_select)
          const schema = await api.lookups.getSchema(projectName, tableName)
          newLookupConfigs[tableName] = {
            isMultiSelect: schema.is_multi_select || false
          }
        } catch (err) {
          // Table might not have data yet, that's ok
        }
      }

      setDynamicLookups(newDynamicLookups)
      setLookupConfigs(newLookupConfigs)
    } catch (err) {
      // Some tables might not exist yet, that's ok
      setDynamicLookups({})
      setLookupConfigs({})
    }
  }

  async function loadArtifact() {
    try {
      setLoading(true)
      const artifact = await api.artifacts.get(projectName, artifactId)
      
      // Extract physical properties from JSON
      const physicalProps = artifact.physical_properties || {}
      
      // Convert arrays back to comma-separated strings for form
      setFormData({
        artifact_type_code: artifact.artifact_type_code || '',
        name: artifact.name || '',
        description: artifact.description || '',
        length_m: physicalProps.length_m || '',
        width_m: physicalProps.width_m || '',
        height_m: physicalProps.height_m || '',
        mass_kg: physicalProps.mass_kg || '',
        additional_properties: artifact.additional_properties ? JSON.stringify(artifact.additional_properties) : '',
        tags: artifact.tags ? artifact.tags.join(', ') : ''
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    
    try {
      setLoading(true)
      setError(null)

      // Build physical properties JSON from separate fields
      const physicalProperties = {}
      if (formData.length_m) physicalProperties.length_m = parseFloat(formData.length_m)
      if (formData.width_m) physicalProperties.width_m = parseFloat(formData.width_m)
      if (formData.height_m) physicalProperties.height_m = parseFloat(formData.height_m)
      if (formData.mass_kg) physicalProperties.mass_kg = parseFloat(formData.mass_kg)

      // Parse additional_properties if it's a string
      let additionalProperties = null
      if (formData.additional_properties) {
        try {
          additionalProperties = typeof formData.additional_properties === 'string'
            ? JSON.parse(formData.additional_properties)
            : formData.additional_properties
        } catch (e) {
          setError('Invalid JSON in Additional Properties')
          return
        }
      }

      // Prepare payload
      const payload = {
        artifact_type_code: formData.artifact_type_code,
        name: formData.name,
        description: formData.description || null,
        physical_properties: Object.keys(physicalProperties).length > 0 ? physicalProperties : null,
        additional_properties: additionalProperties,
        tags: formData.tags ? formData.tags.split(',').map(s => s.trim()).filter(Boolean) : null
      }

      // Add ID components for new artifacts - extract from additional_properties
      if (!isEditing) {
        payload.id_components = []
        
        // Get value for ID component 1
        if (idComponent1Table && additionalProperties && additionalProperties[idComponent1Table]) {
          const values = additionalProperties[idComponent1Table]
          if (Array.isArray(values) && values.length > 0) {
            payload.id_components.push(values[0])
          }
        }
        
        // Get value for ID component 2
        if (idComponent2Table && additionalProperties && additionalProperties[idComponent2Table]) {
          const values = additionalProperties[idComponent2Table]
          if (Array.isArray(values) && values.length > 0) {
            payload.id_components.push(values[0])
          }
        }
      }

      if (isEditing) {
        await api.artifacts.update(projectName, artifactId, payload)
      } else {
        await api.artifacts.create(projectName, payload)
      }

      navigate(`/projects/${projectName}/artifacts`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleChange(field, value) {
    setFormData({ ...formData, [field]: value })
    
    // Reset ID component table selections when artifact type changes
    if (field === 'artifact_type_code') {
      setIdComponent1Table('')
      setIdComponent2Table('')
    }
  }

  function generateIdPreview() {
    const parts = []
    if (formData.artifact_type_code) {
      parts.push(formData.artifact_type_code)
    }
    
    // Extract values from additional_properties based on selected ID component tables
    try {
      if (formData.additional_properties) {
        const additionalProps = typeof formData.additional_properties === 'string' 
          ? JSON.parse(formData.additional_properties)
          : formData.additional_properties
        
        // Get value for ID component 1
        if (idComponent1Table && additionalProps[idComponent1Table]) {
          const values = additionalProps[idComponent1Table]
          if (Array.isArray(values) && values.length > 0) {
            parts.push(values[0])
          }
        }
        
        // Get value for ID component 2
        if (idComponent2Table && additionalProps[idComponent2Table]) {
          const values = additionalProps[idComponent2Table]
          if (Array.isArray(values) && values.length > 0) {
            parts.push(values[0])
          }
        }
      }
    } catch (e) {
      // Invalid JSON, ignore
    }
    
    return parts.length > 0 ? parts.join('-') : 'Select artifact type to preview ID'
  }

  function handleSingleSelectChange(tableName, value) {
    // Get current additional_properties
    let additionalProps = {}
    try {
      if (formData.additional_properties) {
        additionalProps = typeof formData.additional_properties === 'string' 
          ? JSON.parse(formData.additional_properties)
          : formData.additional_properties
      }
    } catch (e) {
      additionalProps = {}
    }

    // Update with single value (stored as array for consistency)
    if (value) {
      additionalProps[tableName] = [value]
    } else {
      delete additionalProps[tableName]
    }

    setFormData({ 
      ...formData, 
      additional_properties: Object.keys(additionalProps).length > 0 
        ? JSON.stringify(additionalProps) 
        : ''
    })
  }

  function handleMultiSelectChange(tableName, code, checked) {
    // Get current additional_properties
    let additionalProps = {}
    try {
      if (formData.additional_properties) {
        additionalProps = typeof formData.additional_properties === 'string' 
          ? JSON.parse(formData.additional_properties)
          : formData.additional_properties
      }
    } catch (e) {
      additionalProps = {}
    }

    // Get current array for this table
    const currentValues = additionalProps[tableName] || []
    
    // Add or remove the code
    let newValues
    if (checked) {
      newValues = [...currentValues, code]
    } else {
      newValues = currentValues.filter(v => v !== code)
    }

    // Update additional_properties
    const newAdditionalProps = {
      ...additionalProps,
      [tableName]: newValues.length > 0 ? newValues : undefined
    }

    // Clean up empty entries
    Object.keys(newAdditionalProps).forEach(key => {
      if (newAdditionalProps[key] === undefined) {
        delete newAdditionalProps[key]
      }
    })

    setFormData({ 
      ...formData, 
      additional_properties: Object.keys(newAdditionalProps).length > 0 
        ? JSON.stringify(newAdditionalProps) 
        : ''
    })
  }

  function isMultiSelectValueChecked(tableName, code) {
    try {
      if (!formData.additional_properties) return false
      const additionalProps = typeof formData.additional_properties === 'string' 
        ? JSON.parse(formData.additional_properties)
        : formData.additional_properties
      const values = additionalProps[tableName] || []
      return values.includes(code)
    } catch (e) {
      return false
    }
  }

  function renderLookupField(tableName, entries, label) {
    const config = lookupConfigs[tableName]
    const isMulti = config?.isMultiSelect || false

    if (isMulti) {
      // Render as checkboxes
      return (
        <div className="form-group">
          <label>{label}</label>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
            gap: '8px',
            padding: '12px',
            backgroundColor: '#f9f9f9',
            borderRadius: '4px',
            maxHeight: '200px',
            overflowY: 'auto'
          }}>
            {entries
              .slice()
              .sort((a, b) => a.full_name.localeCompare(b.full_name))
              .map(entry => (
              <label 
                key={entry.code} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                <input
                  type="checkbox"
                  checked={isMultiSelectValueChecked(tableName, entry.code)}
                  onChange={(e) => handleMultiSelectChange(tableName, entry.code, e.target.checked)}
                />
                <span>{entry.full_name}</span>
              </label>
            ))}
          </div>
        </div>
      )
    } else {
      // Render as dropdown - single select stored in additional_properties
      // Get current value from additional_properties
      let currentValue = ''
      try {
        if (formData.additional_properties) {
          const additionalProps = typeof formData.additional_properties === 'string' 
            ? JSON.parse(formData.additional_properties)
            : formData.additional_properties
          const values = additionalProps[tableName]
          if (Array.isArray(values) && values.length > 0) {
            currentValue = values[0]
          }
        }
      } catch (e) {
        currentValue = ''
      }

      return (
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>{label}</label>
          <select
            value={currentValue}
            onChange={(e) => handleSingleSelectChange(tableName, e.target.value)}
          >
            <option value="">-- Select --</option>
            {entries
              .slice()
              .sort((a, b) => a.full_name.localeCompare(b.full_name))
              .map(entry => (
              <option key={entry.code} value={entry.code}>
                {entry.full_name}
              </option>
            ))}
          </select>
        </div>
      )
    }
  }

  if (loading && isEditing) {
    return <div className="loading">Loading artifact...</div>
  }

  return (
    <>
      <ProjectNav projectName={projectName} />
      <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>{isEditing ? 'Edit Artifact' : 'Create Artifact'}</h1>
        <button onClick={() => navigate(`/projects/${projectName}/artifacts`)}>
          Back to Artifacts
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="card">
          <h2>Artifact Details</h2>
          
          {/* Basic Information */}
          <div className="form-group">
            <label>
              Name <span style={{ color: '#dc3545' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., Javelin, Gladius, Hornet"
              required
            />
          </div>

          {/* Artifact Type and ID Components */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isEditing ? '1fr 2fr' : '200px 200px 200px 1fr',
            gap: '12px',
            alignItems: 'end',
            marginBottom: '16px'
          }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>
                Artifact Type <span style={{ color: '#dc3545' }}>*</span>
              </label>
              <select
                value={formData.artifact_type_code}
                onChange={(e) => handleChange('artifact_type_code', e.target.value)}
                required
                disabled={isEditing}
              >
                <option value="">-- Select --</option>
                {artifactTypes.map(type => (
                  <option key={type.code} value={type.code}>
                    {type.full_name}
                  </option>
                ))}
              </select>
            </div>

            {!isEditing && formData.artifact_type_code && (
              <>
                {/* ID Component 1 - Table Selection */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>ID Part 1 Table</label>
                  <select
                    value={idComponent1Table}
                    onChange={(e) => setIdComponent1Table(e.target.value)}
                  >
                    <option value="">-- None --</option>
                    {Object.keys(dynamicLookups)
                      .sort((a, b) => {
                        const labelA = a.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                        const labelB = b.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                        return labelA.localeCompare(labelB)
                      })
                      .map(tableName => (
                        <option key={tableName} value={tableName}>
                          {tableName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </option>
                      ))
                    }
                  </select>
                </div>

                {/* ID Component 2 - Table Selection */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>ID Part 2 Table</label>
                  <select
                    value={idComponent2Table}
                    onChange={(e) => setIdComponent2Table(e.target.value)}
                  >
                    <option value="">-- None --</option>
                    {Object.keys(dynamicLookups)
                      .filter(tableName => tableName !== idComponent1Table)
                      .sort((a, b) => {
                        const labelA = a.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                        const labelB = b.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                        return labelA.localeCompare(labelB)
                      })
                      .map(tableName => (
                        <option key={tableName} value={tableName}>
                          {tableName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </option>
                      ))
                    }
                  </select>
                </div>

                {/* ID Preview */}
                <div style={{ 
                  padding: '8px 12px', 
                  backgroundColor: '#f0f0f0', 
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  alignSelf: 'center'
                }}>
                  <strong>ID:</strong> {generateIdPreview()}
                </div>
              </>
            )}

            {isEditing && artifactId && (
              <div style={{ 
                padding: '8px 12px', 
                backgroundColor: '#f0f0f0', 
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '14px'
              }}>
                <strong>ID:</strong> {artifactId}
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="General description of the artifact..."
              rows="3"
            />
          </div>

          {/* Dynamic Lookups - show all lookup tables for selected artifact type */}
          {Object.keys(dynamicLookups).length > 0 && (
            <div style={{ marginTop: '16px' }}>
              {/* Single-select dropdowns in a grid */}
              {(() => {
                const singleSelectLookups = Object.entries(dynamicLookups)
                  .filter(([tableName, entries]) => 
                    entries.length > 0 && !(lookupConfigs[tableName]?.isMultiSelect)
                  )
                  .sort((a, b) => {
                    // Sort alphabetically by display name
                    const labelA = a[0].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                    const labelB = b[0].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                    return labelA.localeCompare(labelB)
                  })
                
                if (singleSelectLookups.length > 0) {
                  return (
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                      gap: '16px',
                      marginBottom: '16px'
                    }}>
                      {singleSelectLookups.map(([tableName, entries]) => (
                        <div key={tableName}>
                          {renderLookupField(tableName, entries, tableName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))}
                        </div>
                      ))}
                    </div>
                  )
                }
                return null
              })()}

              {/* Multi-select checkboxes in single column */}
              {Object.entries(dynamicLookups)
                .filter(([tableName, entries]) => {
                  const isMultiSelect = lookupConfigs[tableName]?.isMultiSelect
                  return entries.length > 0 && isMultiSelect
                })
                .sort((a, b) => {
                  // Sort alphabetically by display name
                  const labelA = a[0].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                  const labelB = b[0].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                  return labelA.localeCompare(labelB)
                })
                .map(([tableName, entries]) => (
                  <div key={tableName} style={{ marginBottom: '16px' }}>
                    {renderLookupField(tableName, entries, tableName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))}
                  </div>
                ))}
            </div>
          )}

          {/* Physical Properties */}
          <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #dee2e6' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>Physical Properties</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>Length (m)</label>
                <input
                  type="number"
                  step="any"
                  value={formData.length_m}
                  onChange={(e) => handleChange('length_m', e.target.value)}
                  placeholder="0.0"
                />
              </div>

              <div className="form-group">
                <label>Width (m)</label>
                <input
                  type="number"
                  step="any"
                  value={formData.width_m}
                  onChange={(e) => handleChange('width_m', e.target.value)}
                  placeholder="0.0"
                />
              </div>

              <div className="form-group">
                <label>Height (m)</label>
                <input
                  type="number"
                  step="any"
                  value={formData.height_m}
                  onChange={(e) => handleChange('height_m', e.target.value)}
                  placeholder="0.0"
                />
              </div>

              <div className="form-group">
                <label>Mass (kg)</label>
                <input
                  type="number"
                  step="any"
                  value={formData.mass_kg}
                  onChange={(e) => handleChange('mass_kg', e.target.value)}
                  placeholder="0.0"
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #dee2e6' }}>
            <div className="form-group">
              <label>Tags</label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => handleChange('tags', e.target.value)}
                placeholder="military, heavy-armor, capital-ship (comma-separated)"
              />
              <small style={{ color: '#666', display: 'block', marginTop: '8px', lineHeight: '1.5' }}>
                <strong>Tags vs. Lookup Tables:</strong> Use lookup tables for standardized, searchable attributes 
                that apply consistently across artifacts (like manufacturer, vehicle type, or scale). 
                Use tags for informal descriptors, one-off characteristics, or contextual notes that don't need 
                their own lookup table (e.g., "iconic", "fan-favorite", "prototype", "early-concept").
              </small>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '20px', justifyContent: 'flex-end' }}>
          <button 
            type="button" 
            onClick={() => navigate(`/projects/${projectName}/artifacts`)}
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="primary"
            disabled={loading}
          >
            {loading ? 'Saving...' : (isEditing ? 'Update Artifact' : 'Create Artifact')}
          </button>
        </div>
      </form>
    </div>
    </>
  )
}

export default ArtifactForm