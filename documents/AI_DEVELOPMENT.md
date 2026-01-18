# AI-Assisted Development Story

## The Project

This is going to be my thoughts on working with an AI to build an application. And by "work with", I mean from start to finish. Or more specifically, my thoughts after creating the LoRA Image Processing application. I've done others in the past, but those were always done while I was doing other work. Currently, I had some time on my hands. I had my experience up to this point working with AI. I had had a chance to work out a lot of what worked and what didn't. For another project I was working on, I had need of a small application that on the surface seemed pretty simple but when I started thinking about it had a fair bit of complexity to it. And most importantly, I had an opportunity to devote my full attention to it from start to finish. So, on a Monday morning as I was sipping my first coffee, I decided to launch.

First, the application. I've been working on converting stories I've written into videos using AI. I won't go into the details of that here, but I needed to be able to create what are called "context files" for images I create or capture in order to train both LoRAs and actual image/video models. These are text files that have the exact same name as the image file, just .txt files. They contain a short, narrative, description of what is in the image. This is to let the AI have "programmed in" knowledge of different artifacts that will be used repeatedly, including different views and usages of them. Key to this is that different images for the same artifact need have context files that are almost identical, with only the changes visible in the image altered. Additionally, you want all formats across all artifacts you're going to train the AI on to be as close to identical as possible. For LoRAs, you want between 30 and 50 images. For training actual models, you will likely wind up with thousands. Having an application handling and tracking that for you becomes a necessity. I'm certain that the companies creating the models in the first place have those. They aren't sharing. And, this would be a good test for AI.

Next, the AI I used. I used Claude.ai. I've had the most success with it when it comes to coding. I've tried others, Claude seems to be the best at not just grabbing what's on Stackoverflow and regurgitating it. And it seems to learn the longer you use it. The others out there might be the same way, but they never did well enough to make me spend the time. Additionally, when I started getting good results from Claude, I purchased the first level of paid access, $17 a month. And I was using their Sonnet 4.5. So on one hand, I had access to longer chats, but on the other, I was just using their generic model.

## The Week

Coffee at hand, I started. My first question was along the lines of what Claude thought of creating the application I described above. Claude, of course, responded that he could of course make that for me, did I want him to get started. I took a sip of my coffee and smiled. So began the week. I typed "No, of course not."

This is the first trap that so-called "Vibe Coders" fall into. They'll say "yes" and try to salvage things from there. And it *is* constant salvage from that point on for them. AI's initial responses are focused on answer as quickly as possible and in the way they determine the user wants it answered. They do this by accessing only their internal memory for things. That means just returning answers that are programmed into them. No real "thought" in it, they'll just do a quick search to see if anyone has created anything similar and try to reconstruct that. Building it the way someone else working on a completely different problem did. This has a possibility of working for you. If you're comfortable with that level of chance, you should definitely go buy a lottery ticket.

My work with converting the written word into actual coherent, AI generated, movies taught me that there is no skipping steps. I'm going to be creating a screenplay, storyboards, and various other things that anyone who works in Hollywood would nod and say "welcome to the pain, brother." This is the same for creating any software application. There are steps you just can't skip.

Back to Claude. I spend the next hour or so with back and forth with him doing the initial parts of development; the hashing out the job. Exploring the different things I needed it to do, things I wanted it to do, and asking if he could think of anything else. Discussing which languages to use for different parts. There would be a backend, a database, and a frontend. Discussing the pros and cons of different choices for each. In the end we settled on Go backend, SQLite for the database, and React for the frontend. Additionally, we decided to package that all in a single container. While it would be more traditional to have them separated out into three different containers, it was decided that the scope of this application made that overkill for no real advantage. I also established that there would be *no* cli access to the backend. Everything would be api focused with access only through html requests. Giving it a single surface area it need to protect against. And yes, determining that this would be a Docker project was established right from the start.

