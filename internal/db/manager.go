package db

import (
	"database/sql"
	"embed"
	"fmt"
	"os"
	"path/filepath"

	"github.com/jmoiron/sqlx"
	_ "github.com/mattn/go-sqlite3"
)

//go:embed migrations/*.sql
var migrations embed.FS

type Manager struct {
	projectsPath string
	connections  map[string]*sqlx.DB
}

func NewManager(projectsPath string) *Manager {
	return &Manager{
		projectsPath: projectsPath,
		connections:  make(map[string]*sqlx.DB),
	}
}

func (m *Manager) GetDB(projectName string) (*sqlx.DB, error) {
	if db, exists := m.connections[projectName]; exists {
		return db, nil
	}

	dbPath := filepath.Join(m.projectsPath, projectName, "data", fmt.Sprintf("%s.db", projectName))

	if _, err := os.Stat(dbPath); os.IsNotExist(err) {
		return nil, fmt.Errorf("project database does not exist: %s", projectName)
	}

	db, err := sqlx.Open("sqlite3", dbPath)
	if err != nil {
		return nil, err
	}

	m.connections[projectName] = db
	return db, nil
}

func (m *Manager) CreateProject(projectName, universe string) error {
	projectDir := filepath.Join(m.projectsPath, projectName)
	dataDir := filepath.Join(projectDir, "data")
	imagesDir := filepath.Join(projectDir, "images")
	rawDir := filepath.Join(imagesDir, "raw")
	trainingDir := filepath.Join(imagesDir, "training")
	exportsDir := filepath.Join(projectDir, "exports")

	for _, dir := range []string{dataDir, rawDir, trainingDir, exportsDir} {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return err
		}
	}

	dbPath := filepath.Join(dataDir, fmt.Sprintf("%s.db", projectName))

	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return err
	}
	defer db.Close()

	migrationFiles := []string{"001_initial_schema.sql", "002_seed_data.sql"}

	for _, file := range migrationFiles {
		content, err := migrations.ReadFile(filepath.Join("migrations", file))
		if err != nil {
			return fmt.Errorf("failed to read migration %s: %v", file, err)
		}

		// Execute entire migration file at once
		if _, err := db.Exec(string(content)); err != nil {
			return fmt.Errorf("migration %s failed: %v", file, err)
		}
	}

	return nil
}

func (m *Manager) ListProjects() ([]string, error) {
	entries, err := os.ReadDir(m.projectsPath)
	if err != nil {
		return nil, err
	}

	var projects []string
	for _, entry := range entries {
		if entry.IsDir() {
			dbPath := filepath.Join(m.projectsPath, entry.Name(), "data", fmt.Sprintf("%s.db", entry.Name()))
			if _, err := os.Stat(dbPath); err == nil {
				projects = append(projects, entry.Name())
			}
		}
	}

	return projects, nil
}

func (m *Manager) ProjectExists(projectName string) bool {
	dbPath := filepath.Join(m.projectsPath, projectName, "data", fmt.Sprintf("%s.db", projectName))
	_, err := os.Stat(dbPath)
	return err == nil
}

func (m *Manager) DeleteProject(projectName string) error {
	// Close any open connection first
	if db, exists := m.connections[projectName]; exists {
		db.Close()
		delete(m.connections, projectName)
	}

	// Delete entire project directory
	projectDir := filepath.Join(m.projectsPath, projectName)
	if err := os.RemoveAll(projectDir); err != nil {
		return fmt.Errorf("failed to delete project directory: %v", err)
	}

	return nil
}
