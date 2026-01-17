# LoRA Dataset Preparation Tool

[![CodeQL](https://github.com/Pelentan/lora-prep/workflows/CodeQL%20Security%20Analysis/badge.svg)](https://github.com/Pelentan/lora-prep/actions/workflows/codeql.yml)

A comprehensive web application for managing and preparing training datasets for LoRA (Low-Rank Adaptation) model fine-tuning. Built for AI artists and developers working with thousands of images across multiple creative universes.

## What It Does

This tool streamlines the entire process of creating high-quality training datasets:

- **Organize Artifacts**: Manage your creative assets (vehicles, characters, weapons, cities) with rich metadata and flexible categorization
- **Process Images**: Import, crop, and preprocess images to the perfect 1024x1024 format required for training
- **Generate Captions**: Create consistent, natural-language descriptions for each training image
- **Manage Datasets**: Review, edit, and organize your complete training dataset with full visibility
- **Export for Training**: One-click export of processed images and captions ready for LoRA training software

## Key Features

✨ **Multi-Project Support** - Separate databases for different story universes or creative projects  
🎨 **Interactive Image Processing** - Manual crop tool with real-time preview  
📝 **Smart Caption Generation** - Structured prose captions based on artifact properties  
🗂️ **Flexible Metadata** - Configurable lookup tables for angles, lighting, materials, and more  
📊 **Dataset Statistics** - Track your progress and dataset composition  
🔒 **Automated Security Scanning** - CodeQL analysis blocks PRs with critical vulnerabilities  
🚀 **One-Click Deployment** - Docker-based setup with single command startup  

## Documentation

- **[Installation Guide](documents/INSTALLATION.md)** - Get up and running in minutes
- **[User Guide](documents/USER_GUIDE.md)** - Complete walkthrough from start to finish
- **[Security Scanning](documents/SECURITY.md)** - Automated vulnerability detection and PR blocking
- **[AI Development Story](documents/AI_DEVELOPMENT.md)** - How this application was built with AI assistance

## Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd lora-prep

# Start the application
docker compose up --build

# Open in browser
http://localhost:8080
```

That's it! The application is now running with a complete web interface.

## Technology Stack

**Backend:**
- Go 1.23 with Chi router
- SQLite database (per-project isolation)
- Image processing with github.com/disintegration/imaging

**Frontend:**
- React 18 with Vite
- React Router for navigation
- Native fetch API for backend communication

**Deployment:**
- Docker with multi-stage builds
- All-in-one container (frontend + backend)
- Volume-mounted project storage

## Project Structure

```
lora-prep/
├── cmd/server/           # Go backend entry point
├── internal/             # Backend packages
│   ├── api/             # HTTP handlers
│   ├── db/              # Database management
│   ├── models/          # Data structures
│   └── service/         # Business logic
├── web/                 # React frontend
│   └── src/
│       ├── components/  # Reusable UI components
│       ├── pages/       # Page components
│       └── services/    # API client
├── documents/           # Documentation
└── projects/            # Project data (created at runtime)
    └── {project-name}/
        ├── project.db          # SQLite database
        ├── images/             # Image storage
        │   ├── raw/           # Original images
        │   └── training/      # Processed images
        └── exports/           # Dataset exports
```

## Use Cases

- **AI Artists**: Prepare consistent datasets for character LoRAs
- **Game Developers**: Create training sets for procedural asset generation
- **Story Writers**: Manage visual assets across multiple fictional universes
- **Researchers**: Organize and caption large image collections

## Contributing

This project was built through an iterative human-AI collaboration. See [AI Development Story](documents/AI_DEVELOPMENT.md) for the fascinating details of how a skilled developer and AI assistant worked together to create production-ready software.

## License

[Your chosen license here]

## Support

For issues, questions, or contributions, please [open an issue](link-to-issues) on GitHub.

---

**Built with ❤️ by a human developer and Claude (Anthropic)**