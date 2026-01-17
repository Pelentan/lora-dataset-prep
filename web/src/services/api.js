const API_BASE = '/api'

async function fetchJSON(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  return response.json()
}

export const api = {
  projects: {
    list: () => fetchJSON(`${API_BASE}/projects`),
    create: (name, universe) => 
      fetchJSON(`${API_BASE}/projects`, {
        method: 'POST',
        body: JSON.stringify({ name, universe }),
      }),
    delete: (name) =>
      fetchJSON(`${API_BASE}/projects`, {
        method: 'DELETE',
        body: JSON.stringify({ name }),
      }),
  },

  artifacts: {
    list: (projectName) => 
      fetchJSON(`${API_BASE}/projects/${projectName}/artifacts`),
    get: (projectName, artifactId) =>
      fetchJSON(`${API_BASE}/projects/${projectName}/artifacts/${artifactId}`),
    create: (projectName, artifact) =>
      fetchJSON(`${API_BASE}/projects/${projectName}/artifacts`, {
        method: 'POST',
        body: JSON.stringify(artifact),
      }),
    update: (projectName, artifactId, artifact) =>
      fetchJSON(`${API_BASE}/projects/${projectName}/artifacts/${artifactId}`, {
        method: 'PUT',
        body: JSON.stringify(artifact),
      }),
    delete: (projectName, artifactId) =>
      fetchJSON(`${API_BASE}/projects/${projectName}/artifacts/${artifactId}`, {
        method: 'DELETE',
      }),
  },

  images: {
    list: (projectName, artifactId = null) => {
      const url = artifactId
        ? `${API_BASE}/projects/${projectName}/images?artifact_id=${artifactId}`
        : `${API_BASE}/projects/${projectName}/images`
      return fetchJSON(url)
    },
    create: async (projectName, imageFile, metadata) => {
      const formData = new FormData()
      formData.append('image', imageFile)
      formData.append('metadata', JSON.stringify(metadata))
      
      const response = await fetch(`${API_BASE}/projects/${projectName}/images`, {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(error.error || `HTTP ${response.status}`)
      }
      
      return response.json()
    },
    get: (projectName, imageId) =>
      fetchJSON(`${API_BASE}/projects/${projectName}/images/${imageId}`),
    update: (projectName, imageId, image) =>
      fetchJSON(`${API_BASE}/projects/${projectName}/images/${imageId}`, {
        method: 'PUT',
        body: JSON.stringify(image),
      }),
    delete: (projectName, imageId) =>
      fetchJSON(`${API_BASE}/projects/${projectName}/images/${imageId}`, {
        method: 'DELETE',
      }),
    generateCaption: (projectName, imageId) =>
      fetchJSON(`${API_BASE}/projects/${projectName}/images/${imageId}/caption`, {
        method: 'POST',
      }),
  },

  lookups: {
    listTables: (projectName, artifactType) =>
      fetchJSON(`${API_BASE}/projects/${projectName}/lookup-tables${artifactType ? '?artifact_type=' + artifactType : ''}`),
    createTable: (projectName, tableName, template, isMultiSelect = false) =>
      fetchJSON(`${API_BASE}/projects/${projectName}/lookup-tables`, {
        method: 'POST',
        body: JSON.stringify({ table_name: tableName, template, is_multi_select: isMultiSelect }),
      }),
    deleteTable: (projectName, tableName) =>
      fetchJSON(`${API_BASE}/projects/${projectName}/lookup-tables`, {
        method: 'DELETE',
        body: JSON.stringify({ table_name: tableName }),
      }),
    clearTableData: (projectName, tableName) =>
      fetchJSON(`${API_BASE}/projects/${projectName}/lookup-tables/clear`, {
        method: 'POST',
        body: JSON.stringify({ table_name: tableName }),
      }),
    getSchema: (projectName, tableName) =>
      fetchJSON(`${API_BASE}/projects/${projectName}/lookups/${tableName}/schema`),
    updateArtifactTypes: (projectName, tableName, artifactTypes) =>
      fetchJSON(`${API_BASE}/projects/${projectName}/lookups/${tableName}/artifact-types`, {
        method: 'PUT',
        body: JSON.stringify({ artifact_types: artifactTypes }),
      }),
    updateConfig: (projectName, tableName, config) =>
      fetchJSON(`${API_BASE}/projects/${projectName}/lookups/${tableName}/config`, {
        method: 'PUT',
        body: JSON.stringify(config),
      }),
    addColumn: (projectName, tableName, columnName, columnType) =>
      fetchJSON(`${API_BASE}/projects/${projectName}/lookups/${tableName}/columns`, {
        method: 'POST',
        body: JSON.stringify({ column_name: columnName, column_type: columnType }),
      }),
    deleteColumn: (projectName, tableName, columnName) =>
      fetch(`${API_BASE}/projects/${projectName}/lookups/${tableName}/columns/${columnName}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      }).then(res => res.json()),
    updateDisplayName: (projectName, tableName, columnName, displayName) =>
      fetchJSON(`${API_BASE}/projects/${projectName}/lookups/${tableName}/columns/${columnName}/display-name`, {
        method: 'PUT',
        body: JSON.stringify({ display_name: displayName }),
      }),
    parseCSV: async (projectName, tableName, file) => {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch(`${API_BASE}/projects/${projectName}/lookups/${tableName}/import/parse`, {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Parse failed')
      }
      return response.json()
    },
    importCSV: async (projectName, tableName, file, mapping) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('mapping', JSON.stringify(mapping))
      const response = await fetch(`${API_BASE}/projects/${projectName}/lookups/${tableName}/import`, {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Import failed')
      }
      return response.json()
    },
    list: (projectName, tableName) =>
      fetchJSON(`${API_BASE}/projects/${projectName}/lookups/${tableName}`),
    get: (projectName, tableName, code) =>
      fetchJSON(`${API_BASE}/projects/${projectName}/lookups/${tableName}/${code}`),
    create: (projectName, tableName, data) =>
      fetchJSON(`${API_BASE}/projects/${projectName}/lookups/${tableName}`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (projectName, tableName, code, data) =>
      fetchJSON(`${API_BASE}/projects/${projectName}/lookups/${tableName}/${code}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (projectName, tableName, code) =>
      fetchJSON(`${API_BASE}/projects/${projectName}/lookups/${tableName}/${code}`, {
        method: 'DELETE',
      }),
  },
}