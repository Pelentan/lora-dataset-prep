package api

import (
	"archive/zip"
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jmoiron/sqlx"
	"github.com/mshaver/lora-prep/internal/db"
	"github.com/mshaver/lora-prep/internal/models"
	"github.com/mshaver/lora-prep/internal/service"
)

type contextKey string

const projectDBKey contextKey = "projectDB"

type Handlers struct {
	dbManager    *db.Manager
	projectsPath string
}

func NewHandlers(dbManager *db.Manager, projectsPath string) *Handlers {
	return &Handlers{
		dbManager:    dbManager,
		projectsPath: projectsPath,
	}
}

func (h *Handlers) ProjectContext(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		projectName := chi.URLParam(r, "projectName")
		if projectName == "" {
			respondError(w, http.StatusBadRequest, "project name required")
			return
		}

		db, err := h.dbManager.GetDB(projectName)
		if err != nil {
			respondError(w, http.StatusNotFound, fmt.Sprintf("project not found: %v", err))
			return
		}

		ctx := context.WithValue(r.Context(), projectDBKey, db)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func getProjectDB(r *http.Request) *sqlx.DB {
	return r.Context().Value(projectDBKey).(*sqlx.DB)
}

func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, map[string]string{"error": message})
}

func (h *Handlers) ListProjects(w http.ResponseWriter, r *http.Request) {
	projects, err := h.dbManager.ListProjects()
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"projects": projects,
	})
}

func (h *Handlers) CreateProject(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name     string `json:"name"`
		Universe string `json:"universe"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Name == "" || req.Universe == "" {
		respondError(w, http.StatusBadRequest, "name and universe are required")
		return
	}

	if h.dbManager.ProjectExists(req.Name) {
		respondError(w, http.StatusConflict, "project already exists")
		return
	}

	if err := h.dbManager.CreateProject(req.Name, req.Universe); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusCreated, map[string]interface{}{
		"name":     req.Name,
		"universe": req.Universe,
		"created":  true,
	})
}

func (h *Handlers) DeleteProject(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name string `json:"name"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Name == "" {
		respondError(w, http.StatusBadRequest, "project name is required")
		return
	}

	if !h.dbManager.ProjectExists(req.Name) {
		respondError(w, http.StatusNotFound, "project does not exist")
		return
	}

	if err := h.dbManager.DeleteProject(req.Name); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"deleted": true,
	})
}

func (h *Handlers) ListLookupTables(w http.ResponseWriter, r *http.Request) {
	db := getProjectDB(r)

	artifactType := r.URL.Query().Get("artifact_type")

	var tables []string
	var err error

	if artifactType != "" {
		// Get tables for specific artifact type
		// Ensure the relationship table exists
		db.Exec(`CREATE TABLE IF NOT EXISTS lookup_table_artifact_types (
			table_name VARCHAR(100) NOT NULL,
			artifact_type_code VARCHAR(20) NOT NULL,
			PRIMARY KEY (table_name, artifact_type_code)
		)`)

		// Only show tables that are explicitly associated with this artifact type
		// Exclude system tables
		query := `SELECT DISTINCT t.name 
		          FROM sqlite_master t
		          WHERE t.type='table' 
		          AND (t.name LIKE '%_types' OR t.name LIKE '%_codes' OR t.name LIKE '%_states' OR t.name LIKE '%_roles')
		          AND t.name NOT IN ('lookup_table_artifact_types', 'lookup_table_config')
		          AND EXISTS (
		            SELECT 1 FROM lookup_table_artifact_types 
		            WHERE table_name = t.name AND artifact_type_code = ?
		          )
		          ORDER BY t.name COLLATE NOCASE`
		err = db.Select(&tables, query, artifactType)
	} else {
		// Get all lookup tables, excluding system tables
		query := `SELECT name FROM sqlite_master WHERE type='table' AND 
		          (name LIKE '%_types' OR name LIKE '%_codes' OR name LIKE '%_states' OR name LIKE '%_roles')
		          AND name NOT IN ('lookup_table_artifact_types', 'lookup_table_config')
		          ORDER BY name COLLATE NOCASE`
		err = db.Select(&tables, query)
	}

	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"tables": tables,
	})
}

func (h *Handlers) CreateLookupTable(w http.ResponseWriter, r *http.Request) {
	db := getProjectDB(r)

	var req struct {
		TableName     string `json:"table_name"`
		Template      string `json:"template"` // basic, with_category, with_sort_order, with_universe
		IsMultiSelect bool   `json:"is_multi_select"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.TableName == "" {
		respondError(w, http.StatusBadRequest, "table_name is required")
		return
	}

	if req.Template == "" {
		req.Template = "basic"
	}

	// Validate table name follows lookup table naming pattern
	validPattern := false
	if strings.HasSuffix(req.TableName, "_types") ||
		strings.HasSuffix(req.TableName, "_codes") ||
		strings.HasSuffix(req.TableName, "_states") ||
		strings.HasSuffix(req.TableName, "_roles") {
		validPattern = true
	}
	if !validPattern {
		respondError(w, http.StatusBadRequest, "table_name must end with _types, _codes, _states, or _roles")
		return
	}

	// Validate table name (alphanumeric and underscores only)
	for _, c := range req.TableName {
		if !((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '_') {
			respondError(w, http.StatusBadRequest, "table_name must contain only letters, numbers, and underscores")
			return
		}
	}

	// Check if table already exists
	var exists int
	checkQuery := "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?"
	if err := db.Get(&exists, checkQuery, req.TableName); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if exists > 0 {
		respondError(w, http.StatusConflict, "table already exists")
		return
	}

	// Create table based on template
	var createQuery string
	switch req.Template {
	case "basic":
		createQuery = fmt.Sprintf(`
			CREATE TABLE %s (
				code VARCHAR(20) PRIMARY KEY,
				full_name VARCHAR(100) NOT NULL,
				description TEXT,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			)`, req.TableName)
	case "with_category":
		createQuery = fmt.Sprintf(`
			CREATE TABLE %s (
				code VARCHAR(20) PRIMARY KEY,
				full_name VARCHAR(100) NOT NULL,
				category VARCHAR(50),
				description TEXT,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			)`, req.TableName)
	case "with_sort_order":
		createQuery = fmt.Sprintf(`
			CREATE TABLE %s (
				code VARCHAR(20) PRIMARY KEY,
				full_name VARCHAR(100) NOT NULL,
				description TEXT,
				sort_order INTEGER,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			)`, req.TableName)
	case "with_universe":
		createQuery = fmt.Sprintf(`
			CREATE TABLE %s (
				code VARCHAR(3) PRIMARY KEY,
				full_name VARCHAR(100) NOT NULL,
				universe VARCHAR(100) NOT NULL,
				description TEXT,
				founded_year INTEGER,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			)`, req.TableName)
	default:
		respondError(w, http.StatusBadRequest, "invalid template type")
		return
	}

	if _, err := db.Exec(createQuery); err != nil {
		respondError(w, http.StatusInternalServerError, fmt.Sprintf("failed to create table: %v", err))
		return
	}

	// Create lookup_table_config table if it doesn't exist
	db.Exec(`CREATE TABLE IF NOT EXISTS lookup_table_config (
		table_name VARCHAR(100) PRIMARY KEY,
		is_multi_select BOOLEAN DEFAULT FALSE,
		use_for_image_processing BOOLEAN DEFAULT FALSE,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	)`)

	// Insert config for this table
	configQuery := `INSERT INTO lookup_table_config (table_name, is_multi_select) VALUES (?, ?)`
	if _, err := db.Exec(configQuery, req.TableName, req.IsMultiSelect); err != nil {
		respondError(w, http.StatusInternalServerError, fmt.Sprintf("failed to create table config: %v", err))
		return
	}

	respondJSON(w, http.StatusCreated, map[string]interface{}{
		"table_name":      req.TableName,
		"template":        req.Template,
		"is_multi_select": req.IsMultiSelect,
		"created":         true,
	})
}

func (h *Handlers) DeleteLookupTable(w http.ResponseWriter, r *http.Request) {
	db := getProjectDB(r)

	var req struct {
		TableName string `json:"table_name"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.TableName == "" {
		respondError(w, http.StatusBadRequest, "table_name is required")
		return
	}

	// Validate it's a lookup table
	var exists int
	checkQuery := `SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=? AND 
	               (name LIKE '%_types' OR name LIKE '%_codes' OR name LIKE '%_states' OR name LIKE '%_roles')`
	if err := db.Get(&exists, checkQuery, req.TableName); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if exists == 0 {
		respondError(w, http.StatusNotFound, "lookup table not found")
		return
	}

	// Drop the table
	dropQuery := fmt.Sprintf("DROP TABLE %s", req.TableName)
	if _, err := db.Exec(dropQuery); err != nil {
		respondError(w, http.StatusInternalServerError, fmt.Sprintf("failed to delete table: %v", err))
		return
	}

	// Clean up related config entries
	db.Exec("DELETE FROM lookup_table_artifact_types WHERE table_name = ?", req.TableName)
	db.Exec("DELETE FROM lookup_table_config WHERE table_name = ?", req.TableName)

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"deleted": true,
	})
}

