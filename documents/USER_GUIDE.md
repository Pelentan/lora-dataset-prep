# User Guide

Complete walkthrough of the LoRA Dataset Preparation Tool, from creating your first project to exporting a training-ready dataset.

## Table of Contents

1. [Overview](#overview)
2. [Creating a Project](#creating-a-project)
3. [Managing Artifacts](#managing-artifacts)
4. [Configuring Lookup Tables](#configuring-lookup-tables)
5. [Importing and Processing Images](#importing-and-processing-images)
6. [Managing Training Images](#managing-training-images)
7. [Exporting for Training](#exporting-for-training)
8. [Tips and Best Practices](#tips-and-best-practices)

## Overview

The workflow follows a logical sequence:

1. **Create Project** → Separate workspace for each story universe
2. **Configure Lookup Tables** → Customize metadata options
3. **Create Artifacts** → Define what you're creating datasets for
4. **Import Images** → Add raw images and process them
5. **Review Dataset** → Check your work, edit captions
6. **Export** → Get ZIP ready for training

## Creating a Project

### What is a Project?

A project represents a complete, isolated workspace:
- Separate SQLite database
- Independent image storage
- Custom lookup tables
- One project = one story universe/theme

### Create Your First Project

1. **Launch the application** at http://localhost:8080
2. Click **"Create New Project"**
3. Enter a project name (lowercase, no spaces):
   - Good: `star-citizen`, `fantasy-world`, `cyberpunk-2077`
   - Bad: `Star Citizen`, `my project`, `test 123`
4. Click **"Create"**

The application automatically:
- Creates `projects/{name}/` directory structure
- Initializes SQLite database with schema
- Seeds lookup tables with defaults
- Sets up image folders

### Switching Projects

Use the project selector dropdown to switch between projects. Each project maintains complete isolation.

### Deleting a Project

⚠️ **Warning**: This permanently deletes all data!

1. Click the **trash icon** next to project name
2. Type the project name exactly to confirm
3. Click **"Delete"**

This removes:
- Database
- All images (raw and processed)
- All exports
- The entire project directory

## Managing Artifacts

### What is an Artifact?

An artifact is anything you want to train a LoRA on:
- **Vehicles**: Ships, cars, mechs
- **Characters**: People, aliens, creatures
- **Weapons**: Guns, swords, tools
- **Cities**: Locations, buildings
- **Equipment**: Armor, gadgets, items

Each artifact has:
- Unique ID (e.g., `VEH-GREY-SHIV-1768513006-F6C0`)
- Rich metadata (dimensions, materials, colors)
- Associated training images

### Creating an Artifact

1. Navigate to **Artifacts** page
2. Click **"Create New Artifact"**
3. Fill in the form:

**Required Fields:**
- **Type**: Vehicle, Character, Weapon, etc.
- **Manufacturer**: Who made it? (Aegis, Anvil, etc.)
- **Name**: What is it called? (Javelin, Carrack, etc.)
- **Universe**: Which story world? (Star Citizen, Cyberpunk, etc.)

**Physical Properties** (optional but recommended):
- Length, Width, Height (in meters)
- Mass (in kilograms)
- Scale Category: (Tiny, Small, Medium, Large, etc.)

**Visual Properties:**
- **Primary Colors**: Main colors (JSON array: `["grey", "red"]`)
- **Materials**: What it's made of (JSON array: `["metal", "composite"]`)

**Specific to Type:**
- Vehicles: Type (fighter, transport), Role (combat, cargo)
- Characters: Species, class, faction
- Weapons: Weapon type, damage type
- Cities: Population, climate, era

**Additional:**
- **Description**: Detailed text description
- **Tags**: Keywords for searching

4. Click **"Save"**

The system generates a unique ID like: `VEH-GREY-SHIV-1768513006-F6C0`

### Editing an Artifact

1. Click the **edit icon** next to artifact
2. Modify any fields
3. Click **"Save"**

All associated images remain linked - their captions auto-update with new artifact properties.

### Deleting an Artifact

⚠️ **Warning**: This breaks links to training images!

1. Click **trash icon**
2. Confirm deletion

Note: Images stay in database but lose artifact linkage. Best practice: delete artifact images first.

## Configuring Lookup Tables

### What are Lookup Tables?

Lookup tables define the controlled vocabulary for metadata:
- **Angle Types**: FRONT, SIDE-LEFT, TOP, THREE-QUARTER, etc.
- **Lighting Types**: DAYLIGHT, DRAMATIC, NEON, STUDIO, etc.
- **Material Types**: METAL, COMPOSITE, FABRIC, etc.
- **Condition States**: PRISTINE, WORN, DAMAGED, DESTROYED, etc.
- **Distance Types**: CLOSE-UP, MEDIUM, WIDE, EXTREME-WIDE, etc.

### Managing Lookup Tables

1. Navigate to **Lookup Tables**
2. Select a table from tabs
3. View all entries

**Add New Entry:**
1. Click **"Add Entry"**
2. Fill in:
   - **Code**: Short uppercase ID (e.g., `FRT`, `NEON`)
   - **Name**: Full name (e.g., `Front View`, `Neon Lighting`)
   - **Description**: What it means
3. Click **"Save"**

**Edit Entry:**
1. Click **edit icon**
2. Modify fields
3. Click **"Save"**

**Delete Entry:**
1. Click **trash icon**
2. Confirm deletion

⚠️ Deleting an entry doesn't affect existing images using that value.

### Pre-Seeded Values

All tables come with sensible defaults:

**Angle Types:**
- FRONT, FRONT-34, SIDE-LEFT, SIDE-RIGHT
- TOP, BOTTOM, THREE-QUARTER
- INTERIOR, DETAIL, etc.

**Lighting Types:**
- DAYLIGHT, DRAMATIC, STUDIO, NEON
- SPACE, SUNSET, NIGHT, etc.

**Material Types:**
- METAL, COMPOSITE, PLASTIC, FABRIC
- GLASS, WOOD, STONE, etc.

Customize these for your specific needs!

### Configuring "Use for Image Processing"

Some lookup tables can be marked as "Use for Image Processing":
1. Edit the lookup table configuration
2. Toggle **"Use for Image Processing"**
3. This makes it available in the image import form

## Importing and Processing Images

### Workflow Overview

1. Import images (files or folders)
2. Select artifact these belong to
3. Process each image one-by-one:
   - Optionally crop/preprocess
   - Fill metadata (angle, lighting, etc.)
   - Generate and review caption
   - Save processed image + caption

### Starting Import

1. Navigate to **Import Images**
2. Click **"Change Artifact"** to select which artifact these images are for
3. Import images using either:
   - **Browse Files**: Select multiple images
   - **Select Folder**: Import entire folder
   - **Drag & Drop**: Drop images anywhere on page

All images load into carousel view.

### Processing Images

#### Carousel View

- Navigate: Click **<** / **>** arrows or click thumbnail in grid
- Current position shown: "Image 3 of 15"
- Processed images show **green checkmark** ✓
- Preprocessed images show **blue badge** "1024x1024"

#### Preprocessing (Optional)

If your image needs cropping or centering:

1. Click **"Preprocess Image"**
2. Interactive crop tool appears:
   - **Drag** the blue box to reposition
   - **Drag corners/edges** to resize
   - **Preview** shows final 1024x1024 output with letterboxing
3. Click **"Save & Use This Crop"**

The processed image replaces the original for this import.

#### Fill Metadata

Use dropdowns to describe the image:
- **Angle**: Camera angle (FRONT, SIDE-LEFT, etc.)
- **Distance**: How far away (MEDIUM, CLOSE-UP, etc.)
- **Lighting**: Lighting condition (DAYLIGHT, DRAMATIC, etc.)
- **Condition**: State of artifact (PRISTINE, WORN, etc.)
- **Environment**: Where is it? (SPACE, HANGAR, CITY, etc.)
- **Details**: Free text for specific notes
  - Example: "landing gear deployed, engines glowing blue"

#### Generate Caption

1. Click **"Preview Context"**
2. Modal shows generated caption:
   ```
   A front view of a Grey Box Shivan medium fighter in pristine 
   condition, captured in dramatic lighting. The spacecraft features 
   a dark grey hull with red accent stripes. Landing gear deployed 
   with main engines emitting a blue glow.
   ```
3. Review the caption - edit if needed
4. Click **"Close"** when satisfied

#### Save & Next

1. Click **"Save & Next"**

This:
- Saves processed 1024x1024 image to `projects/{name}/images/training/`
- Creates matching `.txt` caption file
- Records metadata in database
- Advances to next unsaved image

**Smart Navigation:**
- If next image has no metadata: copies current metadata
- If all images saved: switches to grid view automatically

### Grid View

Click **"Grid View"** button to see all images:

- **Thumbnails**: Visual overview
- **Green checkmarks**: Saved images
- **Blue badges**: Preprocessed images (1024x1024)
- **Blue border**: Currently selected image
- **Progress**: "5 of 12 Saved" or "✓ All Images Saved"

Click any thumbnail to return to carousel view for that image.

### Removing Images

Don't want an image?

1. View the image in carousel
2. Click **"Remove from Queue"**
3. Image is removed from import (doesn't delete original file)

## Managing Training Images

### Viewing Your Dataset

Navigate to **Training Images** to see all processed images.

### Features

**Filter by Artifact:**
- Dropdown at top filters to specific artifact
- Shows count: "Grey Box Shivan (25)"

**Dataset Statistics:**
- Total images
- Number of artifacts
- Number of angles covered
- More stats...

**Image Grid:**
- Thumbnail view of all images
- Filename and metadata shown
- Click to view full size

### Selecting Images

Each thumbnail has a checkbox:

**Select Individual:**
- Check boxes on images you want to select

**Select All:**
- Click **"Select All"** checkbox in filter bar
- Bound by current artifact filter

**Selected Count:**
- Shows "Delete Selected (12)" button when images selected

### Editing Captions

1. Click an image thumbnail
2. Modal shows:
   - Full size image
   - Current caption
   - Metadata details
3. Click **"Edit Caption"**
4. Modify the text
5. Click **"Save Caption"**

This updates:
- Database record
- The `.txt` file on disk

### Deleting Images

**Single Image:**
1. Open image modal
2. Click **"Delete Image"**
3. Confirm deletion

**Multiple Images:**
1. Select images with checkboxes
2. Click **"Delete Selected (X)"**
3. Type confirmation text:
   - If "All Artifacts" filter: type **DELETE**
   - If specific artifact: type the **artifact ID**
4. Click **"Delete X Image(s)"**

This removes:
- Database record
- Image file (.png)
- Caption file (.txt)

⚠️ This cannot be undone!

## Exporting for Training

### What You Get

The export creates a ZIP file containing:
- All processed 1024x1024 images
- Matching caption `.txt` files (same base name)
- Ready to unzip and point your trainer at

### How to Export

1. Navigate to **Training Images**
2. Optional: Filter to specific artifact
3. Click **"📦 Export Dataset (25 images)"**
4. ZIP file downloads automatically

Filename: `{project}-training-images.zip` or `{project}-training-images-{artifact-id}.zip`

### Using the Export

1. Unzip the file
2. Point your LoRA trainer at the folder:
   - Kohya SS
   - ComfyUI training workflows
   - Stable Diffusion training scripts
   - etc.

The trainer reads:
- Images for visual training
- Caption `.txt` files for text conditioning

## Tips and Best Practices

### Organizing Projects

**One Project Per Universe:**
- Keep Star Citizen separate from Cyberpunk separate from Fantasy World
- Each gets custom lookup tables and isolated data

**Naming Convention:**
- Use lowercase with hyphens: `star-citizen`, `medieval-fantasy`
- Avoid spaces and special characters

### Artifact Management

**Be Descriptive:**
- Fill in physical properties (helps captions)
- Add detailed descriptions
- Use tags for searching later

**Consistent Naming:**
- Manufacturers: Use official names when possible
- Types: Stick to controlled vocabulary

### Image Quality

**Source Images:**
- Higher resolution is better (will be downscaled to 1024x1024)
- Clear, well-lit photos work best
- Multiple angles of same artifact = better training

**Preprocessing:**
- Use manual crop for:
  - Off-center subjects
  - Unwanted background elements
  - Specific framing needs
- Letterbox is fine for:
  - Already well-composed shots
  - When you want full context

### Caption Quality

**Good Captions:**
- Accurate (matches what's in image)
- Detailed (specific colors, states, features)
- Consistent (same terminology across images)

**Bad Captions:**
- Vague: "A spaceship" 
- Inconsistent: "gray" vs "grey" vs "silver"
- Wrong: Says "damaged" when pristine

**Edit When Needed:**
- Auto-generated captions are good starting points
- Always review for accuracy
- Add specific details the system can't know

### Dataset Size

**Minimum for LoRA:**
- 15-30 images: Basic concept
- 50-100 images: Good quality
- 100-300 images: Excellent results
- 300+ images: Diminishing returns

**Variety Matters:**
- Multiple angles
- Different lighting
- Various states/conditions
- Different contexts

### Backup Strategy

**Regular Backups:**
```bash
# Copy entire projects folder
cp -r projects/ backups/projects-2024-01-15/
```

**What to Backup:**
- The entire `projects/` directory is self-contained
- Portable SQLite databases
- All images and captions included

### Performance Tips

**Large Batches:**
- Import 50-100 images at a time (not 1000+)
- Browser might slow with huge queues
- Process in batches, then import more

**Storage:**
- Each 1024x1024 PNG ≈ 2MB
- 1000 images ≈ 2GB
- Plan accordingly

**Speed:**
- Manual crop adds time per image
- Letterbox is instant
- Caption generation is fast
- Bulk operations available for efficiency

## Troubleshooting

**Images not showing:**
- Check browser console (F12) for errors
- Verify files are in `projects/{name}/images/training/`
- Try refreshing the page

**Captions seem wrong:**
- Edit the caption directly
- Check artifact metadata is accurate
- Update artifact → captions auto-refresh

**Export failed:**
- Make sure you have images to export
- Check disk space
- Try filtering to smaller dataset

**Database locked error:**
- Only one process can write at once
- Don't run multiple instances
- Restart the application

## Next Steps

- Experiment with different artifacts and image sets
- Fine-tune your lookup tables for your needs
- Export and train your first LoRA!
- Share results with the community

## Getting Help

- Read the [Installation Guide](INSTALLATION.md) for setup issues
- Check [AI Development Story](AI_DEVELOPMENT.md) for architecture details
- Open an issue on GitHub for bugs or questions

---

**Happy training! 🚀**
