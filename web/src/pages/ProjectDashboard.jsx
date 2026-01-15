import { useParams, useNavigate, Link } from 'react-router-dom'
import ProjectNav from '../components/ProjectNav'

function ProjectDashboard() {
  const { projectName } = useParams()
  const navigate = useNavigate()

  return (
    <>
      <ProjectNav projectName={projectName} />
      <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Project: {projectName}</h1>
        <button onClick={() => navigate('/')}>Back to Projects</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/projects/${projectName}/artifacts`)}>
          <h2>Artifacts</h2>
          <p style={{ color: '#666', marginTop: '8px' }}>
            Manage vehicles, weapons, characters, and other training subjects
          </p>
        </div>

        <div className="card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/projects/${projectName}/import`)}>
          <h2>Import Images</h2>
          <p style={{ color: '#666', marginTop: '8px' }}>
            Process and caption training images
          </p>
        </div>

        <div className="card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/projects/${projectName}/lookups`)}>
          <h2>Lookup Tables</h2>
          <p style={{ color: '#666', marginTop: '8px' }}>
            Manage manufacturers, angles, lighting types, and more
          </p>
        </div>

        <div className="card" style={{ opacity: 0.5 }}>
          <h2>Export Dataset</h2>
          <p style={{ color: '#666', marginTop: '8px' }}>
            Export approved training data (Coming soon)
          </p>
        </div>
      </div>
    </div>
    </>
  )
}

export default ProjectDashboard