func (h *Handlers) ClearLookupTableData(w http.ResponseWriter, r *http.Request) {
	db := getProjectDB(r)

	var req struct {
		TableName string `json:"table_name"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.TableName == "" {
		respondError(w, http.StatusBadRequest, "table_name is required")
		return
	}

	// Validate it's a lookup table
	var exists int
	checkQuery := `SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=? AND 
	               (name LIKE '%_types' OR name LIKE '%_codes' OR name LIKE '%_states' OR name LIKE '%_roles')`
	if err := db.Get(&exists, checkQuery, req.TableName); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if exists == 0 {
		respondError(w, http.StatusNotFound, "lookup table not found")
		return
	}

	// Delete all data from the table but keep the structure
	deleteQuery := fmt.Sprintf("DELETE FROM %s", req.TableName)
	if _, err := db.Exec(deleteQuery); err != nil {
		respondError(w, http.StatusInternalServerError, fmt.Sprintf("failed to clear table data: %v", err))
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"cleared": true,
	})
}

func (h *Handlers) GetLookupTableSchema(w http.ResponseWriter, r *http.Request) {
	db := getProjectDB(r)
	tableName := chi.URLParam(r, "tableName")

	// Validate it's a lookup table
	var exists int
	checkQuery := `SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=? AND 
	               (name LIKE '%_types' OR name LIKE '%_codes' OR name LIKE '%_states' OR name LIKE '%_roles')`
	if err := db.Get(&exists, checkQuery, tableName); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if exists == 0 {
		respondError(w, http.StatusBadRequest, "invalid or non-existent lookup table")
		return
	}

	// Get column information using PRAGMA
	type ColumnInfo struct {
		Cid         int     `db:"cid" json:"cid"`
		Name        string  `db:"name" json:"name"`
		Type        string  `db:"type" json:"type"`
		NotNull     int     `db:"notnull" json:"notnull"`
		DfltValue   *string `db:"dflt_value" json:"dflt_value"`
		Pk          int     `db:"pk" json:"pk"`
		DisplayName string  `json:"display_name"`
	}

	query := fmt.Sprintf("PRAGMA table_info(%s)", tableName)
	var columns []ColumnInfo
	if err := db.Select(&columns, query); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Load display names from metadata
	type Metadata struct {
		ColumnName  string `db:"column_name"`
		DisplayName string `db:"display_name"`
	}
	var metadata []Metadata
	db.Select(&metadata, "SELECT column_name, display_name FROM lookup_table_metadata WHERE table_name = ?", tableName)

	// Map metadata to columns
	metadataMap := make(map[string]string)
	for _, m := range metadata {
		metadataMap[m.ColumnName] = m.DisplayName
	}

	for i := range columns {
		if displayName, ok := metadataMap[columns[i].Name]; ok {
			columns[i].DisplayName = displayName
		}
	}

	// Load artifact type relationships
	type ArtifactTypeRel struct {
		ArtifactTypeCode string `db:"artifact_type_code"`
	}

	// Ensure the relationship table exists
	db.Exec(`CREATE TABLE IF NOT EXISTS lookup_table_artifact_types (
		table_name VARCHAR(100) NOT NULL,
		artifact_type_code VARCHAR(20) NOT NULL,
		PRIMARY KEY (table_name, artifact_type_code)
	)`)

	var artifactTypes []ArtifactTypeRel
	db.Select(&artifactTypes, "SELECT artifact_type_code FROM lookup_table_artifact_types WHERE table_name = ?", tableName)

	artifactTypeCodes := []string{}
	for _, at := range artifactTypes {
		artifactTypeCodes = append(artifactTypeCodes, at.ArtifactTypeCode)
	}

	// Get is_multi_select config
	// Ensure config table exists
	db.Exec(`CREATE TABLE IF NOT EXISTS lookup_table_config (
		table_name VARCHAR(100) PRIMARY KEY,
		is_multi_select BOOLEAN DEFAULT FALSE,
		use_for_image_processing BOOLEAN DEFAULT FALSE,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	)`)

	var isMultiSelect bool
	var useForImageProcessing bool
	err := db.Get(&isMultiSelect, "SELECT COALESCE(is_multi_select, FALSE) FROM lookup_table_config WHERE table_name = ?", tableName)
	if err != nil {
		// Default to false if not found
		isMultiSelect = false
	}

	err = db.Get(&useForImageProcessing, "SELECT COALESCE(use_for_image_processing, FALSE) FROM lookup_table_config WHERE table_name = ?", tableName)
	if err != nil {
		// Default to false if not found
		useForImageProcessing = false
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"table_name":               tableName,
		"columns":                  columns,
		"artifact_types":           artifactTypeCodes,
		"is_multi_select":          isMultiSelect,
		"use_for_image_processing": useForImageProcessing,
	})
}

func (h *Handlers) UpdateLookupTableArtifactTypes(w http.ResponseWriter, r *http.Request) {
	db := getProjectDB(r)
	tableName := chi.URLParam(r, "tableName")

	var req struct {
		ArtifactTypes []string `json:"artifact_types"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Validate it's a lookup table
	var exists int
	checkQuery := `SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=? AND 
	               (name LIKE '%_types' OR name LIKE '%_codes' OR name LIKE '%_states' OR name LIKE '%_roles')`
	if err := db.Get(&exists, checkQuery, tableName); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if exists == 0 {
		respondError(w, http.StatusBadRequest, "invalid or non-existent lookup table")
		return
	}

	// Ensure the relationship table exists
	db.Exec(`CREATE TABLE IF NOT EXISTS lookup_table_artifact_types (
		table_name VARCHAR(100) NOT NULL,
		artifact_type_code VARCHAR(20) NOT NULL,
		PRIMARY KEY (table_name, artifact_type_code)
	)`)

	// Delete existing relationships
	if _, err := db.Exec("DELETE FROM lookup_table_artifact_types WHERE table_name = ?", tableName); err != nil {
		respondError(w, http.StatusInternalServerError, fmt.Sprintf("failed to clear relationships: %v", err))
		return
	}

	// Insert new relationships
	for _, artifactType := range req.ArtifactTypes {
		if artifactType != "" {
			db.Exec("INSERT INTO lookup_table_artifact_types (table_name, artifact_type_code) VALUES (?, ?)",
				tableName, artifactType)
		}
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"table_name":     tableName,
		"artifact_types": req.ArtifactTypes,
		"updated":        true,
	})
}