Once I felt we had that part taken care of enough, I told Claude to get started. I also had Claude create an AI prompt based on everything we had discussed up to that point. I've included it below. Feel free to try it and see what you get. Anyway, Claude got to churning and after a short while, he came back with the initial code and it was time to roll up my sleeves.

I would say the greatest *volume* of my interactions involved me executing the code and giving him the errors. He would give me corrected code and I would implement the changes. Rinse and repeat. Where my expertise and experience came into place was catching when the code "worked" but didn't provide what was really needed. And catching those before they became ingrained into the application code. Like noticing when he had hard coded things in that worked in the context of the current project but would prove problematic, or even system-breaking, for future projects using the app. Or when testing, realizing that options and connections needed to be added so as to increase the usefulness of the application. I also ran an eye over what was being stored in the database when things came back a bit odd and spotted two different errors in how he had set things up. Things that likely would have been missed by someone who didn't understand how sql is supposed to work.

Then there were the times where he started "hallucinating". Sometimes it was obvious. Easily catchable. Other times it was subtle. For example, there was one time he was trying to fetch an image and it was getting a 404 (file not found). We had changed and refactored some things to make them more future proof. He started wandering down the completely wrong path troubleshooting this. However, when I looked I could clearly see he was trying to retrieve the images from the wrong place. I had to yank him back sharply on that to get him to dig deeper into the actual issue. This is an example of the AI defaulting to looking for "quick" answers over digging. This demonstrates why a human will likely always have to be involved, but also why that human should be someone who is skilled in the process at hand.

I started this project on Monday morning with my first cup of coffee. I treated it *mostly* as my job through the week. This wasn't me nose-to-the-grindstone, though. For one, I treated it like any developer does any application. Meaning I wandered off from time to time to walk and think. Additionally, I had other things I had to do during the days. Appointments and the like. Just like a normal week at work. But by the same token, I treated this like a "remote" job and if I had an idea "after hours", I didn't hesitate to put some more work in. Just so I didn't forget it. Additionally, even with the extra allotment of Claude-time I had with my paid account, I don't think there was a day I didn't burn through that twice. A couple of them so fast I had to wait two hours for it to reset. I went and shoveled snow on one of them.

Friday evening it was feature complete. Including AI generated documentation for installation and use. As well as set up with automatic CodeQL scanning on any push. It's ready for Beta Testing. At this point I have only scanned the documentation and have spotted several errors and things not exactly right. I've left them in for now so you can get a feel for what was produced. And give a clear example of why a skilled human still needs to be involved.

Claude provided the skilled team of coders. I provided the vision, guidance, and troubleshooting some of the more difficult problems.

## Lessons Learned

I wrote a document on how to use AI. I'll provide access to that, so won't go into it here. Just new things and take-aways from this project.

One new habit I picked up this project is asking "Do you have any questions?" This is primarily when I request new work or changes. This prevented wasted effort with Claude going down directions I didn't want him to. Additionally, it almost always helped refine the request, getting me to either clarify things or even add things I hadn't thought of initially.

You'll likely have noticed I often used "he" when talking about Claude. This isn't me attributing humanity to a computer. This is me maintaining *my* humanity and sanity. I treated Claude as I would a human team throughout this exercise. Even doing some joking back and forth. This made it feel a lot less like "work" and more like fun collaboration on a project. The end result was that after a marathon session, I didn't dread coming back after a break; I was looking forward to it. Some people will argue that AIs don't have feelings. I would counter that with this: They have been trained in such a way as they will respond as if they did, just due to the material they've been trained on.

Which brings me around to this. AI is not Artificial *Intelligence*, it is *Artificial* Intelligence. Pay attention to the distinction. AI cannot think. I still hold to that it will never be able to. Not in the way humans *can* if they work at it. But with the knowledge of how millions of people responded to similar stimulus programmed into them, they can fake it really well. This can lead you into the trap of thinking of their skills being more than they are. They are an extremely useful tool. One that is going to change almost every aspect of life for us. That said, you need to keep two things in mind about AI. 1) You always need a human to utilize it. Because 2) Not every problem is a nail.

