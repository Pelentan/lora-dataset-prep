# Installation Guide

Get the LoRA Dataset Preparation Tool up and running on your system in minutes.

## Prerequisites

### Option 1: Docker (Recommended)

**Required:**
- Docker Desktop (Windows/Mac) or Docker Engine (Linux)
- Docker Compose (included with Docker Desktop)
- 2GB free disk space minimum

**System Requirements:**
- Any modern OS (Windows 10+, macOS 10.14+, Linux)
- 4GB RAM minimum (8GB recommended)
- Modern web browser (Chrome, Firefox, Edge, Safari)

### Option 2: Manual Installation

**Required:**
- Go 1.23 or later
- Node.js 18+ and npm
- 2GB free disk space minimum

## Installation Steps

### Docker Installation (Recommended)

1. **Install Docker Desktop**

   **Windows:** Download from [docker.com](https://www.docker.com/products/docker-desktop/)  
   **Mac:** Download from [docker.com](https://www.docker.com/products/docker-desktop/)  
   **Linux:**
   ```bash
   # Ubuntu/Debian
   sudo apt-get update
   sudo apt-get install docker.io docker-compose-plugin
   
   # Add your user to docker group
   sudo usermod -aG docker $USER
   # Log out and back in for this to take effect
   ```

2. **Clone the Repository**

   ```bash
   git clone https://github.com/yourusername/lora-prep.git
   cd lora-prep
   ```

3. **Start the Application**

   ```bash
   docker compose up --build
   ```

   This will:
   - Build the frontend
   - Build the backend
   - Create the container
   - Start the server on port 8080

   First build takes 2-3 minutes. Subsequent starts are instant.

4. **Access the Application**

   Open your browser to: **http://localhost:8080**

5. **Stop the Application**

   Press `Ctrl+C` in the terminal, or run:
   ```bash
   docker compose down
   ```

### Manual Installation

If you prefer to run without Docker:

1. **Install Go**

   Download from [go.dev](https://go.dev/dl/)
   
   Verify installation:
   ```bash
   go version  # Should show 1.23 or later
   ```

2. **Install Node.js**

   Download from [nodejs.org](https://nodejs.org/)
   
   Verify installation:
   ```bash
   node --version  # Should show v18 or later
   npm --version
   ```

3. **Clone and Setup**

   ```bash
   git clone https://github.com/yourusername/lora-prep.git
   cd lora-prep
   
   # Install Go dependencies
   go mod download
   
   # Install frontend dependencies
   cd web
   npm install
   cd ..
   ```

4. **Build Frontend**

   ```bash
   cd web
   npm run build
   cd ..
   ```

5. **Run the Application**

   ```bash
   go run cmd/server/main.go
   ```

6. **Access the Application**

   Open your browser to: **http://localhost:8080**

## Post-Installation

### Create Your First Project

1. Click "Create New Project"
2. Enter a project name (e.g., "star-citizen", "fantasy-world")
3. Click "Create"

This creates:
- `projects/{project-name}/` directory
- SQLite database with schema
- Seeded lookup tables
- Empty image folders

### Configure Lookup Tables

Navigate to **Lookup Tables** to customize:
- Artifact types (vehicles, characters, etc.)
- Manufacturers/creators
- Camera angles
- Lighting conditions
- Material types
- And more...

All lookup tables come pre-seeded with sensible defaults.

## Troubleshooting

### Docker Issues

**"Port 8080 already in use"**
```bash
# Find what's using port 8080
docker ps
# or on Linux/Mac
lsof -i :8080

# Stop the conflicting service or change port in docker-compose.yml
```

**"Cannot connect to Docker daemon"**
```bash
# Make sure Docker Desktop is running (Windows/Mac)
# or Docker service is started (Linux)
sudo systemctl start docker  # Linux only
```

**"Permission denied" errors**
```bash
# Linux: Add your user to docker group
sudo usermod -aG docker $USER
# Log out and back in
```

### Manual Installation Issues

**"Go command not found"**
- Make sure Go is installed and in your PATH
- Restart your terminal after installation

**"npm command not found"**
- Make sure Node.js is installed
- Restart your terminal after installation

**"Port 8080 already in use"**
- Change the port in `cmd/server/main.go`
- Look for: `http.ListenAndServe(":8080", r)`

### Database Issues

**"Database locked" errors**
- Only one process can write to SQLite at a time
- Make sure you don't have multiple instances running

**Want to reset everything?**
```bash
# Delete all projects and start fresh
rm -rf projects/
```

## Updating

### Docker

```bash
git pull
docker compose down
docker compose up --build
```

### Manual

```bash
git pull
cd web
npm install
npm run build
cd ..
go mod download
go run cmd/server/main.go
```

## Data Storage

All your data is stored in the `projects/` directory:

```
projects/
└── {project-name}/
    ├── project.db         # SQLite database
    ├── images/
    │   ├── raw/          # Original images (optional)
    │   └── training/     # Processed 1024x1024 images + captions
    └── exports/          # ZIP files for training
```

**Backup Strategy:**
- The entire `projects/` folder is self-contained
- Copy/backup this folder to preserve your work
- Database is portable SQLite format

## Performance Tips

- **RAM**: 8GB recommended for processing large image batches
- **Storage**: Plan ~2GB per 1000 training images
- **Browser**: Chrome/Edge recommended for best performance
- **Docker**: Allocate at least 4GB RAM to Docker Desktop

## Next Steps

Now that you're installed, head to the [User Guide](USER_GUIDE.md) to learn how to:
- Create and manage artifacts
- Import and process images
- Generate captions
- Export training datasets

## Getting Help

- Check the [User Guide](USER_GUIDE.md) for usage questions
- See [AI Development Story](AI_DEVELOPMENT.md) for architectural details
- Open an issue on GitHub for bugs or feature requests