func (h *Handlers) UpdateLookupTableConfig(w http.ResponseWriter, r *http.Request) {
	db := getProjectDB(r)
	tableName := chi.URLParam(r, "tableName")

	var req struct {
		IsMultiSelect         *bool `json:"is_multi_select"`
		UseForImageProcessing *bool `json:"use_for_image_processing"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Validate it's a lookup table
	var exists int
	checkQuery := `SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=? AND 
	               (name LIKE '%_types' OR name LIKE '%_codes' OR name LIKE '%_states' OR name LIKE '%_roles')`
	if err := db.Get(&exists, checkQuery, tableName); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if exists == 0 {
		respondError(w, http.StatusBadRequest, "invalid or non-existent lookup table")
		return
	}

	// Ensure the config table exists
	db.Exec(`CREATE TABLE IF NOT EXISTS lookup_table_config (
		table_name VARCHAR(100) PRIMARY KEY,
		is_multi_select BOOLEAN DEFAULT FALSE,
		use_for_image_processing BOOLEAN DEFAULT FALSE,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	)`)

	// Build dynamic update query based on what's provided
	// Determine values for INSERT (use provided value or FALSE as default)
	isMultiSelectValue := false
	useForImageProcessingValue := false

	updates := []string{}

	if req.IsMultiSelect != nil {
		isMultiSelectValue = *req.IsMultiSelect
		updates = append(updates, "is_multi_select = excluded.is_multi_select")
	}

	if req.UseForImageProcessing != nil {
		useForImageProcessingValue = *req.UseForImageProcessing
		updates = append(updates, "use_for_image_processing = excluded.use_for_image_processing")
	}

	if len(updates) == 0 {
		respondError(w, http.StatusBadRequest, "no fields to update")
		return
	}

	updates = append(updates, "updated_at = CURRENT_TIMESTAMP")

	// Build args: tableName, is_multi_select, use_for_image_processing for INSERT
	args := []interface{}{tableName, isMultiSelectValue, useForImageProcessingValue}

	// Insert or update config - INSERT uses actual values, UPDATE uses excluded.* to reference them
	query := fmt.Sprintf(`INSERT INTO lookup_table_config (table_name, is_multi_select, use_for_image_processing, updated_at) 
	          VALUES (?, ?, ?, CURRENT_TIMESTAMP)
	          ON CONFLICT(table_name) DO UPDATE SET %s`, strings.Join(updates, ", "))

	if _, err := db.Exec(query, args...); err != nil {
		respondError(w, http.StatusInternalServerError, fmt.Sprintf("failed to update config: %v", err))
		return
	}

	// Get updated values to return
	var isMultiSelect bool
	var useForImageProcessing bool
	db.Get(&isMultiSelect, "SELECT COALESCE(is_multi_select, FALSE) FROM lookup_table_config WHERE table_name = ?", tableName)
	db.Get(&useForImageProcessing, "SELECT COALESCE(use_for_image_processing, FALSE) FROM lookup_table_config WHERE table_name = ?", tableName)

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"table_name":               tableName,
		"is_multi_select":          isMultiSelect,
		"use_for_image_processing": useForImageProcessing,
		"updated":                  true,
	})
}

func (h *Handlers) AddLookupTableColumn(w http.ResponseWriter, r *http.Request) {
	db := getProjectDB(r)
	tableName := chi.URLParam(r, "tableName")

	var req struct {
		ColumnName string `json:"column_name"`
		ColumnType string `json:"column_type"` // text_20, text_50, text_100, text_1000, number
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.ColumnName == "" {
		respondError(w, http.StatusBadRequest, "column_name is required")
		return
	}

	if req.ColumnType == "" {
		req.ColumnType = "text_100"
	}

	// Map user-friendly types to SQL types
	typeMap := map[string]string{
		"text_20":   "VARCHAR(20)",
		"text_50":   "VARCHAR(50)",
		"text_100":  "VARCHAR(100)",
		"text_1000": "TEXT",
		"number":    "REAL",
	}

	sqlType, validType := typeMap[req.ColumnType]
	if !validType {
		respondError(w, http.StatusBadRequest, "column_type must be text_20, text_50, text_100, text_1000, or number")
		return
	}

	// Validate it's a lookup table
	var exists int
	checkQuery := `SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=? AND 
	               (name LIKE '%_types' OR name LIKE '%_codes' OR name LIKE '%_states' OR name LIKE '%_roles')`
	if err := db.Get(&exists, checkQuery, tableName); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if exists == 0 {
		respondError(w, http.StatusBadRequest, "invalid or non-existent lookup table")
		return
	}

	// Validate column name (alphanumeric and underscores only)
	for _, c := range req.ColumnName {
		if !((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '_') {
			respondError(w, http.StatusBadRequest, "column_name must contain only letters, numbers, and underscores")
			return
		}
	}

	// Add the column
	alterQuery := fmt.Sprintf("ALTER TABLE %s ADD COLUMN %s %s", tableName, req.ColumnName, sqlType)
	if _, err := db.Exec(alterQuery); err != nil {
		respondError(w, http.StatusInternalServerError, fmt.Sprintf("failed to add column: %v", err))
		return
	}

	respondJSON(w, http.StatusCreated, map[string]interface{}{
		"column_name": req.ColumnName,
		"column_type": req.ColumnType,
		"added":       true,
	})
}

func (h *Handlers) DeleteLookupTableColumn(w http.ResponseWriter, r *http.Request) {
	db := getProjectDB(r)
	tableName := chi.URLParam(r, "tableName")
	columnName := chi.URLParam(r, "columnName")

	// Validate it's a lookup table
	var exists int
	checkQuery := `SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=? AND 
	               (name LIKE '%_types' OR name LIKE '%_codes' OR name LIKE '%_states' OR name LIKE '%_roles')`
	if err := db.Get(&exists, checkQuery, tableName); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if exists == 0 {
		respondError(w, http.StatusBadRequest, "invalid or non-existent lookup table")
		return
	}

	// Prevent deletion of required columns
	if columnName == "code" || columnName == "full_name" || columnName == "created_at" {
		respondError(w, http.StatusBadRequest, "cannot delete required columns: code, full_name, created_at")
		return
	}

	// Drop the column
	alterQuery := fmt.Sprintf("ALTER TABLE %s DROP COLUMN %s", tableName, columnName)
	if _, err := db.Exec(alterQuery); err != nil {
		respondError(w, http.StatusInternalServerError, fmt.Sprintf("failed to delete column: %v", err))
		return
	}

	// Also remove metadata for this column
	db.Exec("DELETE FROM lookup_table_metadata WHERE table_name = ? AND column_name = ?", tableName, columnName)

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"deleted": true,
	})
}

func (h *Handlers) UpdateColumnDisplayName(w http.ResponseWriter, r *http.Request) {
	db := getProjectDB(r)
	tableName := chi.URLParam(r, "tableName")
	columnName := chi.URLParam(r, "columnName")

	var req struct {
		DisplayName string `json:"display_name"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Validate it's a lookup table
	var exists int
	checkQuery := `SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=? AND 
	               (name LIKE '%_types' OR name LIKE '%_codes' OR name LIKE '%_states' OR name LIKE '%_roles')`
	if err := db.Get(&exists, checkQuery, tableName); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if exists == 0 {
		respondError(w, http.StatusBadRequest, "invalid or non-existent lookup table")
		return
	}

	// Ensure metadata table exists (for projects created before this feature)
	db.Exec(`CREATE TABLE IF NOT EXISTS lookup_table_metadata (
		table_name VARCHAR(100) NOT NULL,
		column_name VARCHAR(100) NOT NULL,
		display_name VARCHAR(100),
		PRIMARY KEY (table_name, column_name)
	)`)

	// Insert or update display name
	query := `INSERT INTO lookup_table_metadata (table_name, column_name, display_name) 
	          VALUES (?, ?, ?) 
	          ON CONFLICT(table_name, column_name) DO UPDATE SET display_name = ?`

	if _, err := db.Exec(query, tableName, columnName, req.DisplayName, req.DisplayName); err != nil {
		respondError(w, http.StatusInternalServerError, fmt.Sprintf("failed to update display name: %v", err))
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"column_name":  columnName,
		"display_name": req.DisplayName,
		"updated":      true,
	})
}

