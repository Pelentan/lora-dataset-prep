import { useParams, useNavigate } from 'react-router-dom'

function ImageProcessor() {
  const { projectName } = useParams()
  const navigate = useNavigate()

  return (
    <div className="container">
      <h1>Image Import & Processing</h1>
      <p>Coming soon - image import queue and caption generation</p>
      <button onClick={() => navigate(`/projects/${projectName}`)}>Back</button>
    </div>
  )
}

export default ImageProcessor
