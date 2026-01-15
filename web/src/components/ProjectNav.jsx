import { useNavigate, useLocation } from 'react-router-dom'

function ProjectNav({ projectName }) {
  const navigate = useNavigate()
  const location = useLocation()

  const navItems = [
    { path: `/projects/${projectName}`, label: 'Dashboard' },
    { path: `/projects/${projectName}/artifacts`, label: 'Artifacts' },
    { path: `/projects/${projectName}/lookups`, label: 'Lookup Tables' },
    { path: `/projects/${projectName}/import`, label: 'Import Images' },
  ]

  // Determine current section
  const currentPath = location.pathname

  return (
    <div style={{
      backgroundColor: '#f8f9fa',
      borderBottom: '1px solid #dee2e6',
      padding: '12px 0',
      marginBottom: '20px'
    }}>
      <div className="container" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        {navItems.map(item => {
          // Dashboard should only match exact path, others can match sub-paths
          const isDashboard = item.path === `/projects/${projectName}`
          const isActive = isDashboard 
            ? currentPath === item.path
            : currentPath === item.path || currentPath.startsWith(item.path + '/')
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                padding: '8px 16px',
                backgroundColor: isActive ? '#007bff' : 'transparent',
                color: isActive ? 'white' : '#007bff',
                border: 'none',
                borderRadius: '4px',
                cursor: isActive ? 'default' : 'pointer',
                fontWeight: isActive ? 'bold' : 'normal',
              }}
              disabled={isActive}
            >
              {item.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default ProjectNav