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
    manufacturer_code: '',
    universe: '',
    name: '',
    description: '',
    length_m: '',
    width_m: '',
    height_m: '',
    mass_kg: '',
    scale_category: '',
    primary_colors: '',
    materials: '',
    vehicle_type: '',
    vehicle_role: '',
    typical_environment: '',
    era: '',
    additional_properties: '',
    tags: ''
  })

  // Static lookups (always loaded)
  const [artifactTypes, setArtifactTypes] = useState([])
  
  // Dynamic lookups (loaded based on artifact type)
  const [dynamicLookups, setDynamicLookups] = useState({})

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

      // Load data for each relevant table
      const newDynamicLookups = {}
      
      for (const tableName of relevantTables) {
        // Skip only artifact_type_codes (that's truly static)
        if (tableName === 'artifact_type_codes') {
          continue
        }
        
        try {
          const data = await api.lookups.list(projectName, tableName)
          newDynamicLookups[tableName] = data.entries || []
        } catch (err) {
          // Table might not have data yet, that's ok
        }
      }

      setDynamicLookups(newDynamicLookups)
    } catch (err) {
      // Some tables might not exist yet, that's ok
      setDynamicLookups({})
    }
  }

  async function loadArtifact() {
    try {
      setLoading(true)
      const artifact = await api.artifacts.get(projectName, artifactId)
      
      // Convert arrays back to comma-separated strings for form
      setFormData({
        ...artifact,
        primary_colors: artifact.primary_colors || '',
        materials: artifact.materials || '',
        tags: artifact.tags || ''
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

      // Prepare payload - convert comma-separated strings to arrays
      const payload = {
        ...formData,
        primary_colors: formData.primary_colors ? formData.primary_colors.split(',').map(s => s.trim()) : null,
        materials: formData.materials ? formData.materials.split(',').map(s => s.trim()) : null,
        tags: formData.tags ? formData.tags.split(',').map(s => s.trim()) : null,
        // Convert empty strings to null for optional numeric fields
        length_m: formData.length_m ? parseFloat(formData.length_m) : null,
        width_m: formData.width_m ? parseFloat(formData.width_m) : null,
        height_m: formData.height_m ? parseFloat(formData.height_m) : null,
        mass_kg: formData.mass_kg ? parseFloat(formData.mass_kg) : null,
        // Convert empty strings to null for optional text fields
        manufacturer_code: formData.manufacturer_code || null,
        description: formData.description || null,
        scale_category: formData.scale_category || null,
        vehicle_type: formData.vehicle_type || null,
        vehicle_role: formData.vehicle_role || null,
        typical_environment: formData.typical_environment || null,
        era: formData.era || null,
        additional_properties: formData.additional_properties || null
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
          <h2>Basic Information</h2>
          
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>
                Artifact Type <span style={{ color: '#dc3545' }}>*</span>
              </label>
              <select
                value={formData.artifact_type_code}
                onChange={(e) => handleChange('artifact_type_code', e.target.value)}
                required
              >
                <option value="">-- Select Type --</option>
                {artifactTypes.map(type => (
                  <option key={type.code} value={type.code}>
                    {type.full_name}
                  </option>
                ))}
              </select>
            </div>

            {dynamicLookups.manufacturer_codes && dynamicLookups.manufacturer_codes.length > 0 && (
              <div className="form-group">
                <label>Manufacturer</label>
                <select
                  value={formData.manufacturer_code || ''}
                  onChange={(e) => handleChange('manufacturer_code', e.target.value)}
                >
                  <option value="">-- None --</option>
                  {dynamicLookups.manufacturer_codes.map(mfr => (
                    <option key={mfr.code} value={mfr.code}>
                      {mfr.full_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Dynamic lookups appear here */}
          {dynamicLookups.vehicle_types && dynamicLookups.vehicle_types.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '0' }}>
              <div className="form-group">
                <label>Vehicle Type</label>
                <select
                  value={formData.vehicle_type || ''}
                  onChange={(e) => handleChange('vehicle_type', e.target.value)}
                >
                  <option value="">-- Select --</option>
                  {dynamicLookups.vehicle_types.map(type => (
                    <option key={type.code} value={type.code}>
                      {type.full_name}
                    </option>
                  ))}
                </select>
              </div>

              {dynamicLookups.vehicle_roles && dynamicLookups.vehicle_roles.length > 0 && (
                <div className="form-group">
                  <label>Vehicle Role</label>
                  <select
                    value={formData.vehicle_role || ''}
                    onChange={(e) => handleChange('vehicle_role', e.target.value)}
                  >
                    <option value="">-- Select --</option>
                    {dynamicLookups.vehicle_roles.map(role => (
                      <option key={role.code} value={role.code}>
                        {role.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <div className="form-group">
            <label>
              Universe <span style={{ color: '#dc3545' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.universe}
              onChange={(e) => handleChange('universe', e.target.value)}
              placeholder="e.g., Star Citizen, Elite Dangerous"
              required
            />
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
        </div>

        <div className="card" style={{ marginTop: '20px' }}>
          <h2>Physical Properties</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
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
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
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

            <div className="form-group">
              <label>Scale Category</label>
              <select
                value={formData.scale_category || ''}
                onChange={(e) => handleChange('scale_category', e.target.value)}
              >
                <option value="">-- Select --</option>
                <option value="handheld">Handheld</option>
                <option value="person">Person-sized</option>
                <option value="vehicle">Vehicle</option>
                <option value="building">Building</option>
                <option value="massive">Massive</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: '20px' }}>
          <h2>Visual Properties</h2>
          
          <div className="form-group">
            <label>Primary Colors</label>
            <input
              type="text"
              value={formData.primary_colors}
              onChange={(e) => handleChange('primary_colors', e.target.value)}
              placeholder="gunmetal grey, red striping (comma-separated)"
            />
            <small style={{ color: '#666', display: 'block', marginTop: '4px' }}>
              Enter multiple colors separated by commas
            </small>
          </div>

          <div className="form-group">
            <label>Materials</label>
            <input
              type="text"
              value={formData.materials}
              onChange={(e) => handleChange('materials', e.target.value)}
              placeholder="durasteel, composite armor (comma-separated)"
            />
            <small style={{ color: '#666', display: 'block', marginTop: '4px' }}>
              Enter multiple materials separated by commas
            </small>
          </div>
        </div>

        <div className="card" style={{ marginTop: '20px' }}>
          <h2>Additional Details</h2>
          
          <div className="form-group">
            <label>Typical Environment</label>
            <input
              type="text"
              value={formData.typical_environment}
              onChange={(e) => handleChange('typical_environment', e.target.value)}
              placeholder="e.g., space, atmospheric, ground"
            />
          </div>

          <div className="form-group">
            <label>Era/Time Period</label>
            <input
              type="text"
              value={formData.era}
              onChange={(e) => handleChange('era', e.target.value)}
              placeholder="e.g., 2950s, Modern Era"
            />
          </div>

          <div className="form-group">
            <label>Additional Properties (JSON)</label>
            <textarea
              value={formData.additional_properties}
              onChange={(e) => handleChange('additional_properties', e.target.value)}
              placeholder='{"crew": 12, "cargo": 5400}'
              rows="3"
            />
            <small style={{ color: '#666', display: 'block', marginTop: '4px' }}>
              Optional: Enter as valid JSON
            </small>
          </div>

          <div className="form-group">
            <label>Tags</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => handleChange('tags', e.target.value)}
              placeholder="capital ship, military, heavy armor (comma-separated)"
            />
            <small style={{ color: '#666', display: 'block', marginTop: '4px' }}>
              Enter multiple tags separated by commas
            </small>
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