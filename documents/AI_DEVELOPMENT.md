# AI-Assisted Development Story

How this application was built through an iterative collaboration between a skilled human developer and Claude (Anthropic's AI assistant).

## The Initial Prompt

The following was the comprehensive prompt that kicked off this project. This represents all the requirements and specifications discussed between the developer and AI up to the point where coding began.

---

### AI Prompt for LoRA Prep - Model Training Dataset Manager

**Purpose of This Document**

This prompt represents all the requirements and specifications discussed between a human developer and an AI assistant up to the point where coding began. This serves as a demonstration of what an "average Joe" might get if they simply gave this entire prompt to an AI without iterative refinement and testing.

**Key Point:** While this prompt will produce *something*, the real value comes from the iterative human-AI collaboration that follows - catching bugs, refining implementations, adding missing features, and making the thousands of small decisions that turn "working code" into "production-ready software."

---

### COMPREHENSIVE PROMPT FOR AI MODEL TRAINING DATASET MANAGER

Build a complete application for managing training datasets used in AI model fine-tuning. This is for a single developer working with thousands of images across multiple story universes.

**CORE REQUIREMENTS**

Purpose:
- Manage artifacts (vehicles, characters, weapons, cities) and their training images
- Generate consistent captions for 5,000-50,000+ images
- Prepare datasets for week-long model training runs on RTX 5090
- Support multiple separate story universes with isolated databases

Architecture:
- Go backend with REST API
- React frontend with Vite
- SQLite database (one per project/universe)
- Docker deployment with single docker-compose command
- All-in-one container serving both frontend and backend on port 8080
- Projects stored in ./projects/ directory with structure:
  - `{project-name}/data/{project-name}.db`
  - `{project-name}/images/raw/`
  - `{project-name}/images/training/`
  - `{project-name}/exports/`

**Database Schema**

Use human-readable composite IDs:
- Artifacts: `{TYPE}-{MANUFACTURER}-{TIMESTAMP}-{RANDOM}` (e.g., VEH-AEG-1736704800-A7F2)
- Training Images: `IMG-{ARTIFACT_ID}-{ANGLE}-{SEQUENCE}` (e.g., IMG-VEH-AEG-1736704800-A7F2-FRT-001)

Tables needed:
- `artifacts`: id, artifact_type_code, manufacturer_code, universe, name, description, length_m, width_m, height_m, mass_kg, scale_category, primary_colors (JSON), materials (JSON), vehicle_type, vehicle_role, typical_environment, era, additional_properties (JSON), tags (JSON), created_at, updated_at
- `training_images`: id, artifact_id, file_path, original_filename, angle, distance, lighting_condition, condition_state, specific_details, environment_context, preprocessing_method, crop_params (JSON), caption_text, caption_generated_date, reviewed, approved, created_at, updated_at
- Lookup tables (all with code, full_name, description, created_at):
  - `artifact_type_codes` (VEH, WPN, CIT, CRE, STR, EQP, CHR)
  - `manufacturer_codes` (includes universe, founded_year)
  - `vehicle_types` (includes category)
  - `vehicle_roles`
  - `angle_types` (includes sort_order - FRT, FRT-34, SIDE-L, SIDE-R, TOP, BTM, INT-COCK, etc.)
  - `lighting_types` (DAYLIGHT, DRAMATIC, NEON, SPACE, etc.)
  - `material_types` (includes category)
  - `condition_states` (PRISTINE, WORN, DAMAGED, etc.)
  - `distance_types` (CLOSE, MEDIUM, WIDE, etc.)
- `import_queues`: id, artifact_id, source_folder, destination_folder, total_images, processed_images, status, created_at, updated_at
- `import_queue_items`: id, queue_id, source_filename, sequence_number, status, training_image_id, processed_at
- `model_versions`: id, universe, version, trained_date, total_images, notes, created_at
- `model_training_sets`: model_version_id, training_image_id (junction table)

Seed all lookup tables with reasonable default values.

**Image Processing Requirements**

- Auto-resize all images to 1024x1024
- Two preprocessing methods:
  - **Letterbox**: Maintain aspect ratio, add black padding (Option A - default)
  - **Manual Crop**: User drags/resizes crop box, then resize to 1024x1024 (like avatar croppers)
- Store preprocessing method and crop parameters in database
- Use github.com/disintegration/imaging for Go image processing

**Caption Generation**

Generate natural language captions with this template structure:

"A [ANGLE] of [ARTICLE] [MANUFACTURER] [NAME] [TYPE] in [CONDITION], captured in [LIGHTING]. The [TYPE] features [COLORS]. [DESCRIPTION]. [SPECIFIC_DETAILS]."

Example: "A front three-quarter view of an Aegis Dynamics Javelin heavy destroyer in pristine condition, captured in dramatic lighting. The capital ship features a gunmetal grey hull with red accent striping. Landing gear is deployed with main engines emitting a blue glow."

**UI Workflow for Image Import**

- User selects source folder (raw images) and destination folder
- User selects which artifact these images belong to
- System creates import queue
- UI shows images one-by-one with form to fill:
  - Dropdown: Angle (populated from angle_types table)
  - Dropdown: Lighting (populated from lighting_types)
  - Dropdown: Condition (populated from condition_states)
  - Dropdown: Distance (populated from distance_types)
  - Dropdown: Preprocessing method (letterbox or manual crop)
  - If manual crop: Show interactive crop tool
  - Text area: Specific details (e.g., "landing gear deployed, engines glowing")
  - Button: "Generate Caption" → Shows preview of caption
  - Human reviews/edits caption
  - Button: "Save & Next" → Copies image to destination with new ID, saves caption as .txt file, moves to next image
- Progress indicator: "15 of 247 images processed"

**API Endpoints Structure**

```
GET    /api/projects
POST   /api/projects
DELETE /api/projects
GET    /api/projects/{name}/artifacts
POST   /api/projects/{name}/artifacts
GET    /api/projects/{name}/artifacts/{id}
PUT    /api/projects/{name}/artifacts/{id}
DELETE /api/projects/{name}/artifacts/{id}
GET    /api/projects/{name}/images
GET    /api/projects/{name}/images/{id}
PUT    /api/projects/{name}/images/{id}
DELETE /api/projects/{name}/images/{id}
POST   /api/projects/{name}/images/{id}/caption
GET    /api/projects/{name}/lookups/{tableName}
POST   /api/projects/{name}/lookups/{tableName}
GET    /api/projects/{name}/lookups/{tableName}/{code}
PUT    /api/projects/{name}/lookups/{tableName}/{code}
DELETE /api/projects/{name}/lookups/{tableName}/{code}
GET    /api/projects/{name}/lookups/{tableName}/export (CSV download)
POST   /api/projects/{name}/lookups/{tableName}/import (CSV upload - stub for now)
POST   /api/projects/{name}/import-queue
GET    /api/projects/{name}/import-queue/{queueID}
GET    /api/projects/{name}/import-queue/{queueID}/next
POST   /api/projects/{name}/import-queue/{queueID}/process
POST   /api/projects/{name}/export (stub for now)
```

**React Pages**

- **ProjectSelector**: List projects, create new project, delete project (requires typing project name to confirm)
- **ProjectDashboard**: Show 4 cards linking to: Artifacts, Import Images, Lookup Tables, Export Dataset
- **ArtifactList**: Grid of artifacts with edit/delete, link to create new
- **ArtifactForm**: Full form for all artifact fields
- **LookupManager**: Tabbed interface for all 9 lookup tables, with add/edit/delete/export CSV
- **ImageProcessor**: Image import queue UI with one-by-one processing
- **ExportDataset**: (stub for later)

**Docker Setup**

Multi-stage Dockerfile:
- Build React frontend
- Build Go backend
- Combine in Alpine

docker-compose.yml:
- Single service, port 8080, mount ./projects volume
- **IMPORTANT**: No "version:" key in compose file (deprecated in modern Docker Compose)
- Frontend build included in container, served by Go backend

**Go Project Structure**

```
cmd/server/main.go
internal/
  api/handlers.go
  db/manager.go
  db/migrations/001_initial_schema.sql
  db/migrations/002_seed_data.sql
  models/models.go
  service/id_generator.go
  service/caption_generator.go
  service/image_preprocessor.go
go.mod
```

**Important Design Decisions**

- NO CLI interface - web UI only (provides validation through dropdowns)
- Separate SQLite database per project/universe (clean isolation)
- Human-in-the-loop for ALL caption generation (no bulk without review)
- Letterbox default to preserve all image content
- Manual crop available for when user needs specific framing
- All file paths and IDs are human-readable for debugging
- Lookup tables are per-project (can be customized for each universe)

**Go Dependencies**

- github.com/go-chi/chi/v5
- github.com/go-chi/cors
- github.com/jmoiron/sqlx
- github.com/mattn/go-sqlite3
- github.com/disintegration/imaging
- github.com/google/uuid

**React Dependencies**

- react
- react-dom
- react-router-dom
- vite

**Final Instruction**

Build this as a complete, working application ready for production use.

---

## What This Prompt Would Produce vs. Reality

### What an AI given only this prompt would likely produce:

- A working application structure
- Most core features implemented
- BUT with issues like:
  - SQL migration execution bugs
  - Docker configuration problems
  - Missing error handling edge cases
  - Unclear implementation choices
  - Testing gaps
  - Production readiness issues

### What human-AI iterative collaboration produced:

All of the above, PLUS:
- Migration execution bug caught and fixed through testing
- Docker deprecation issues corrected (docker-compose → docker compose, removed version:)
- Strong project deletion confirmation added when we realized it was needed
- Error handling refined through actual use
- Thousands of small refinements from running and testing real code
- Production-ready implementation

## The Key Difference

An experienced developer using AI as a force-multiplier catches issues, asks clarifying questions, tests thoroughly, and iteratively refines. The AI alone produces *something*, but the human expertise turns it into *production software*.

**This is why AI augments skilled developers rather than replaces them.**

---

## Development Timeline

### Phase 1: Foundation (Days 1-2)
*[To be filled in with actual timeline]*

### Phase 2: Core Features (Days 3-5)
*[To be filled in with actual timeline]*

### Phase 3: Image Processing (Days 6-8)
*[To be filled in with actual timeline]*

### Phase 4: Polish & Testing (Days 9-10)
*[To be filled in with actual timeline]*

---

## Key Learnings

### What Worked Well
*[To be filled in with specific examples]*

### Challenges Overcome
*[To be filled in with specific examples]*

### Iterative Refinements
*[To be filled in with specific examples]*

---

## Conclusion

This project demonstrates the power of human-AI collaboration. The AI provided rapid implementation and technical expertise, while the human developer provided:
- Domain knowledge
- Quality standards
- Testing and validation
- Architectural decisions
- Production readiness

Together, they built a complete, production-ready application in a fraction of the time it would take either alone.

---

*Document to be completed with specific timeline, challenges, and learnings from the actual development process.*
