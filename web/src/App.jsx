import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProjectSelector from './pages/ProjectSelector'
import ProjectDashboard from './pages/ProjectDashboard'
import ArtifactList from './pages/ArtifactList'
import ArtifactForm from './pages/ArtifactForm'
import ImageProcessor from './pages/ImageProcessor'
import LookupManager from './pages/LookupManager'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProjectSelector />} />
        <Route path="/projects/:projectName" element={<ProjectDashboard />} />
        <Route path="/projects/:projectName/artifacts" element={<ArtifactList />} />
        <Route path="/projects/:projectName/artifacts/new" element={<ArtifactForm />} />
        <Route path="/projects/:projectName/artifacts/:artifactId/edit" element={<ArtifactForm />} />
        <Route path="/projects/:projectName/import" element={<ImageProcessor />} />
        <Route path="/projects/:projectName/lookups" element={<LookupManager />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