func (h *Handlers) ListArtifacts(w http.ResponseWriter, r *http.Request) {
	db := getProjectDB(r)

	query := "SELECT * FROM artifacts ORDER BY created_at DESC"

	var artifacts []models.Artifact
	if err := db.Select(&artifacts, query); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"artifacts": artifacts,
	})
}

func (h *Handlers) CreateArtifact(w http.ResponseWriter, r *http.Request) {
	db := getProjectDB(r)

	var req struct {
		models.Artifact
		IdComponents []string `json:"id_components"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	artifact := req.Artifact
	if artifact.ArtifactTypeCode == "" || artifact.Name == "" {
		respondError(w, http.StatusBadRequest, "artifact_type_code and name are required")
		return
	}

	// Generate ID using type code and optional ID components
	artifact.ID = service.GenerateArtifactID(artifact.ArtifactTypeCode, req.IdComponents...)
	artifact.CreatedAt = time.Now()
	artifact.UpdatedAt = time.Now()

	query := `INSERT INTO artifacts (
		id, artifact_type_code, name, description,
		physical_properties, additional_properties, tags,
		created_at, updated_at
	) VALUES (
		:id, :artifact_type_code, :name, :description,
		:physical_properties, :additional_properties, :tags,
		:created_at, :updated_at
	)`

	if _, err := db.NamedExec(query, artifact); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusCreated, artifact)
}

func (h *Handlers) GetArtifact(w http.ResponseWriter, r *http.Request) {
	db := getProjectDB(r)
	artifactID := chi.URLParam(r, "artifactID")

	var artifact models.Artifact
	query := "SELECT * FROM artifacts WHERE id = ?"

	if err := db.Get(&artifact, query, artifactID); err != nil {
		respondError(w, http.StatusNotFound, "artifact not found")
		return
	}

	respondJSON(w, http.StatusOK, artifact)
}

func (h *Handlers) UpdateArtifact(w http.ResponseWriter, r *http.Request) {
	db := getProjectDB(r)
	artifactID := chi.URLParam(r, "artifactID")

	var artifact models.Artifact
	if err := json.NewDecoder(r.Body).Decode(&artifact); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	artifact.ID = artifactID
	artifact.UpdatedAt = time.Now()

	query := `UPDATE artifacts SET
		artifact_type_code = :artifact_type_code,
		name = :name,
		description = :description,
		physical_properties = :physical_properties,
		additional_properties = :additional_properties,
		tags = :tags,
		updated_at = :updated_at
	WHERE id = :id`

	if _, err := db.NamedExec(query, artifact); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, artifact)
}

func (h *Handlers) DeleteArtifact(w http.ResponseWriter, r *http.Request) {
	db := getProjectDB(r)
	artifactID := chi.URLParam(r, "artifactID")

	query := "DELETE FROM artifacts WHERE id = ?"
	if _, err := db.Exec(query, artifactID); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"deleted": true,
	})
}

func (h *Handlers) ListImages(w http.ResponseWriter, r *http.Request) {
	db := getProjectDB(r)

	artifactID := r.URL.Query().Get("artifact_id")

	query := "SELECT * FROM training_images"
	args := []interface{}{}

	if artifactID != "" {
		query += " WHERE artifact_id = ?"
		args = append(args, artifactID)
	}

	query += " ORDER BY created_at DESC"

	var images []models.TrainingImage
	if err := db.Select(&images, query, args...); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"images": images,
	})
}

func (h *Handlers) CreateImage(w http.ResponseWriter, r *http.Request) {
	db := getProjectDB(r)
	projectName := chi.URLParam(r, "projectName")

	// Parse multipart form (max 20MB)
	if err := r.ParseMultipartForm(20 << 20); err != nil {
		respondError(w, http.StatusBadRequest, "failed to parse form")
		return
	}

	// Get image file
	file, header, err := r.FormFile("image")
	if err != nil {
		respondError(w, http.StatusBadRequest, "image file is required")
		return
	}
	defer file.Close()

	// Get metadata JSON
	metadataJSON := r.FormValue("metadata")
	if metadataJSON == "" {
		respondError(w, http.StatusBadRequest, "metadata is required")
		return
	}

	var metadata struct {
		ArtifactID         string `json:"artifact_id"`
		CaptionText        string `json:"caption_text"`
		Angle              string `json:"angle"`
		Distance           string `json:"distance"`
		LightingCondition  string `json:"lighting_condition"`
		ConditionState     string `json:"condition_state"`
		EnvironmentContext string `json:"environment_context"`
		SpecificDetails    string `json:"specific_details"`
	}

	if err := json.Unmarshal([]byte(metadataJSON), &metadata); err != nil {
		respondError(w, http.StatusBadRequest, "invalid metadata JSON")
		return
	}

	if metadata.ArtifactID == "" {
		respondError(w, http.StatusBadRequest, "artifact_id is required")
		return
	}

	// Get angle code for ID generation (use empty string if not provided)
	angleCode := metadata.Angle
	if angleCode == "" {
		angleCode = "NONE"
	}

	// Find next sequence number for this artifact+angle combination
	var maxSeq int
	seqQuery := `SELECT COALESCE(MAX(CAST(SUBSTR(id, -3) AS INTEGER)), 0) 
	             FROM training_images 
	             WHERE artifact_id = ? AND (angle = ? OR (angle IS NULL AND ? = 'NONE'))`
	if err := db.Get(&maxSeq, seqQuery, metadata.ArtifactID, angleCode, angleCode); err != nil {
		maxSeq = 0
	}
	sequence := maxSeq + 1

	// Generate unique ID for the image
	imageID := service.GenerateTrainingImageID(metadata.ArtifactID, angleCode, sequence)

	// Create images/training directory if it doesn't exist
	projectDir := filepath.Join("projects", projectName, "images", "training")
	if err := os.MkdirAll(projectDir, 0755); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to create directory")
		return
	}

	// Save image file
	ext := filepath.Ext(header.Filename)
	if ext == "" {
		ext = ".png"
	}
	filename := imageID + ext
	filepath := filepath.Join(projectDir, filename)

	outFile, err := os.Create(filepath)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to save image")
		return
	}
	defer outFile.Close()

	if _, err := io.Copy(outFile, file); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to write image")
		return
	}

	// Generate caption .txt file
	captionPath := filepath[:len(filepath)-len(ext)] + ".txt"
	if err := os.WriteFile(captionPath, []byte(metadata.CaptionText), 0644); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to save caption")
		return
	}

	// Insert into database
	now := time.Now()
	image := models.TrainingImage{
		ID:                   imageID,
		ArtifactID:           metadata.ArtifactID,
		FilePath:             filepath,
		OriginalFilename:     &header.Filename,
		CaptionText:          &metadata.CaptionText,
		CaptionGeneratedDate: &now,
		Reviewed:             false,
		Approved:             false,
		CreatedAt:            now,
		UpdatedAt:            now,
	}

	// Set optional fields
	if metadata.Angle != "" {
		image.Angle = &metadata.Angle
	}
	if metadata.Distance != "" {
		image.Distance = &metadata.Distance
	}
	if metadata.LightingCondition != "" {
		image.LightingCondition = &metadata.LightingCondition
	}
	if metadata.ConditionState != "" {
		image.ConditionState = &metadata.ConditionState
	}
	if metadata.EnvironmentContext != "" {
		image.EnvironmentContext = &metadata.EnvironmentContext
	}
	if metadata.SpecificDetails != "" {
		image.SpecificDetails = &metadata.SpecificDetails
	}

	query := `INSERT INTO training_images (
		id, artifact_id, file_path, original_filename,
		angle, distance, lighting_condition, condition_state,
		environment_context, specific_details,
		caption_text, caption_generated_date,
		reviewed, approved, created_at, updated_at
	) VALUES (
		:id, :artifact_id, :file_path, :original_filename,
		:angle, :distance, :lighting_condition, :condition_state,
		:environment_context, :specific_details,
		:caption_text, :caption_generated_date,
		:reviewed, :approved, :created_at, :updated_at
	)`

	if _, err := db.NamedExec(query, image); err != nil {
		respondError(w, http.StatusInternalServerError, fmt.Sprintf("failed to save image record: %v", err))
		return
	}

	respondJSON(w, http.StatusCreated, image)
}

func (h *Handlers) GetImage(w http.ResponseWriter, r *http.Request) {
	db := getProjectDB(r)
	imageID := chi.URLParam(r, "imageID")

	var image models.TrainingImage
	query := "SELECT * FROM training_images WHERE id = ?"

	if err := db.Get(&image, query, imageID); err != nil {
		respondError(w, http.StatusNotFound, "image not found")
		return
	}

	respondJSON(w, http.StatusOK, image)
}

func (h *Handlers) UpdateImage(w http.ResponseWriter, r *http.Request) {
	db := getProjectDB(r)
	imageID := chi.URLParam(r, "imageID")

	var req struct {
		CaptionText *string `json:"caption_text"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Get existing image to find file path
	var image models.TrainingImage
	if err := db.Get(&image, "SELECT * FROM training_images WHERE id = ?", imageID); err != nil {
		respondError(w, http.StatusNotFound, "image not found")
		return
	}

	// Update caption text in database
	now := time.Now()
	query := `UPDATE training_images SET
		caption_text = ?,
		caption_generated_date = ?,
		updated_at = ?
	WHERE id = ?`

	if _, err := db.Exec(query, req.CaptionText, now, now, imageID); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Update caption .txt file
	if req.CaptionText != nil && image.FilePath != "" {
		// Get caption file path (same as image but .txt extension)
		ext := filepath.Ext(image.FilePath)
		captionPath := image.FilePath[:len(image.FilePath)-len(ext)] + ".txt"

		if err := os.WriteFile(captionPath, []byte(*req.CaptionText), 0644); err != nil {
			respondError(w, http.StatusInternalServerError, fmt.Sprintf("failed to update caption file: %v", err))
			return
		}
	}

	// Return updated image
	image.CaptionText = req.CaptionText
	image.CaptionGeneratedDate = &now
	image.UpdatedAt = now

	respondJSON(w, http.StatusOK, image)
}

func (h *Handlers) DeleteImage(w http.ResponseWriter, r *http.Request) {
	db := getProjectDB(r)
	imageID := chi.URLParam(r, "imageID")

	// Get image to find file paths
	var image models.TrainingImage
	if err := db.Get(&image, "SELECT * FROM training_images WHERE id = ?", imageID); err != nil {
		respondError(w, http.StatusNotFound, "image not found")
		return
	}

	// Delete from database first
	query := "DELETE FROM training_images WHERE id = ?"
	if _, err := db.Exec(query, imageID); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Delete image file
	if image.FilePath != "" {
		os.Remove(image.FilePath) // Ignore error if file doesn't exist

		// Delete caption file
		ext := filepath.Ext(image.FilePath)
		captionPath := image.FilePath[:len(image.FilePath)-len(ext)] + ".txt"
		os.Remove(captionPath) // Ignore error if file doesn't exist
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"deleted": true,
	})
}

