-- Artifact Type Codes
INSERT INTO artifact_type_codes (code, full_name, description) VALUES
('VEH', 'Vehicle', 'Ships, ground vehicles, aircraft, spacecraft'),
('WPN', 'Weapon', 'Personal and vehicle weapons'),
('CIT', 'City', 'Urban structures and settlements'),
('CRE', 'Creature', 'Living beings and organisms'),
('STR', 'Structure', 'Buildings and infrastructure'),
('EQP', 'Equipment', 'Gear, tools, and equipment'),
('CHR', 'Character', 'People and humanoid characters');

-- Angle Types
INSERT INTO angle_types (code, full_name, description, sort_order) VALUES
('FRT', 'Front', 'Direct front view', 1),
('FRT-34', 'Front 3/4', 'Front three-quarter angle', 2),
('FRT-L', 'Front Left', 'Front view angled from left', 3),
('FRT-R', 'Front Right', 'Front view angled from right', 4),
('SIDE-L', 'Left Side', 'Left profile view', 5),
('SIDE-R', 'Right Side', 'Right profile view', 6),
('REAR', 'Rear', 'Direct rear view', 7),
('REAR-34', 'Rear 3/4', 'Rear three-quarter angle', 8),
('TOP', 'Top Down', 'Overhead view', 9),
('BTM', 'Bottom', 'Underside view', 10),
('TOP-FRT', 'Top Front', 'Angled top view from front', 11),
('TOP-REAR', 'Top Rear', 'Angled top view from rear', 12),
('INT-COCK', 'Interior Cockpit', 'Cockpit interior', 13),
('INT-CABIN', 'Interior Cabin', 'Cabin/living space interior', 14),
('INT-CARGO', 'Interior Cargo', 'Cargo bay interior', 15),
('INT-ENG', 'Interior Engineering', 'Engineering bay interior', 16),
('DETAIL', 'Detail Shot', 'Close-up detail of specific feature', 17);

-- Lighting Types
INSERT INTO lighting_types (code, full_name, description) VALUES
('DAYLIGHT', 'Daylight', 'Natural daylight or bright ambient'),
('DRAMATIC', 'Dramatic', 'High contrast dramatic lighting'),
('BACKLIT', 'Backlit', 'Subject backlit with rim lighting'),
('SOFT', 'Soft', 'Soft diffused lighting'),
('NEON', 'Neon', 'Neon or colored artificial lighting'),
('SPOTLIGHT', 'Spotlight', 'Focused spotlight illumination'),
('AMBIENT', 'Ambient', 'Ambient environmental lighting'),
('DARK', 'Dark', 'Low light or nighttime'),
('SUNRISE', 'Sunrise/Sunset', 'Golden hour lighting'),
('STUDIO', 'Studio', 'Controlled studio lighting'),
('SPACE', 'Space', 'Space environment lighting');

-- Condition States
INSERT INTO condition_states (code, full_name, description) VALUES
('PRISTINE', 'Pristine', 'Brand new, perfect condition'),
('CLEAN', 'Clean', 'Well maintained, minor wear'),
('WORN', 'Worn', 'Visible wear and use'),
('WEATHERED', 'Weathered', 'Environmental weathering visible'),
('DAMAGED', 'Battle Damaged', 'Combat or accident damage visible'),
('DESTROYED', 'Destroyed', 'Heavily damaged or destroyed'),
('DIRTY', 'Dirty', 'Covered in dirt, dust, or grime');

-- Distance Types
INSERT INTO distance_types (code, full_name, description) VALUES
('EXTREME-CLOSE', 'Extreme Closeup', 'Very close detail shot'),
('CLOSE', 'Closeup', 'Close view of subject'),
('MEDIUM', 'Medium', 'Medium distance view'),
('WIDE', 'Wide', 'Wide establishing shot'),
('EXTREME-WIDE', 'Extreme Wide', 'Very wide distant view');

-- Material Types
INSERT INTO material_types (code, full_name, category, description) VALUES
('TITANIUM', 'Titanium Alloy', 'metal', 'Titanium-based metal alloy'),
('STEEL', 'Steel', 'metal', 'Steel construction'),
('ALUMINUM', 'Aluminum', 'metal', 'Aluminum alloy'),
('COMPOSITE', 'Composite Armor', 'composite', 'Advanced composite materials'),
('CARBON-FIBER', 'Carbon Fiber', 'composite', 'Carbon fiber composite'),
('CERAMIC', 'Ceramic', 'composite', 'Ceramic armor plating'),
('GLASS', 'Transparent Aluminum', 'composite', 'Transparent armor glass'),
('ORGANIC', 'Organic', 'organic', 'Biological or organic material'),
('ENERGY', 'Energy Shield', 'energy', 'Energy-based protection'),
('POLYMER', 'Polymer', 'composite', 'Advanced polymer materials');

-- Vehicle Types (Generic - users will add specific ones)
INSERT INTO vehicle_types (code, full_name, category) VALUES
('CAPITAL', 'Capital Ship', 'space'),
('FIGHTER', 'Fighter', 'space'),
('TRANSPORT', 'Transport', 'space'),
('HOVER', 'Hover Vehicle', 'ground'),
('WHEELED', 'Wheeled Vehicle', 'ground'),
('TRACKED', 'Tracked Vehicle', 'ground'),
('AIRCRAFT', 'Aircraft', 'air'),
('WATERCRAFT', 'Watercraft', 'water');

-- Vehicle Roles (Generic - users will add specific ones)
INSERT INTO vehicle_roles (code, full_name) VALUES
('COMBAT', 'Combat'),
('EXPLORATION', 'Exploration'),
('RACING', 'Racing'),
('CARGO', 'Cargo Transport'),
('MEDICAL', 'Medical'),
('MINING', 'Mining'),
('REFUELING', 'Refueling'),
('RECON', 'Reconnaissance'),
('BOARDING', 'Boarding/Assault'),
('COMMAND', 'Command & Control');
