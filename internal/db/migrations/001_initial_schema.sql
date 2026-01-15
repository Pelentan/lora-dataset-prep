-- Lookup Tables

CREATE TABLE artifact_type_codes (
    code VARCHAR(3) PRIMARY KEY,
    full_name VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE manufacturer_codes (
    code VARCHAR(3) PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    universe VARCHAR(100) NOT NULL,
    description TEXT,
    founded_year INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vehicle_types (
    code VARCHAR(20) PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vehicle_roles (
    code VARCHAR(20) PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE angle_types (
    code VARCHAR(20) PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    description TEXT,
    sort_order INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE lighting_types (
    code VARCHAR(20) PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE material_types (
    code VARCHAR(20) PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE condition_states (
    code VARCHAR(20) PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE distance_types (
    code VARCHAR(20) PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Main Tables

CREATE TABLE artifacts (
    id VARCHAR(50) PRIMARY KEY,
    artifact_type_code VARCHAR(3) NOT NULL,
    manufacturer_code VARCHAR(3),
    universe VARCHAR(100) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Physical properties
    length_m REAL,
    width_m REAL,
    height_m REAL,
    mass_kg REAL,
    scale_category VARCHAR(50),
    
    -- Visual properties (JSON)
    primary_colors TEXT,
    materials TEXT,
    
    -- Type-specific
    vehicle_type VARCHAR(100),
    vehicle_role VARCHAR(100),
    
    -- Context
    typical_environment VARCHAR(100),
    era VARCHAR(100),
    
    -- Flexible expansion (JSON)
    additional_properties TEXT,
    tags TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (artifact_type_code) REFERENCES artifact_type_codes(code),
    FOREIGN KEY (manufacturer_code) REFERENCES manufacturer_codes(code)
);

CREATE TABLE training_images (
    id VARCHAR(100) PRIMARY KEY,
    artifact_id VARCHAR(50) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    original_filename VARCHAR(500),
    
    -- Shot composition
    angle VARCHAR(100),
    distance VARCHAR(50),
    
    -- Visual state
    lighting_condition VARCHAR(100),
    condition_state VARCHAR(50),
    
    -- Image-specific details
    specific_details TEXT,
    environment_context VARCHAR(200),
    
    -- Preprocessing
    preprocessing_method VARCHAR(20),
    crop_params TEXT,
    
    -- Generated output
    caption_text TEXT,
    caption_generated_date TIMESTAMP,
    
    -- Quality control
    reviewed BOOLEAN DEFAULT FALSE,
    approved BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (artifact_id) REFERENCES artifacts(id)
);

CREATE TABLE import_queues (
    id VARCHAR(50) PRIMARY KEY,
    artifact_id VARCHAR(50) NOT NULL,
    source_folder VARCHAR(500) NOT NULL,
    destination_folder VARCHAR(500) NOT NULL,
    total_images INTEGER DEFAULT 0,
    processed_images INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (artifact_id) REFERENCES artifacts(id)
);

CREATE TABLE import_queue_items (
    id VARCHAR(50) PRIMARY KEY,
    queue_id VARCHAR(50) NOT NULL,
    source_filename VARCHAR(500) NOT NULL,
    sequence_number INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    training_image_id VARCHAR(100),
    processed_at TIMESTAMP,
    
    FOREIGN KEY (queue_id) REFERENCES import_queues(id),
    FOREIGN KEY (training_image_id) REFERENCES training_images(id)
);

CREATE TABLE model_versions (
    id VARCHAR(50) PRIMARY KEY,
    universe VARCHAR(100) NOT NULL,
    version VARCHAR(20) NOT NULL,
    trained_date DATE,
    total_images INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE model_training_sets (
    model_version_id VARCHAR(50) NOT NULL,
    training_image_id VARCHAR(100) NOT NULL,
    PRIMARY KEY (model_version_id, training_image_id),
    
    FOREIGN KEY (model_version_id) REFERENCES model_versions(id),
    FOREIGN KEY (training_image_id) REFERENCES training_images(id)
);

-- Lookup table metadata for custom column display names
CREATE TABLE lookup_table_metadata (
    table_name VARCHAR(100) NOT NULL,
    column_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(100),
    PRIMARY KEY (table_name, column_name)
);

-- Lookup table to artifact type relationships
CREATE TABLE lookup_table_artifact_types (
    table_name VARCHAR(100) NOT NULL,
    artifact_type_code VARCHAR(20) NOT NULL,
    PRIMARY KEY (table_name, artifact_type_code)
);

-- Indexes

CREATE INDEX idx_artifacts_type ON artifacts(artifact_type_code);
CREATE INDEX idx_artifacts_manufacturer ON artifacts(manufacturer_code);
CREATE INDEX idx_artifacts_universe ON artifacts(universe);
CREATE INDEX idx_artifacts_name ON artifacts(name);

CREATE INDEX idx_training_images_artifact ON training_images(artifact_id);
CREATE INDEX idx_training_images_approved ON training_images(approved);

CREATE INDEX idx_import_queue_items_queue ON import_queue_items(queue_id);
CREATE INDEX idx_import_queue_items_status ON import_queue_items(status);