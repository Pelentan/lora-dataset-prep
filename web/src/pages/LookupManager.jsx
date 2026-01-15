import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import ProjectNav from '../components/ProjectNav'

// Map SQL types to user-friendly names
function getFriendlyTypeName(sqlType) {
  const typeMap = {
    'VARCHAR(20)': 'Text (20)',
    'VARCHAR(50)': 'Text (50)',
    'VARCHAR(100)': 'Text (100)',
    'TEXT': 'Text (1000)',
    'REAL': 'Number',
    'INTEGER': 'Number',
  }
  return typeMap[sqlType] || sqlType
}

// Order columns: code, full_name, description first, then alphabetical
function orderColumns(columns) {
  const standardOrder = ['code', 'full_name', 'description']
  const standard = []
  const custom = []
  
  columns.forEach(col => {
    if (standardOrder.includes(col)) {
      standard.push(col)
    } else {
      custom.push(col)
    }
  })
  
  // Sort standard columns by their defined order
  standard.sort((a, b) => standardOrder.indexOf(a) - standardOrder.indexOf(b))
  // Sort custom columns alphabetically
  custom.sort()
  
  return [...standard, ...custom]
}

function LookupManager() {
  const { projectName } = useParams()
  const navigate = useNavigate()
  
  const [tables, setTables] = useState([])
  const [activeTable, setActiveTable] = useState(null)
  const [activeTab, setActiveTab] = useState('data')
  const [entries, setEntries] = useState([])
  const [schema, setSchema] = useState([])
  const [artifactTypes, setArtifactTypes] = useState([])
  const [selectedArtifactTypes, setSelectedArtifactTypes] = useState([])
  const [allArtifactTypes, setAllArtifactTypes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showDialog, setShowDialog] = useState(false)
  const [editingEntry, setEditingEntry] = useState(null)
  const [formData, setFormData] = useState({})
  const [showCreateTableDialog, setShowCreateTableDialog] = useState(false)
  const [showDeleteTableDialog, setShowDeleteTableDialog] = useState(false)
  const [deleteTableConfirmation, setDeleteTableConfirmation] = useState('')
  const [newTableData, setNewTableData] = useState({ name: '', template: 'basic' })
  const [newColumnData, setNewColumnData] = useState({ name: '', type: 'text_100' })
  const [sortColumn, setSortColumn] = useState(null)
  const [sortDirection, setSortDirection] = useState('asc')
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [importStep, setImportStep] = useState(1) // 1: upload, 2: mapping
  const [csvHeaders, setCsvHeaders] = useState([])
  const [csvRowCount, setCsvRowCount] = useState(0)
  const [columnMapping, setColumnMapping] = useState({})
  const [editingDisplayName, setEditingDisplayName] = useState(null)

  useEffect(() => {
    loadTables()
    loadAllArtifactTypes()
  }, [projectName])

  useEffect(() => {
    if (activeTable) {
      if (activeTab === 'data') {
        loadEntries()
      } else if (activeTab === 'admin') {
        loadSchema()
      }
    }
  }, [activeTable, activeTab, projectName])

  async function loadTables() {
    try {
      const data = await api.lookups.listTables(projectName)
      const tableList = data.tables || []
      setTables(tableList)
      if (tableList.length > 0 && !activeTable) {
        setActiveTable(tableList[0])
      }
    } catch (err) {
      setError(err.message)
    }
  }

  async function loadAllArtifactTypes() {
    try {
      const data = await api.lookups.list(projectName, 'artifact_type_codes')
      setAllArtifactTypes((data.entries || []).map(e => ({ code: e.code, name: e.full_name })))
    } catch (err) {
      // artifact_type_codes might not exist yet, that's ok
    }
  }

  async function loadEntries() {
    if (!activeTable) return
    
    try {
      setLoading(true)
      setError(null)
      const data = await api.lookups.list(projectName, activeTable)
      setEntries(data.entries || [])
      setSortColumn(null)
      setSortDirection('asc')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadSchema() {
    if (!activeTable) return
    
    try {
      setLoading(true)
      setError(null)
      const data = await api.lookups.getSchema(projectName, activeTable)
      setSchema(data.columns || [])
      setSelectedArtifactTypes(data.artifact_types || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateTable(e) {
    e.preventDefault()
    try {
      await api.lookups.createTable(projectName, newTableData.name, newTableData.template)
      setShowCreateTableDialog(false)
      setNewTableData({ name: '', template: 'basic' })
      await loadTables()
      setActiveTable(newTableData.name)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDeleteTable() {
    if (deleteTableConfirmation !== activeTable) {
      setError('Table name does not match')
      return
    }

    try {
      await api.lookups.deleteTable(projectName, activeTable)
      setShowDeleteTableDialog(false)
      setDeleteTableConfirmation('')
      const newTables = tables.filter(t => t !== activeTable)
      setTables(newTables)
      setActiveTable(newTables.length > 0 ? newTables[0] : null)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleAddColumn(e) {
    e.preventDefault()
    try {
      await api.lookups.addColumn(projectName, activeTable, newColumnData.name, newColumnData.type)
      setNewColumnData({ name: '', type: 'text_100' })
      loadSchema()
      // Refresh data to show new column
      if (activeTab === 'data') {
        loadEntries()
      }
    } catch (err) {
      setError(err.message)
    }
  }

  function openAddDialog() {
    setEditingEntry(null)
    setFormData({})
    setShowDialog(true)
    // Load schema if not already loaded (needed for form fields)
    if (schema.length === 0) {
      loadSchema()
    }
  }

  function openEditDialog(entry) {
    setEditingEntry(entry)
    setFormData(entry)
    setShowDialog(true)
    // Load schema if not already loaded (needed for form fields)
    if (schema.length === 0) {
      loadSchema()
    }
  }

  async function handleSave() {
    try {
      if (editingEntry) {
        await api.lookups.update(projectName, activeTable, editingEntry.code, formData)
      } else {
        await api.lookups.create(projectName, activeTable, formData)
      }
      setShowDialog(false)
      setFormData({})
      loadEntries()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDelete(code) {
    if (!confirm(`Delete ${code}?`)) return
    
    try {
      await api.lookups.delete(projectName, activeTable, code)
      loadEntries()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleExport() {
    window.location.href = `/api/projects/${projectName}/lookups/${activeTable}/export`
  }

  async function handleParseCSV(e) {
    e.preventDefault()
    if (!importFile) return

    try {
      const result = await api.lookups.parseCSV(projectName, activeTable, importFile)
      setCsvHeaders(result.headers)
      setCsvRowCount(result.row_count)
      
      // Initialize mapping with smart defaults
      const defaultMapping = {}
      const tableColumns = schema.filter(s => s.name !== 'created_at').map(s => s.name)
      
      result.headers.forEach(csvHeader => {
        const lowerHeader = csvHeader.toLowerCase()
        // Try exact match first
        const exactMatch = tableColumns.find(tc => tc.toLowerCase() === lowerHeader)
        if (exactMatch) {
          defaultMapping[exactMatch] = csvHeader
        }
        // Try partial match
        else if (lowerHeader.includes('code')) {
          defaultMapping['code'] = csvHeader
        } else if (lowerHeader.includes('name')) {
          defaultMapping['full_name'] = csvHeader
        }
      })
      
      setColumnMapping(defaultMapping)
      setImportStep(2)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleImport(e) {
    e.preventDefault()

    // Validate required mappings
    if (!columnMapping['code'] || columnMapping['code'] === '(skip)') {
      setError('Code column must be mapped')
      return
    }
    if (!columnMapping['full_name'] || columnMapping['full_name'] === '(skip)') {
      setError('Full Name column must be mapped')
      return
    }

    try {
      const result = await api.lookups.importCSV(projectName, activeTable, importFile, columnMapping)
      setShowImportDialog(false)
      setImportFile(null)
      setImportStep(1)
      setCsvHeaders([])
      setColumnMapping({})
      
      const message = `Import complete: ${result.imported} imported, ${result.skipped} skipped`
      if (result.errors && result.errors.length > 0) {
        alert(message + '\n\nErrors:\n' + result.errors.slice(0, 5).join('\n'))
      } else {
        alert(message)
      }
      
      loadEntries()
    } catch (err) {
      setError(err.message)
    }
  }

  function resetImportDialog() {
    setShowImportDialog(false)
    setImportFile(null)
    setImportStep(1)
    setCsvHeaders([])
    setColumnMapping({})
  }

  async function handleDeleteColumn(columnName) {
    if (!confirm(`Delete column "${columnName}"? This will permanently remove the column and all its data.`)) return
    
    try {
      await api.lookups.deleteColumn(projectName, activeTable, columnName)
      loadSchema()
      if (activeTab === 'data') {
        loadEntries()
      }
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleUpdateDisplayName(columnName, displayName) {
    try {
      await api.lookups.updateDisplayName(projectName, activeTable, columnName, displayName)
      setEditingDisplayName(null)
      loadSchema()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleUpdateArtifactTypes() {
    try {
      await api.lookups.updateArtifactTypes(projectName, activeTable, selectedArtifactTypes)
      alert('Artifact type associations saved')
    } catch (err) {
      setError(err.message)
    }
  }

  function toggleArtifactType(code) {
    if (selectedArtifactTypes.includes(code)) {
      setSelectedArtifactTypes(selectedArtifactTypes.filter(c => c !== code))
    } else {
      setSelectedArtifactTypes([...selectedArtifactTypes, code])
    }
  }

  function handleSort(column) {
    if (sortColumn === column) {
      // Toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Get columns dynamically from first entry or schema
  const allColumns = entries.length > 0 
    ? Object.keys(entries[0]).filter(k => k !== 'created_at')
    : schema.filter(s => s.name !== 'created_at').map(s => s.name)
  
  const tableFields = orderColumns(allColumns)
  
  // Sort entries if a column is selected
  const sortedEntries = sortColumn ? [...entries].sort((a, b) => {
    const aVal = a[sortColumn] || ''
    const bVal = b[sortColumn] || ''
    
    // Determine if numeric based on column type from schema
    const columnSchema = schema.find(s => s.name === sortColumn)
    const isNumeric = columnSchema && (columnSchema.type === 'REAL' || columnSchema.type === 'INTEGER')
    
    if (isNumeric) {
      const aNum = parseFloat(aVal) || 0
      const bNum = parseFloat(bVal) || 0
      return sortDirection === 'asc' ? aNum - bNum : bNum - aNum
    } else {
      const comparison = String(aVal).localeCompare(String(bVal))
      return sortDirection === 'asc' ? comparison : -comparison
    }
  }) : entries
  
  const tableLabel = activeTable ? activeTable.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : ''

  return (
    <>
      <ProjectNav projectName={projectName} />
      <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Lookup Tables</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="primary" onClick={() => setShowCreateTableDialog(true)}>+ New Table</button>
          <button onClick={() => navigate(`/projects/${projectName}`)}>Back to Dashboard</button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {tables.length === 0 ? (
        <div className="card">
          <p style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
            No lookup tables found. This shouldn't happen - check database migrations.
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {tables.map(table => (
              <button
                key={table}
                onClick={() => {
                  setActiveTable(table)
                  setActiveTab('data')
                }}
                style={{
                  padding: '10px 16px',
                  backgroundColor: activeTable === table ? '#007bff' : '#fff',
                  color: activeTable === table ? '#fff' : '#000',
                  border: '1px solid #007bff',
                  borderRadius: '4px 4px 0 0',
                }}
              >
                {table.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </button>
            ))}
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>{tableLabel}</h2>
            </div>

            {/* Tabs for Data / Admin */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '2px solid #ddd' }}>
              <button
                onClick={() => setActiveTab('data')}
                style={{
                  padding: '10px 20px',
                  backgroundColor: activeTab === 'data' ? '#fff' : '#f5f5f5',
                  color: activeTab === 'data' ? '#007bff' : '#666',
                  border: 'none',
                  borderBottom: activeTab === 'data' ? '2px solid #007bff' : 'none',
                  cursor: 'pointer',
                  fontWeight: activeTab === 'data' ? 'bold' : 'normal',
                }}
              >
                Data
              </button>
              <button
                onClick={() => setActiveTab('admin')}
                style={{
                  padding: '10px 20px',
                  backgroundColor: activeTab === 'admin' ? '#fff' : '#f5f5f5',
                  color: activeTab === 'admin' ? '#007bff' : '#666',
                  border: 'none',
                  borderBottom: activeTab === 'admin' ? '2px solid #007bff' : 'none',
                  cursor: 'pointer',
                  fontWeight: activeTab === 'admin' ? 'bold' : 'normal',
                }}
              >
                Admin
              </button>
            </div>

            {/* Data Tab */}
            {activeTab === 'data' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '20px' }}>
                  <button onClick={() => setShowImportDialog(true)}>Import CSV</button>
                  <button onClick={handleExport}>Export CSV</button>
                  <button className="primary" onClick={openAddDialog}>Add New</button>
                </div>

                {loading ? (
                  <div className="loading">Loading...</div>
                ) : entries.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
                    No entries yet. Click "Add New" to create one.
                  </p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #ddd' }}>
                        {tableFields.map(field => {
                          const columnSchema = schema.find(s => s.name === field)
                          const displayName = columnSchema?.display_name || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                          
                          return (
                            <th 
                              key={field} 
                              onClick={() => handleSort(field)}
                              style={{ 
                                textAlign: 'left', 
                                padding: '12px', 
                                cursor: 'pointer',
                                userSelect: 'none',
                                position: 'relative',
                              }}
                            >
                              {displayName}
                              {sortColumn === field && (
                                <span style={{ marginLeft: '8px' }}>
                                  {sortDirection === 'asc' ? '▲' : '▼'}
                                </span>
                              )}
                            </th>
                          )
                        })}
                        <th style={{ textAlign: 'right', padding: '12px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedEntries.map(entry => (
                        <tr key={entry.code} style={{ borderBottom: '1px solid #eee' }}>
                          {tableFields.map(field => (
                            <td key={field} style={{ padding: '12px' }}>
                              {entry[field] || '-'}
                            </td>
                          ))}
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            <button onClick={() => openEditDialog(entry)} style={{ marginRight: '8px' }}>Edit</button>
                            <button onClick={() => handleDelete(entry.code)} style={{ color: '#dc3545' }}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}

            {/* Admin Tab */}
            {activeTab === 'admin' && (
              <>
                <h3>Table Schema</h3>
                <p style={{ color: '#666', marginBottom: '20px' }}>
                  Code and Full Name are always required. All other fields are optional.
                </p>
                
                {loading ? (
                  <div className="loading">Loading schema...</div>
                ) : (
                  <>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #ddd' }}>
                          <th style={{ textAlign: 'left', padding: '12px' }}>Column Name</th>
                          <th style={{ textAlign: 'left', padding: '12px' }}>Display Name</th>
                          <th style={{ textAlign: 'left', padding: '12px' }}>Type</th>
                          <th style={{ textAlign: 'right', padding: '12px' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {schema.filter(col => col.name !== 'created_at').map(col => {
                          const isRequired = col.name === 'code' || col.name === 'full_name'
                          const displayName = col.display_name || col.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                          
                          return (
                            <tr key={col.name} style={{ borderBottom: '1px solid #eee' }}>
                              <td style={{ padding: '12px' }}>
                                {col.name}
                                {isRequired && (
                                  <span style={{ marginLeft: '8px', color: '#007bff', fontSize: '12px' }}>*required</span>
                                )}
                              </td>
                              <td style={{ padding: '12px' }}>
                                {editingDisplayName === col.name ? (
                                  <div style={{ display: 'flex', gap: '4px' }}>
                                    <input
                                      type="text"
                                      defaultValue={col.display_name || ''}
                                      placeholder={col.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleUpdateDisplayName(col.name, e.target.value)
                                        } else if (e.key === 'Escape') {
                                          setEditingDisplayName(null)
                                        }
                                      }}
                                      autoFocus
                                      style={{ flex: 1 }}
                                    />
                                    <button 
                                      onClick={(e) => {
                                        const input = e.target.previousSibling
                                        handleUpdateDisplayName(col.name, input.value)
                                      }}
                                      style={{ padding: '4px 8px' }}
                                    >
                                      Save
                                    </button>
                                    <button 
                                      onClick={() => setEditingDisplayName(null)}
                                      style={{ padding: '4px 8px' }}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <span 
                                    onClick={() => setEditingDisplayName(col.name)}
                                    style={{ cursor: 'pointer', textDecoration: 'underline dotted' }}
                                    title="Click to edit display name"
                                  >
                                    {displayName}
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: '12px' }}>{getFriendlyTypeName(col.type)}</td>
                              <td style={{ padding: '12px', textAlign: 'right' }}>
                                {!isRequired && (
                                  <button 
                                    onClick={() => handleDeleteColumn(col.name)}
                                    style={{ color: '#dc3545' }}
                                  >
                                    Delete
                                  </button>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>

                    {allArtifactTypes.length > 0 && activeTable !== 'artifact_type_codes' && (
                      <div style={{ padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '4px', marginBottom: '30px' }}>
                        <h4>Used By Artifact Types</h4>
                        <p style={{ color: '#666', fontSize: '14px', marginBottom: '12px' }}>
                          Select which artifact types use this lookup table. If none are selected, it will be available for all types.
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px', marginTop: '12px' }}>
                          {allArtifactTypes.map(type => (
                            <label key={type.code} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={selectedArtifactTypes.includes(type.code)}
                                onChange={() => toggleArtifactType(type.code)}
                              />
                              <span>{type.name} ({type.code})</span>
                            </label>
                          ))}
                        </div>
                        <button 
                          onClick={handleUpdateArtifactTypes}
                          className="primary"
                          style={{ marginTop: '12px' }}
                        >
                          Save Artifact Type Associations
                        </button>
                      </div>
                    )}

                    <div style={{ padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '4px', marginBottom: '30px' }}>
                      <h4>Add Column</h4>
                      <form onSubmit={handleAddColumn} style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                        <input
                          type="text"
                          placeholder="Column name (e.g., weight_kg)"
                          value={newColumnData.name}
                          onChange={(e) => setNewColumnData({ ...newColumnData, name: e.target.value })}
                          pattern="[a-zA-Z0-9_]+"
                          title="Only letters, numbers, and underscores"
                          required
                          style={{ flex: '1' }}
                        />
                        <select
                          value={newColumnData.type}
                          onChange={(e) => setNewColumnData({ ...newColumnData, type: e.target.value })}
                        >
                          <option value="text_20">Text (20)</option>
                          <option value="text_50">Text (50)</option>
                          <option value="text_100">Text (100)</option>
                          <option value="text_1000">Text (1000)</option>
                          <option value="number">Number</option>
                        </select>
                        <button type="submit" className="primary">Add Column</button>
                      </form>
                    </div>

                    <div style={{ padding: '20px', backgroundColor: '#fff0f0', border: '1px solid #ffcccc', borderRadius: '4px' }}>
                      <h4 style={{ color: '#dc3545' }}>Danger Zone</h4>
                      <p style={{ color: '#666', marginBottom: '12px' }}>
                        Deleting this table will permanently remove all data. This cannot be undone.
                      </p>
                      <button
                        onClick={() => setShowDeleteTableDialog(true)}
                        style={{ backgroundColor: '#dc3545', color: 'white', border: 'none' }}
                      >
                        Delete Table
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Create Table Dialog */}
      {showCreateTableDialog && (
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
            <h3>Create New Lookup Table</h3>
            
            <form onSubmit={handleCreateTable} style={{ marginTop: '20px' }}>
              <div className="form-group">
                <label>Table Name</label>
                <input
                  type="text"
                  value={newTableData.name}
                  onChange={(e) => setNewTableData({ ...newTableData, name: e.target.value })}
                  placeholder="e.g., propulsion_types, weapon_classes"
                  pattern="[a-zA-Z0-9_]+"
                  title="Only letters, numbers, and underscores"
                  required
                />
                <small style={{ color: '#666', display: 'block', marginTop: '4px' }}>
                  Must end with _types, _codes, _states, or _roles (e.g., propulsion_types, vehicle_roles)
                </small>
              </div>

              <div className="form-group">
                <label>Template</label>
                <select
                  value={newTableData.template}
                  onChange={(e) => setNewTableData({ ...newTableData, template: e.target.value })}
                >
                  <option value="basic">Basic (code, name, description)</option>
                  <option value="with_category">With Category (adds category field)</option>
                  <option value="with_sort_order">With Sort Order (adds sort_order field)</option>
                  <option value="with_universe">With Universe (adds universe, founded_year)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '20px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowCreateTableDialog(false)}>Cancel</button>
                <button type="submit" className="primary">Create Table</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Table Dialog */}
      {showDeleteTableDialog && (
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
            <h3 style={{ color: '#dc3545' }}>⚠️ Delete Lookup Table</h3>
            
            <p style={{ marginTop: '16px', marginBottom: '16px' }}>
              This will permanently delete the table <strong>{activeTable}</strong> and all its data.
            </p>

            <p style={{ marginBottom: '16px', fontWeight: 'bold' }}>
              This action cannot be undone!
            </p>

            <div className="form-group">
              <label>Type the table name <strong>{activeTable}</strong> to confirm:</label>
              <input
                type="text"
                value={deleteTableConfirmation}
                onChange={(e) => setDeleteTableConfirmation(e.target.value)}
                placeholder={activeTable}
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button onClick={() => {
                setShowDeleteTableDialog(false)
                setDeleteTableConfirmation('')
              }}>Cancel</button>
              <button
                onClick={handleDeleteTable}
                disabled={deleteTableConfirmation !== activeTable}
                style={{
                  backgroundColor: deleteTableConfirmation === activeTable ? '#dc3545' : '#ccc',
                  color: 'white',
                  cursor: deleteTableConfirmation === activeTable ? 'pointer' : 'not-allowed',
                }}
              >
                Delete Table
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import CSV Dialog */}
      {showImportDialog && (
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
          <div className="card" style={{ maxWidth: '700px', width: '100%', margin: '20px', maxHeight: '80vh', overflow: 'auto' }}>
            <h3>Import CSV - Step {importStep} of 2</h3>
            
            {importStep === 1 ? (
              <form onSubmit={handleParseCSV} style={{ marginTop: '20px' }}>
                <p style={{ color: '#666', marginBottom: '16px' }}>
                  Upload a CSV file to import data into {activeTable}. Next, you'll map the CSV columns to your table columns.
                </p>
                
                <div className="form-group">
                  <label>Select CSV File</label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setImportFile(e.target.files[0])}
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '20px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={resetImportDialog}>Cancel</button>
                  <button type="submit" className="primary">Next: Map Columns</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleImport} style={{ marginTop: '20px' }}>
                <p style={{ color: '#666', marginBottom: '16px' }}>
                  CSV has {csvRowCount} rows. Map each table column to a CSV column:
                </p>
                
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #ddd' }}>
                      <th style={{ textAlign: 'left', padding: '12px' }}>Table Column</th>
                      <th style={{ textAlign: 'left', padding: '12px' }}>CSV Column</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schema.filter(col => col.name !== 'created_at').map(col => {
                      const isRequired = col.name === 'code' || col.name === 'full_name'
                      const displayName = col.display_name || col.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                      
                      return (
                        <tr key={col.name} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '12px' }}>
                            {displayName}
                            {isRequired && <span style={{ color: '#dc3545', marginLeft: '4px' }}>*</span>}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <select
                              value={columnMapping[col.name] || '(skip)'}
                              onChange={(e) => setColumnMapping({ ...columnMapping, [col.name]: e.target.value })}
                              style={{ width: '100%' }}
                              required={isRequired}
                            >
                              <option value="(skip)">(skip this column)</option>
                              {csvHeaders.map(header => (
                                <option key={header} value={header}>{header}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                <div style={{ display: 'flex', gap: '8px', marginTop: '20px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={resetImportDialog}>Cancel</button>
                  <button 
                    type="button" 
                    onClick={() => setImportStep(1)}
                    style={{ marginRight: 'auto' }}
                  >
                    ← Back
                  </button>
                  <button type="submit" className="primary">Import Data</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Add/Edit Entry Dialog */}
      {showDialog && (
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
          <div className="card" style={{ maxWidth: '500px', width: '100%', margin: '20px', maxHeight: '80vh', overflow: 'auto' }}>
            <h3>{editingEntry ? 'Edit Entry' : 'Add Entry'}</h3>
            
            <div style={{ marginTop: '20px' }}>
              {orderColumns(schema.filter(col => col.name !== 'created_at').map(s => s.name)).map(colName => {
                const col = schema.find(s => s.name === colName)
                return (
                  <div key={colName} className="form-group">
                    <label>
                      {colName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      {(colName === 'code' || colName === 'full_name') && <span style={{ color: '#dc3545' }}> *</span>}
                    </label>
                    <input
                      type={col.type === 'INTEGER' || col.type === 'REAL' ? 'number' : 'text'}
                      step={col.type === 'REAL' ? 'any' : undefined}
                      value={formData[colName] || ''}
                      onChange={(e) => setFormData({ ...formData, [colName]: e.target.value })}
                      disabled={editingEntry && colName === 'code'}
                      placeholder={colName === 'code' ? 'e.g., AEG, VEH, FRT' : ''}
                      required={colName === 'code' || colName === 'full_name'}
                    />
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowDialog(false)}>Cancel</button>
              <button className="primary" onClick={handleSave}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  )
}

export default LookupManager