func (h *Handlers) GetImageFile(w http.ResponseWriter, r *http.Request) {
	db := getProjectDB(r)
	imageID := chi.URLParam(r, "imageID")

	// Get image to find file path
	var image models.TrainingImage
	if err := db.Get(&image, "SELECT * FROM training_images WHERE id = ?", imageID); err != nil {
		respondError(w, http.StatusNotFound, "image not found")
		return
	}

	if image.FilePath == "" {
		respondError(w, http.StatusNotFound, "image file path empty")
		return
	}

	// Check if file exists
	if _, err := os.Stat(image.FilePath); os.IsNotExist(err) {
		respondError(w, http.StatusNotFound, fmt.Sprintf("image file not found at path: %s", image.FilePath))
		return
	}

	// Read the file
	data, err := os.ReadFile(image.FilePath)
	if err != nil {
		respondError(w, http.StatusInternalServerError, fmt.Sprintf("failed to read image: %v", err))
		return
	}

	// Detect content type
	contentType := "image/png"
	ext := filepath.Ext(image.FilePath)
	switch ext {
	case ".jpg", ".jpeg":
		contentType = "image/jpeg"
	case ".png":
		contentType = "image/png"
	case ".gif":
		contentType = "image/gif"
	case ".webp":
		contentType = "image/webp"
	}

	// Serve the file
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", "public, max-age=31536000")
	w.Write(data)
}