The final thing I want end with is this about AI. You can assimilate AI into your work, or you can be assimilated. Barring electricity just ceasing to exist, AI is not going away and not going to get any less useful. A lot of jobs are just going to go away. But there are still people being paid to make buggy-whips.

## AI Prompt for LoRA Prep - Model Training Dataset Manager

This prompt represents all the requirements and specifications discussed between a human developer and an AI assistant up to the point where coding began. This serves as a demonstration of what an "average Joe" might get if they simply gave this entire prompt to an AI without iterative refinement and testing.

**Key Point:** While this prompt will produce *something*, the real value comes from the iterative human-AI collaboration that follows - catching bugs, refining implementations, adding missing features, and making the thousands of small decisions that turn "working code" into "production-ready software."

### COMPREHENSIVE PROMPT FOR AI MODEL TRAINING DATASET MANAGER

Build a complete application for managing training datasets used in AI model fine-tuning. This is for a single developer working with thousands of images across multiple story universes.

#### CORE REQUIREMENTS

**Purpose:**
- Manage artifacts (vehicles, characters, weapons, cities) and their training images
- Generate consistent captions for 5,000-50,000+ images
- Prepare datasets for week-long model training runs on RTX 5090
- Support multiple separate story universes with isolated databases

**Architecture:**
- Go backend with REST API
- React frontend with Vite
- SQLite database (one per project/universe)
- Docker deployment with single docker-compose command
- All-in-one container serving both frontend and backend on port 8080
- Projects stored in ./projects/ directory with structure:
  - {project-name}/data/{project-name}.db
  - {project-name}/images/raw/
  - {project-name}/images/training/
  - {project-name}/exports/

#### Database Schema

Use human-readable composite IDs:
- Artifacts: {TYPE}-{MANUFACTURER}-{TIMESTAMP}-{RANDOM} (e.g., VEH-AEG-1736704800-A7F2)
- Training Images: IMG-{ARTIFACT_ID}-{ANGLE}-{SEQUENCE} (e.g., IMG-VEH-AEG-1736704800-A7F2-FRT-001)

Tables needed:
- **artifacts**: id, artifact_type_code, manufacturer_code, universe, name, description, length_m, width_m, height_m, mass_kg, scale_category, primary_colors (JSON), materials (JSON), vehicle_type, vehicle_role, typical_environment, era, additional_properties (JSON), tags (JSON), created_at, updated_at
- **training_images**: id, artifact_id, file_path, original_filename, angle, distance, lighting_condition, condition_state, specific_details, environment_context, preprocessing_method, crop_params (JSON), caption_text, caption_generated_date, reviewed, approved, created_at, updated_at
- **Lookup tables** (all with code, full_name, description, created_at):
  - artifact_type_codes (VEH, WPN, CIT, CRE, STR, EQP, CHR)
  - manufacturer_codes (includes universe, founded_year)
  - vehicle_types (includes category)
  - vehicle_roles
  - angle_types (includes sort_order - FRT, FRT-34, SIDE-L, SIDE-R, TOP, BTM, INT-COCK, etc.)
  - lighting_types (DAYLIGHT, DRAMATIC, NEON, SPACE, etc.)
  - material_types (includes category)
  - condition_states (PRISTINE, WORN, DAMAGED, etc.)
  - distance_types (CLOSE, MEDIUM, WIDE, etc.)
- **import_queues**: id, artifact_id, source_folder, destination_folder, total_images, processed_images, status, created_at, updated_at
- **import_queue_items**: id, queue_id, source_filename, sequence_number, status, training_image_id, processed_at
- **model_versions**: id, universe, version, trained_date, total_images, notes, created_at
- **model_training_sets**: model_version_id, training_image_id (junction table)

Seed all lookup tables with reasonable default values.

