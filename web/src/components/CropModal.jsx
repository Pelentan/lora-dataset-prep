import { useState, useRef, useEffect } from 'react'

export default function CropModal({ image, onSave, onCancel }) {
  const canvasRef = useRef(null)
  const previewCanvasRef = useRef(null)
  const [imgElement, setImgElement] = useState(null)
  const [cropBox, setCropBox] = useState({ x: 50, y: 50, width: 400, height: 400 })
  const [dragging, setDragging] = useState(null) // 'move', 'nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    // Load image
    const img = new Image()
    img.onload = () => {
      setImgElement(img)
      
      // Calculate display dimensions (max 800px width/height)
      let displayWidth = img.width
      let displayHeight = img.height
      const maxDimension = 800
      
      if (img.width > maxDimension || img.height > maxDimension) {
        const scale = maxDimension / Math.max(img.width, img.height)
        displayWidth = img.width * scale
        displayHeight = img.height * scale
      }
      
      setImgDimensions({ width: displayWidth, height: displayHeight })
      
      // Initialize crop box to center square
      const size = Math.min(displayWidth, displayHeight) * 0.8
      setCropBox({
        x: (displayWidth - size) / 2,
        y: (displayHeight - size) / 2,
        width: size,
        height: size
      })
    }
    img.src = image.preview
  }, [image])

  useEffect(() => {
    if (!imgElement || !canvasRef.current) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    // Set canvas size
    canvas.width = imgDimensions.width
    canvas.height = imgDimensions.height
    
    // Draw image
    ctx.drawImage(imgElement, 0, 0, imgDimensions.width, imgDimensions.height)
    
    // Draw semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Clear crop area
    ctx.clearRect(cropBox.x, cropBox.y, cropBox.width, cropBox.height)
    ctx.drawImage(
      imgElement,
      (cropBox.x / imgDimensions.width) * imgElement.width,
      (cropBox.y / imgDimensions.height) * imgElement.height,
      (cropBox.width / imgDimensions.width) * imgElement.width,
      (cropBox.height / imgDimensions.height) * imgElement.height,
      cropBox.x,
      cropBox.y,
      cropBox.width,
      cropBox.height
    )
    
    // Draw crop box border
    ctx.strokeStyle = '#007bff'
    ctx.lineWidth = 2
    ctx.strokeRect(cropBox.x, cropBox.y, cropBox.width, cropBox.height)
    
    // Draw corner handles
    const handleSize = 12
    ctx.fillStyle = '#007bff'
    const corners = [
      { x: cropBox.x, y: cropBox.y }, // nw
      { x: cropBox.x + cropBox.width, y: cropBox.y }, // ne
      { x: cropBox.x, y: cropBox.y + cropBox.height }, // sw
      { x: cropBox.x + cropBox.width, y: cropBox.y + cropBox.height }, // se
    ]
    
    corners.forEach(corner => {
      ctx.fillRect(corner.x - handleSize / 2, corner.y - handleSize / 2, handleSize, handleSize)
    })
    
    // Draw edge handles
    ctx.fillRect(cropBox.x + cropBox.width / 2 - handleSize / 2, cropBox.y - handleSize / 2, handleSize, handleSize) // n
    ctx.fillRect(cropBox.x + cropBox.width / 2 - handleSize / 2, cropBox.y + cropBox.height - handleSize / 2, handleSize, handleSize) // s
    ctx.fillRect(cropBox.x - handleSize / 2, cropBox.y + cropBox.height / 2 - handleSize / 2, handleSize, handleSize) // w
    ctx.fillRect(cropBox.x + cropBox.width - handleSize / 2, cropBox.y + cropBox.height / 2 - handleSize / 2, handleSize, handleSize) // e
    
    // Update preview
    updatePreview()
  }, [imgElement, cropBox, imgDimensions])

  function updatePreview() {
    if (!imgElement || !previewCanvasRef.current) return
    
    const canvas = previewCanvasRef.current
    const ctx = canvas.getContext('2d')
    
    canvas.width = 256
    canvas.height = 256
    
    // Calculate source coordinates in original image
    const srcX = (cropBox.x / imgDimensions.width) * imgElement.width
    const srcY = (cropBox.y / imgDimensions.height) * imgElement.height
    const srcWidth = (cropBox.width / imgDimensions.width) * imgElement.width
    const srcHeight = (cropBox.height / imgDimensions.height) * imgElement.height
    
    // Clear canvas with black background
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, 256, 256)
    
    // Calculate letterbox dimensions
    const scale = Math.min(256 / srcWidth, 256 / srcHeight)
    const destWidth = srcWidth * scale
    const destHeight = srcHeight * scale
    const destX = (256 - destWidth) / 2
    const destY = (256 - destHeight) / 2
    
    // Draw letterboxed image
    ctx.drawImage(
      imgElement,
      srcX, srcY, srcWidth, srcHeight,
      destX, destY, destWidth, destHeight
    )
  }

  function handleMouseDown(e) {
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    const handleSize = 12
    
    // Check corners
    if (isNear(x, cropBox.x, handleSize) && isNear(y, cropBox.y, handleSize)) {
      setDragging('nw')
    } else if (isNear(x, cropBox.x + cropBox.width, handleSize) && isNear(y, cropBox.y, handleSize)) {
      setDragging('ne')
    } else if (isNear(x, cropBox.x, handleSize) && isNear(y, cropBox.y + cropBox.height, handleSize)) {
      setDragging('sw')
    } else if (isNear(x, cropBox.x + cropBox.width, handleSize) && isNear(y, cropBox.y + cropBox.height, handleSize)) {
      setDragging('se')
    }
    // Check edges
    else if (isNear(x, cropBox.x + cropBox.width / 2, handleSize) && isNear(y, cropBox.y, handleSize)) {
      setDragging('n')
    } else if (isNear(x, cropBox.x + cropBox.width / 2, handleSize) && isNear(y, cropBox.y + cropBox.height, handleSize)) {
      setDragging('s')
    } else if (isNear(x, cropBox.x, handleSize) && isNear(y, cropBox.y + cropBox.height / 2, handleSize)) {
      setDragging('w')
    } else if (isNear(x, cropBox.x + cropBox.width, handleSize) && isNear(y, cropBox.y + cropBox.height / 2, handleSize)) {
      setDragging('e')
    }
    // Check inside box for moving
    else if (x > cropBox.x && x < cropBox.x + cropBox.width && y > cropBox.y && y < cropBox.y + cropBox.height) {
      setDragging('move')
    }
    
    setDragStart({ x, y })
  }

  function handleMouseMove(e) {
    if (!dragging) return
    
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const dx = x - dragStart.x
    const dy = y - dragStart.y
    
    let newBox = { ...cropBox }
    
    if (dragging === 'move') {
      newBox.x = Math.max(0, Math.min(imgDimensions.width - cropBox.width, cropBox.x + dx))
      newBox.y = Math.max(0, Math.min(imgDimensions.height - cropBox.height, cropBox.y + dy))
    } else if (dragging === 'nw') {
      newBox.x = cropBox.x + dx
      newBox.y = cropBox.y + dy
      newBox.width = cropBox.width - dx
      newBox.height = cropBox.height - dy
    } else if (dragging === 'ne') {
      newBox.y = cropBox.y + dy
      newBox.width = cropBox.width + dx
      newBox.height = cropBox.height - dy
    } else if (dragging === 'sw') {
      newBox.x = cropBox.x + dx
      newBox.width = cropBox.width - dx
      newBox.height = cropBox.height + dy
    } else if (dragging === 'se') {
      newBox.width = cropBox.width + dx
      newBox.height = cropBox.height + dy
    } else if (dragging === 'n') {
      newBox.y = cropBox.y + dy
      newBox.height = cropBox.height - dy
    } else if (dragging === 's') {
      newBox.height = cropBox.height + dy
    } else if (dragging === 'w') {
      newBox.x = cropBox.x + dx
      newBox.width = cropBox.width - dx
    } else if (dragging === 'e') {
      newBox.width = cropBox.width + dx
    }
    
    // Constrain to canvas bounds and minimum size
    newBox.width = Math.max(50, Math.min(imgDimensions.width - newBox.x, newBox.width))
    newBox.height = Math.max(50, Math.min(imgDimensions.height - newBox.y, newBox.height))
    newBox.x = Math.max(0, Math.min(imgDimensions.width - newBox.width, newBox.x))
    newBox.y = Math.max(0, Math.min(imgDimensions.height - newBox.height, newBox.y))
    
    setCropBox(newBox)
    setDragStart({ x, y })
  }

  function handleMouseUp() {
    setDragging(null)
  }

  function isNear(a, b, threshold) {
    return Math.abs(a - b) < threshold
  }

  async function handleSave() {
    if (!imgElement) return
    
    // Create final 1024x1024 canvas
    const finalCanvas = document.createElement('canvas')
    finalCanvas.width = 1024
    finalCanvas.height = 1024
    const ctx = finalCanvas.getContext('2d')
    
    // Black background
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, 1024, 1024)
    
    // Calculate source coordinates in original image
    const srcX = (cropBox.x / imgDimensions.width) * imgElement.width
    const srcY = (cropBox.y / imgDimensions.height) * imgElement.height
    const srcWidth = (cropBox.width / imgDimensions.width) * imgElement.width
    const srcHeight = (cropBox.height / imgDimensions.height) * imgElement.height
    
    // Calculate letterbox dimensions
    const scale = Math.min(1024 / srcWidth, 1024 / srcHeight)
    const destWidth = srcWidth * scale
    const destHeight = srcHeight * scale
    const destX = (1024 - destWidth) / 2
    const destY = (1024 - destHeight) / 2
    
    // Draw letterboxed image
    ctx.drawImage(
      imgElement,
      srcX, srcY, srcWidth, srcHeight,
      destX, destY, destWidth, destHeight
    )
    
    // Convert to blob
    finalCanvas.toBlob(blob => {
      // Create new File object
      const processedFile = new File([blob], image.file.name, { type: 'image/png' })
      onSave(processedFile, {
        x: srcX,
        y: srcY,
        width: srcWidth,
        height: srcHeight
      })
    }, 'image/png')
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '20px',
        maxWidth: '90vw',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <h2>Crop & Preprocess Image</h2>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          Drag the crop box to select the area. Image will be letterboxed to 1024x1024.
        </p>
        
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ marginBottom: '8px' }}>Adjust Crop</h3>
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{ 
                border: '1px solid #dee2e6',
                cursor: dragging ? 'grabbing' : 'grab',
                display: 'block'
              }}
            />
          </div>
          
          <div>
            <h3 style={{ marginBottom: '8px' }}>Preview (1024x1024)</h3>
            <canvas
              ref={previewCanvasRef}
              style={{ 
                border: '1px solid #dee2e6',
                display: 'block',
                imageRendering: 'pixelated'
              }}
            />
            <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
              Black bars = letterboxing
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', marginTop: '20px', justifyContent: 'flex-end' }}>
          <button onClick={onCancel}>Cancel</button>
          <button onClick={handleSave} className="primary">Save & Use This Crop</button>
        </div>
      </div>
    </div>
  )
}