func (h *Handlers) ExportDataset(w http.ResponseWriter, r *http.Request) {
	db := getProjectDB(r)
	projectName := chi.URLParam(r, "projectName")
	artifactID := r.URL.Query().Get("artifact_id")

	// Get images
	query := "SELECT * FROM training_images"
	args := []interface{}{}
	if artifactID != "" {
		query += " WHERE artifact_id = ?"
		args = append(args, artifactID)
	}

	var images []models.TrainingImage
	if err := db.Select(&images, query, args...); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if len(images) == 0 {
		respondError(w, http.StatusBadRequest, "no images to export")
		return
	}

	// Create a temporary ZIP file
	tmpFile, err := os.CreateTemp("", "dataset-*.zip")
	if err != nil {
		respondError(w, http.StatusInternalServerError, fmt.Sprintf("failed to create temp file: %v", err))
		return
	}
	defer os.Remove(tmpFile.Name())
	defer tmpFile.Close()

	// Create ZIP writer
	zipWriter := zip.NewWriter(tmpFile)
	defer zipWriter.Close()

	// Add each image and caption to ZIP
	for _, image := range images {
		if image.FilePath == "" {
			continue
		}

		// Add image file
		imageFile, err := os.Open(image.FilePath)
		if err != nil {
			continue // Skip if file doesn't exist
		}

		imageName := filepath.Base(image.FilePath)
		imageWriter, err := zipWriter.Create(imageName)
		if err != nil {
			imageFile.Close()
			continue
		}
		io.Copy(imageWriter, imageFile)
		imageFile.Close()

		// Add caption file
		ext := filepath.Ext(image.FilePath)
		captionPath := image.FilePath[:len(image.FilePath)-len(ext)] + ".txt"

		if captionData, err := os.ReadFile(captionPath); err == nil {
			captionName := imageName[:len(imageName)-len(ext)] + ".txt"
			captionWriter, err := zipWriter.Create(captionName)
			if err == nil {
				captionWriter.Write(captionData)
			}
		}
	}

	// Close ZIP writer to flush
	zipWriter.Close()

	// Read the ZIP file back
	zipData, err := os.ReadFile(tmpFile.Name())
	if err != nil {
		respondError(w, http.StatusInternalServerError, fmt.Sprintf("failed to read ZIP: %v", err))
		return
	}

	// Send ZIP file
	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s_training_images.zip", projectName))
	w.Write(zipData)
}

func (h *Handlers) GenerateCaption(w http.ResponseWriter, r *http.Request) {
	db := getProjectDB(r)
	imageID := chi.URLParam(r, "imageID")

	var image models.TrainingImage
	query := "SELECT * FROM training_images WHERE id = ?"
	if err := db.Get(&image, query, imageID); err != nil {
		respondError(w, http.StatusNotFound, "image not found")
		return
	}

	var artifact models.Artifact
	query = "SELECT * FROM artifacts WHERE id = ?"
	if err := db.Get(&artifact, query, image.ArtifactID); err != nil {
		respondError(w, http.StatusNotFound, "artifact not found")
		return
	}

	generator := service.NewCaptionGenerator(db)
	caption, err := generator.GenerateCaption(&artifact, &image)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"caption": caption,
	})
}

func (h *Handlers) BulkGenerateCaption(w http.ResponseWriter, r *http.Request) {
	respondError(w, http.StatusNotImplemented, "not yet implemented")
}

func (h *Handlers) ListLookup(w http.ResponseWriter, r *http.Request) {
	db := getProjectDB(r)
	tableName := chi.URLParam(r, "tableName")

	// Validate table exists and is a lookup table
	var exists int
	checkQuery := `SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=? AND 
	               (name LIKE '%_types' OR name LIKE '%_codes' OR name LIKE '%_states' OR name LIKE '%_roles')`
	if err := db.Get(&exists, checkQuery, tableName); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if exists == 0 {
		respondError(w, http.StatusBadRequest, "invalid or non-existent lookup table")
		return
	}

	query := fmt.Sprintf("SELECT * FROM %s ORDER BY code", tableName)

	// Use MapSlice to support dynamic columns
	rows, err := db.Queryx(query)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	var entries []map[string]interface{}
	for rows.Next() {
		entry := make(map[string]interface{})
		if err := rows.MapScan(entry); err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
		entries = append(entries, entry)
	}

	if entries == nil {
		entries = []map[string]interface{}{}
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"entries": entries,
	})
}

