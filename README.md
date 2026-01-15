# LoRA Prep - Model Training Dataset Manager

A tool for managing training datasets for AI model fine-tuning. Designed for single-developer + AI collaboration.

## Features

- Project-based organization (separate databases per universe/project)
- Artifact management (vehicles, weapons, characters, etc.)
- Image import with preprocessing (letterbox or manual crop to 1024x1024)
- Automated caption generation with human review
- Lookup table management (manufacturers, angles, lighting, etc.)
- CSV import/export for lookup tables
- Training dataset export

## Quick Start

### With Docker (Recommended)

```bash
git clone <repository-url>
cd lora-prep
docker-compose up -d
```

Open browser to http://localhost:8080

### Manual Setup

**Backend:**
```bash
cd lora-prep
go mod download
go run cmd/server/main.go
```

**Frontend (in separate terminal):**
```bash
cd web
npm install
npm run dev
```

Backend: http://localhost:8080
Frontend dev server: http://localhost:3000

## Project Structure

```
lora-prep/
├── cmd/server/           # Go backend entry point
├── internal/
│   ├── api/              # HTTP handlers
│   ├── db/               # Database manager
│   │   └── migrations/   # SQL schema
│   ├── models/           # Data structures
│   └── service/          # Business logic
├── web/                  # React frontend
│   └── src/
│       ├── pages/        # Page components
│       ├── components/   # Reusable components
│       └── services/     # API client
└── projects/             # User data (gitignored)
    └── {project-name}/
        ├── data/         # SQLite database
        ├── images/       # Training images
        │   ├── raw/
        │   └── training/
        └── exports/      # Exported datasets
```

## Development Status

### Implemented
- ✅ Database schema
- ✅ Project management (create, list, select)
- ✅ Artifact CRUD operations
- ✅ ID generation system
- ✅ Caption generation logic
- ✅ Image preprocessing (letterbox/crop)
- ✅ Basic React frontend with routing

### In Progress
- 🚧 Artifact form UI
- 🚧 Image import queue UI
- 🚧 Lookup table management UI
- 🚧 CSV import/export
- 🚧 Training dataset export

## Architecture Decisions

- **SQLite per project**: Each universe gets its own database for clean separation
- **Human-readable IDs**: `VEH-AEG-1736704800-A7F2` instead of auto-increment
- **Go backend**: Single binary, fast, type-safe
- **React frontend**: Component-based, easy to iterate on layout
- **Natural language captions**: Structured but readable captions for model training

## API Endpoints

```
GET    /api/projects
POST   /api/projects

GET    /api/projects/{name}/artifacts
POST   /api/projects/{name}/artifacts
GET    /api/projects/{name}/artifacts/{id}
PUT    /api/projects/{name}/artifacts/{id}
DELETE /api/projects/{name}/artifacts/{id}

GET    /api/projects/{name}/images
POST   /api/projects/{name}/images/{id}/caption

GET    /api/projects/{name}/lookups/{table}
POST   /api/projects/{name}/lookups/{table}
```

## Next Steps

1. Complete artifact form with all fields
2. Implement image import queue
3. Build lookup table management UI
4. Add CSV import/export for lookup tables
5. Implement training dataset export
6. Add search/filtering capabilities