#### Image Processing Requirements

- Auto-resize all images to 1024x1024
- Two preprocessing methods:
  - **Letterbox**: Maintain aspect ratio, add black padding (Option A - default)
  - **Manual Crop**: User drags/resizes crop box, then resize to 1024x1024 (like avatar croppers)
- Store preprocessing method and crop parameters in database
- Use github.com/disintegration/imaging for Go image processing

#### Caption Generation

Generate natural language captions with this template structure:

```
A [ANGLE] of [ARTICLE] [MANUFACTURER] [NAME] [TYPE] in [CONDITION], 
captured in [LIGHTING]. The [TYPE] features [COLORS]. [DESCRIPTION]. 
[SPECIFIC_DETAILS].
```

Example: "A front three-quarter view of an Aegis Dynamics Javelin heavy destroyer in pristine condition, captured in dramatic lighting. The capital ship features a gunmetal grey hull with red accent striping. Landing gear is deployed with main engines emitting a blue glow."

#### UI Workflow for Image Import

1. User selects source folder (raw images) and destination folder
2. User selects which artifact these images belong to
3. System creates import queue
4. UI shows images one-by-one with form to fill:
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

#### API Endpoints Structure

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

#### React Pages

- **ProjectSelector**: List projects, create new project, delete project (requires typing project name to confirm)
- **ProjectDashboard**: Show 4 cards linking to: Artifacts, Import Images, Lookup Tables, Export Dataset
- **ArtifactList**: Grid of artifacts with edit/delete, link to create new
- **ArtifactForm**: Full form for all artifact fields
- **LookupManager**: Tabbed interface for all 9 lookup tables, with add/edit/delete/export CSV
- **ImageProcessor**: Image import queue UI with one-by-one processing
- **ExportDataset**: (stub for later)

#### Docker Setup

- Multi-stage Dockerfile: Build React frontend, build Go backend, combine in Alpine
- docker-compose.yml: Single service, port 8080, mount ./projects volume
- **IMPORTANT**: No "version:" key in compose file (deprecated in modern Docker Compose)
- Frontend build included in container, served by Go backend

#### Go Project Structure

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

#### Important Design Decisions

- NO CLI interface - web UI only (provides validation through dropdowns)
- Separate SQLite database per project/universe (clean isolation)
- Human-in-the-loop for ALL caption generation (no bulk without review)
- Letterbox default to preserve all image content
- Manual crop available for when user needs specific framing
- All file paths and IDs are human-readable for debugging
- Lookup tables are per-project (can be customized for each universe)

#### Go Dependencies

- github.com/go-chi/chi/v5
- github.com/go-chi/cors
- github.com/jmoiron/sqlx
- github.com/mattn/go-sqlite3
- github.com/disintegration/imaging
- github.com/google/uuid

#### React Dependencies

- react
- react-dom
- react-router-dom
- vite

#### Final Instruction

Build this as a complete, working application ready for production use.

---

### What This Prompt Would Produce vs. Reality

**What an AI given only this prompt would likely produce:**
- A working application structure
- Most core features implemented
- **BUT** with issues like:
  - SQL migration execution bugs
  - Docker configuration problems
  - Missing error handling edge cases
  - Unclear implementation choices
  - Testing gaps
  - Production readiness issues

**What human-AI iterative collaboration produced:**
- All of the above, PLUS:
  - Migration execution bug caught and fixed through testing
  - Docker deprecation issues corrected (docker-compose → docker compose, removed version:)
  - Strong project deletion confirmation added when we realized it was needed
  - Error handling refined through actual use
  - Thousands of small refinements from running and testing real code
  - Production-ready implementation

**The Key Difference:** An experienced developer using AI as a force-multiplier catches issues, asks clarifying questions, tests thoroughly, and iteratively refines. The AI alone produces *something*, but the human expertise turns it into *production software*.

This is why AI augments skilled developers rather than replaces them.