func (h *Handlers) GetLookup(w http.ResponseWriter, r *http.Request) {
	db := getProjectDB(r)
	tableName := chi.URLParam(r, "tableName")
	code := chi.URLParam(r, "code")

	// Validate table exists and is a lookup table
	var exists int
	checkQuery := `SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=? AND 
	               (name LIKE '%_types' OR name LIKE '%_codes' OR name LIKE '%_states' OR name LIKE '%_roles')`
	if err := db.Get(&exists, checkQuery, tableName); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if exists == 0 {
		respondError(w, http.StatusBadRequest, "invalid or non-existent lookup table")
		return
	}

	query := fmt.Sprintf("SELECT * FROM %s WHERE code = ?", tableName)

	rows, err := db.Queryx(query, code)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	if !rows.Next() {
		respondError(w, http.StatusNotFound, "entry not found")
		return
	}

	entry := make(map[string]interface{})
	if err := rows.MapScan(entry); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, entry)
}

func (h *Handlers) CreateLookup(w http.ResponseWriter, r *http.Request) {
	db := getProjectDB(r)
	tableName := chi.URLParam(r, "tableName")

	// Validate table exists and is a lookup table
	var exists int
	checkQuery := `SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=? AND 
	               (name LIKE '%_types' OR name LIKE '%_codes' OR name LIKE '%_states' OR name LIKE '%_roles')`
	if err := db.Get(&exists, checkQuery, tableName); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if exists == 0 {
		respondError(w, http.StatusBadRequest, "invalid or non-existent lookup table")
		return
	}

	var entry map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&entry); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	code, codeOk := entry["code"].(string)
	fullName, fullNameOk := entry["full_name"].(string)

	if !codeOk || !fullNameOk || code == "" || fullName == "" {
		respondError(w, http.StatusBadRequest, "code and full_name are required")
		return
	}

	// Add created_at timestamp
	entry["created_at"] = time.Now().Format("2006-01-02 15:04:05")

	// Build dynamic INSERT query
	var columns []string
	var placeholders []string
	var values []interface{}

	for col, val := range entry {
		columns = append(columns, col)
		placeholders = append(placeholders, "?")
		values = append(values, val)
	}

	query := fmt.Sprintf(
		"INSERT INTO %s (%s) VALUES (%s)",
		tableName,
		strings.Join(columns, ", "),
		strings.Join(placeholders, ", "),
	)

	if _, err := db.Exec(query, values...); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusCreated, entry)
}

func (h *Handlers) UpdateLookup(w http.ResponseWriter, r *http.Request) {
	db := getProjectDB(r)
	tableName := chi.URLParam(r, "tableName")
	code := chi.URLParam(r, "code")

	// Validate table exists and is a lookup table
	var exists int
	checkQuery := `SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=? AND 
	               (name LIKE '%_types' OR name LIKE '%_codes' OR name LIKE '%_states' OR name LIKE '%_roles')`
	if err := db.Get(&exists, checkQuery, tableName); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if exists == 0 {
		respondError(w, http.StatusBadRequest, "invalid or non-existent lookup table")
		return
	}

	var entry map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&entry); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Ensure code matches URL parameter
	entry["code"] = code

	// Build dynamic UPDATE query (exclude code and created_at from SET clause)
	var setClauses []string
	var values []interface{}

	for col, val := range entry {
		if col != "code" && col != "created_at" {
			setClauses = append(setClauses, fmt.Sprintf("%s = ?", col))
			values = append(values, val)
		}
	}

	// Add code for WHERE clause
	values = append(values, code)

	query := fmt.Sprintf(
		"UPDATE %s SET %s WHERE code = ?",
		tableName,
		strings.Join(setClauses, ", "),
	)

	if _, err := db.Exec(query, values...); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, entry)
}

func (h *Handlers) DeleteLookup(w http.ResponseWriter, r *http.Request) {
	db := getProjectDB(r)
	tableName := chi.URLParam(r, "tableName")
	code := chi.URLParam(r, "code")

	// Validate table exists and is a lookup table
	var exists int
	checkQuery := `SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=? AND 
	               (name LIKE '%_types' OR name LIKE '%_codes' OR name LIKE '%_states' OR name LIKE '%_roles')`
	if err := db.Get(&exists, checkQuery, tableName); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if exists == 0 {
		respondError(w, http.StatusBadRequest, "invalid or non-existent lookup table")
		return
	}

	query := fmt.Sprintf("DELETE FROM %s WHERE code = ?", tableName)
	if _, err := db.Exec(query, code); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"deleted": true,
	})
}

func (h *Handlers) ParseLookupCSV(w http.ResponseWriter, r *http.Request) {
	tableName := chi.URLParam(r, "tableName")

	// Validate table exists and is a lookup table
	db := getProjectDB(r)
	var exists int
	checkQuery := `SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=? AND 
	               (name LIKE '%_types' OR name LIKE '%_codes' OR name LIKE '%_states' OR name LIKE '%_roles')`
	if err := db.Get(&exists, checkQuery, tableName); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if exists == 0 {
		respondError(w, http.StatusBadRequest, "invalid or non-existent lookup table")
		return
	}

	// Parse multipart form
	if err := r.ParseMultipartForm(10 << 20); err != nil { // 10 MB max
		respondError(w, http.StatusBadRequest, "failed to parse form")
		return
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		respondError(w, http.StatusBadRequest, "file is required")
		return
	}
	defer file.Close()

	// Read CSV
	reader := csv.NewReader(file)
	records, err := reader.ReadAll()
	if err != nil {
		respondError(w, http.StatusBadRequest, fmt.Sprintf("failed to parse CSV: %v", err))
		return
	}

	if len(records) < 1 {
		respondError(w, http.StatusBadRequest, "CSV must have headers")
		return
	}

	headers := records[0]
	rowCount := len(records) - 1

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"headers":   headers,
		"row_count": rowCount,
	})
}

