package service

import (
	"database/sql"
	"fmt"
	"strings"

	"github.com/jmoiron/sqlx"
	"github.com/mshaver/lora-prep/internal/models"
)

type CaptionGenerator struct {
	db *sqlx.DB
}

func NewCaptionGenerator(db *sqlx.DB) *CaptionGenerator {
	return &CaptionGenerator{db: db}
}

func (cg *CaptionGenerator) GenerateCaption(artifact *models.Artifact, image *models.TrainingImage) (string, error) {
	var parts []string

	angleName, err := cg.getLookupName("angle_types", image.Angle)
	if err == nil && angleName != "" {
		parts = append(parts, fmt.Sprintf("A %s of", strings.ToLower(angleName)))
	}

	var mfrName string
	if artifact.ManufacturerCode != nil {
		mfrName, _ = cg.getLookupName("manufacturer_codes", artifact.ManufacturerCode)
	}

	artifactTypeName, _ := cg.getLookupName("artifact_type_codes", &artifact.ArtifactTypeCode)
	
	if mfrName != "" {
		parts = append(parts, fmt.Sprintf("a %s %s", mfrName, artifact.Name))
	} else {
		parts = append(parts, fmt.Sprintf("a %s", artifact.Name))
	}

	if artifactTypeName != "" {
		parts = append(parts, strings.ToLower(artifactTypeName))
	}

	if image.ConditionState != nil {
		conditionName, _ := cg.getLookupName("condition_states", image.ConditionState)
		if conditionName != "" {
			parts = append(parts, fmt.Sprintf("in %s condition", strings.ToLower(conditionName)))
		}
	}

	if image.LightingCondition != nil {
		lightingName, _ := cg.getLookupName("lighting_types", image.LightingCondition)
		if lightingName != "" {
			parts = append(parts, fmt.Sprintf("captured in %s lighting", strings.ToLower(lightingName)))
		}
	}

	caption := strings.Join(parts, " ")
	if !strings.HasSuffix(caption, ".") {
		caption += "."
	}

	if len(artifact.PrimaryColors) > 0 {
		colorDesc := fmt.Sprintf(" The %s features %s", 
			strings.ToLower(artifactTypeName), 
			strings.Join(artifact.PrimaryColors, " and "))
		caption += colorDesc + "."
	}

	if artifact.Description != nil && *artifact.Description != "" {
		caption += " " + *artifact.Description
		if !strings.HasSuffix(caption, ".") {
			caption += "."
		}
	}

	if image.SpecificDetails != nil && *image.SpecificDetails != "" {
		caption += " " + *image.SpecificDetails
		if !strings.HasSuffix(caption, ".") {
			caption += "."
		}
	}

	return caption, nil
}

func (cg *CaptionGenerator) getLookupName(tableName string, code *string) (string, error) {
	if code == nil || *code == "" {
		return "", nil
	}

	var fullName string
	query := fmt.Sprintf("SELECT full_name FROM %s WHERE code = ?", tableName)
	err := cg.db.Get(&fullName, query, *code)
	
	if err == sql.ErrNoRows {
		return *code, nil
	}
	
	return fullName, err
}
