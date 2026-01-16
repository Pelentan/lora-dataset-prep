package models

import (
	"database/sql/driver"
	"encoding/json"
	"time"
)

type JSONSlice []string

func (j *JSONSlice) Scan(value interface{}) error {
	if value == nil {
		*j = []string{}
		return nil
	}
	if err := json.Unmarshal(value.([]byte), j); err != nil {
		return err
	}
	return nil
}

func (j JSONSlice) Value() (driver.Value, error) {
	if len(j) == 0 {
		return nil, nil
	}
	return json.Marshal(j)
}

type JSONMap map[string]interface{}

func (j *JSONMap) Scan(value interface{}) error {
	if value == nil {
		*j = make(map[string]interface{})
		return nil
	}
	if err := json.Unmarshal(value.([]byte), j); err != nil {
		return err
	}
	return nil
}

func (j JSONMap) Value() (driver.Value, error) {
	if len(j) == 0 {
		return nil, nil
	}
	return json.Marshal(j)
}

type CropParams struct {
	X      int `json:"x"`
	Y      int `json:"y"`
	Width  int `json:"width"`
	Height int `json:"height"`
}

type Artifact struct {
	ID                   string    `db:"id" json:"id"`
	ArtifactTypeCode     string    `db:"artifact_type_code" json:"artifact_type_code"`
	Name                 string    `db:"name" json:"name"`
	Description          *string   `db:"description" json:"description"`
	PhysicalProperties   JSONMap   `db:"physical_properties" json:"physical_properties"`
	AdditionalProperties JSONMap   `db:"additional_properties" json:"additional_properties"`
	Tags                 JSONSlice `db:"tags" json:"tags"`
	CreatedAt            time.Time `db:"created_at" json:"created_at"`
	UpdatedAt            time.Time `db:"updated_at" json:"updated_at"`
}

type TrainingImage struct {
	ID                   string     `db:"id" json:"id"`
	ArtifactID           string     `db:"artifact_id" json:"artifact_id"`
	FilePath             string     `db:"file_path" json:"file_path"`
	OriginalFilename     *string    `db:"original_filename" json:"original_filename"`
	Angle                *string    `db:"angle" json:"angle"`
	Distance             *string    `db:"distance" json:"distance"`
	LightingCondition    *string    `db:"lighting_condition" json:"lighting_condition"`
	ConditionState       *string    `db:"condition_state" json:"condition_state"`
	SpecificDetails      *string    `db:"specific_details" json:"specific_details"`
	EnvironmentContext   *string    `db:"environment_context" json:"environment_context"`
	PreprocessingMethod  *string    `db:"preprocessing_method" json:"preprocessing_method"`
	CropParams           *string    `db:"crop_params" json:"crop_params"`
	CaptionText          *string    `db:"caption_text" json:"caption_text"`
	CaptionGeneratedDate *time.Time `db:"caption_generated_date" json:"caption_generated_date"`
	Reviewed             bool       `db:"reviewed" json:"reviewed"`
	Approved             bool       `db:"approved" json:"approved"`
	CreatedAt            time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt            time.Time  `db:"updated_at" json:"updated_at"`
}

type LookupTable struct {
	Code        string    `db:"code" json:"code"`
	FullName    string    `db:"full_name" json:"full_name"`
	Description *string   `db:"description" json:"description,omitempty"`
	Universe    *string   `db:"universe" json:"universe,omitempty"`
	Category    *string   `db:"category" json:"category,omitempty"`
	SortOrder   *int      `db:"sort_order" json:"sort_order,omitempty"`
	FoundedYear *int      `db:"founded_year" json:"founded_year,omitempty"`
	CreatedAt   time.Time `db:"created_at" json:"created_at"`
}

type ImportQueue struct {
	ID                string    `db:"id" json:"id"`
	ArtifactID        string    `db:"artifact_id" json:"artifact_id"`
	SourceFolder      string    `db:"source_folder" json:"source_folder"`
	DestinationFolder string    `db:"destination_folder" json:"destination_folder"`
	TotalImages       int       `db:"total_images" json:"total_images"`
	ProcessedImages   int       `db:"processed_images" json:"processed_images"`
	Status            string    `db:"status" json:"status"`
	CreatedAt         time.Time `db:"created_at" json:"created_at"`
	UpdatedAt         time.Time `db:"updated_at" json:"updated_at"`
}

type ImportQueueItem struct {
	ID              string     `db:"id" json:"id"`
	QueueID         string     `db:"queue_id" json:"queue_id"`
	SourceFilename  string     `db:"source_filename" json:"source_filename"`
	SequenceNumber  int        `db:"sequence_number" json:"sequence_number"`
	Status          string     `db:"status" json:"status"`
	TrainingImageID *string    `db:"training_image_id" json:"training_image_id"`
	ProcessedAt     *time.Time `db:"processed_at" json:"processed_at"`
}

type Project struct {
	Name      string    `json:"name"`
	Universe  string    `json:"universe"`
	CreatedAt time.Time `json:"created_at"`
}