func (h *Handlers) ImportLookupCSV(w http.ResponseWriter, r *http.Request) {
	db := getProjectDB(r)
	tableName := chi.URLParam(r, "tableName")

	// Validate table exists and is a lookup table
	var exists int
	checkQuery := `SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=? AND 
	               (name LIKE '%_types' OR name LIKE '%_codes' OR name LIKE '%_states' OR name LIKE '%_roles')`
	if err := db.Get(&exists, checkQuery, tableName); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if exists == 0 {
		respondError(w, http.StatusBadRequest, "invalid or non-existent lookup table")
		return
	}

	// Parse multipart form
	if err := r.ParseMultipartForm(10 << 20); err != nil { // 10 MB max
		respondError(w, http.StatusBadRequest, "failed to parse form")
		return
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		respondError(w, http.StatusBadRequest, "file is required")
		return
	}
	defer file.Close()

	// Get column mapping from form data
	mappingJSON := r.FormValue("mapping")
	if mappingJSON == "" {
		respondError(w, http.StatusBadRequest, "mapping is required")
		return
	}

	var mapping map[string]string // tableColumn -> csvColumn
	if err := json.Unmarshal([]byte(mappingJSON), &mapping); err != nil {
		respondError(w, http.StatusBadRequest, "invalid mapping JSON")
		return
	}

	// Read CSV
	reader := csv.NewReader(file)
	records, err := reader.ReadAll()
	if err != nil {
		respondError(w, http.StatusBadRequest, fmt.Sprintf("failed to parse CSV: %v", err))
		return
	}

	if len(records) < 2 {
		respondError(w, http.StatusBadRequest, "CSV must have headers and at least one data row")
		return
	}

	headers := records[0]
	dataRows := records[1:]

	// Create header index map
	headerIndex := make(map[string]int)
	for i, h := range headers {
		headerIndex[h] = i
	}

	// Validate required mappings
	if _, hasCode := mapping["code"]; !hasCode {
		respondError(w, http.StatusBadRequest, "code column must be mapped")
		return
	}
	if _, hasFullName := mapping["full_name"]; !hasFullName {
		respondError(w, http.StatusBadRequest, "full_name column must be mapped")
		return
	}

	// Insert rows
	imported := 0
	skipped := 0
	var errors []string

	for rowNum, row := range dataRows {
		if len(row) != len(headers) {
			skipped++
			errors = append(errors, fmt.Sprintf("Row %d: column count mismatch", rowNum+2))
			continue
		}

		// Build entry map using column mapping
		entry := make(map[string]interface{})
		for tableCol, csvCol := range mapping {
			if csvCol != "" && csvCol != "(skip)" {
				csvIdx, ok := headerIndex[csvCol]
				if !ok {
					skipped++
					errors = append(errors, fmt.Sprintf("Row %d: CSV column '%s' not found", rowNum+2, csvCol))
					continue
				}
				if csvIdx < len(row) && row[csvIdx] != "" {
					entry[tableCol] = row[csvIdx]
				}
			}
		}

		// Validate required fields
		if entry["code"] == nil || entry["code"] == "" {
			skipped++
			errors = append(errors, fmt.Sprintf("Row %d: missing code", rowNum+2))
			continue
		}
		if entry["full_name"] == nil || entry["full_name"] == "" {
			skipped++
			errors = append(errors, fmt.Sprintf("Row %d: missing full_name", rowNum+2))
			continue
		}

		// Add created_at
		entry["created_at"] = time.Now().Format("2006-01-02 15:04:05")

		// Build INSERT query
		var columns []string
		var placeholders []string
		var values []interface{}

		for col, val := range entry {
			columns = append(columns, col)
			placeholders = append(placeholders, "?")
			values = append(values, val)
		}

		query := fmt.Sprintf(
			"INSERT OR REPLACE INTO %s (%s) VALUES (%s)",
			tableName,
			strings.Join(columns, ", "),
			strings.Join(placeholders, ", "),
		)

		if _, err := db.Exec(query, values...); err != nil {
			skipped++
			errors = append(errors, fmt.Sprintf("Row %d: %v", rowNum+2, err))
		} else {
			imported++
		}
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"imported": imported,
		"skipped":  skipped,
		"errors":   errors,
	})
}

func (h *Handlers) ExportLookupCSV(w http.ResponseWriter, r *http.Request) {
	db := getProjectDB(r)
	tableName := chi.URLParam(r, "tableName")

	// Validate table exists and is a lookup table
	var exists int
	checkQuery := `SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=? AND 
	               (name LIKE '%_types' OR name LIKE '%_codes' OR name LIKE '%_states' OR name LIKE '%_roles')`
	if err := db.Get(&exists, checkQuery, tableName); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if exists == 0 {
		respondError(w, http.StatusBadRequest, "invalid or non-existent lookup table")
		return
	}

	// Get column names from schema
	type ColumnInfo struct {
		Cid       int     `db:"cid"`
		Name      string  `db:"name"`
		Type      string  `db:"type"`
		NotNull   int     `db:"notnull"`
		DfltValue *string `db:"dflt_value"`
		Pk        int     `db:"pk"`
	}
	schemaQuery := fmt.Sprintf("PRAGMA table_info(%s)", tableName)
	var columns []ColumnInfo
	if err := db.Select(&columns, schemaQuery); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Filter out created_at
	var columnNames []string
	for _, col := range columns {
		if col.Name != "created_at" {
			columnNames = append(columnNames, col.Name)
		}
	}

	// Query all data
	query := fmt.Sprintf("SELECT * FROM %s ORDER BY code", tableName)
	rows, err := db.Queryx(query)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s.csv", tableName))

	// Write header
	for i, colName := range columnNames {
		if i > 0 {
			w.Write([]byte(","))
		}
		w.Write([]byte(colName))
	}
	w.Write([]byte("\n"))

	// Write data rows
	for rows.Next() {
		rowMap := make(map[string]interface{})
		if err := rows.MapScan(rowMap); err != nil {
			continue
		}

		for i, colName := range columnNames {
			if i > 0 {
				w.Write([]byte(","))
			}

			val := rowMap[colName]
			if val == nil {
				// Empty field
			} else {
				// Convert to string and escape quotes
				valStr := fmt.Sprintf("%v", val)
				// If contains comma or quote, wrap in quotes and escape internal quotes
				if strings.Contains(valStr, ",") || strings.Contains(valStr, "\"") || strings.Contains(valStr, "\n") {
					valStr = strings.ReplaceAll(valStr, "\"", "\"\"")
					w.Write([]byte("\"" + valStr + "\""))
				} else {
					w.Write([]byte(valStr))
				}
			}
		}
		w.Write([]byte("\n"))
	}
}

func (h *Handlers) CreateImportQueue(w http.ResponseWriter, r *http.Request) {
	respondError(w, http.StatusNotImplemented, "not yet implemented")
}

func (h *Handlers) GetImportQueue(w http.ResponseWriter, r *http.Request) {
	respondError(w, http.StatusNotImplemented, "not yet implemented")
}

func (h *Handlers) GetNextQueueItem(w http.ResponseWriter, r *http.Request) {
	respondError(w, http.StatusNotImplemented, "not yet implemented")
}

func (h *Handlers) ProcessQueueItem(w http.ResponseWriter, r *http.Request) {
	respondError(w, http.StatusNotImplemented, "not yet implemented")
}

func (h *Handlers) ExportTrainingData(w http.ResponseWriter, r *http.Request) {
	respondError(w, http.StatusNotImplemented, "not yet implemented")
}
