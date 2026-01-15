package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/mshaver/lora-prep/internal/api"
	"github.com/mshaver/lora-prep/internal/db"
)

func main() {
	projectsPath := os.Getenv("PROJECTS_PATH")
	if projectsPath == "" {
		projectsPath = "./projects"
	}

	if err := os.MkdirAll(projectsPath, 0755); err != nil {
		log.Fatal("Failed to create projects directory:", err)
	}

	dbManager := db.NewManager(projectsPath)

	handlers := api.NewHandlers(dbManager, projectsPath)

	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:*", "http://127.0.0.1:*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
	}))

	r.Route("/api", func(r chi.Router) {
		r.Get("/projects", handlers.ListProjects)
		r.Post("/projects", handlers.CreateProject)
		r.Delete("/projects", handlers.DeleteProject)

		r.Route("/projects/{projectName}", func(r chi.Router) {
			r.Use(handlers.ProjectContext)

			r.Get("/lookup-tables", handlers.ListLookupTables)
			r.Post("/lookup-tables", handlers.CreateLookupTable)
			r.Delete("/lookup-tables", handlers.DeleteLookupTable)

			r.Get("/artifacts", handlers.ListArtifacts)
			r.Post("/artifacts", handlers.CreateArtifact)
			r.Get("/artifacts/{artifactID}", handlers.GetArtifact)
			r.Put("/artifacts/{artifactID}", handlers.UpdateArtifact)
			r.Delete("/artifacts/{artifactID}", handlers.DeleteArtifact)

			r.Get("/images", handlers.ListImages)
			r.Post("/images", handlers.CreateImage)
			r.Get("/images/{imageID}", handlers.GetImage)
			r.Put("/images/{imageID}", handlers.UpdateImage)
			r.Delete("/images/{imageID}", handlers.DeleteImage)

			r.Post("/images/{imageID}/caption", handlers.GenerateCaption)
			r.Post("/images/bulk-caption", handlers.BulkGenerateCaption)

			r.Get("/lookups/{tableName}", handlers.ListLookup)
			r.Get("/lookups/{tableName}/schema", handlers.GetLookupTableSchema)
			r.Put("/lookups/{tableName}/artifact-types", handlers.UpdateLookupTableArtifactTypes)
			r.Post("/lookups/{tableName}/columns", handlers.AddLookupTableColumn)
			r.Delete("/lookups/{tableName}/columns/{columnName}", handlers.DeleteLookupTableColumn)
			r.Put("/lookups/{tableName}/columns/{columnName}/display-name", handlers.UpdateColumnDisplayName)
			r.Get("/lookups/{tableName}/{code}", handlers.GetLookup)
			r.Post("/lookups/{tableName}", handlers.CreateLookup)
			r.Put("/lookups/{tableName}/{code}", handlers.UpdateLookup)
			r.Delete("/lookups/{tableName}/{code}", handlers.DeleteLookup)
			r.Post("/lookups/{tableName}/import/parse", handlers.ParseLookupCSV)
			r.Post("/lookups/{tableName}/import", handlers.ImportLookupCSV)
			r.Get("/lookups/{tableName}/export", handlers.ExportLookupCSV)

			r.Post("/import-queue", handlers.CreateImportQueue)
			r.Get("/import-queue/{queueID}", handlers.GetImportQueue)
			r.Get("/import-queue/{queueID}/next", handlers.GetNextQueueItem)
			r.Post("/import-queue/{queueID}/process", handlers.ProcessQueueItem)

			r.Post("/export", handlers.ExportTrainingData)
		})
	})

	webDir := os.Getenv("WEB_DIR")
	if webDir == "" {
		webDir = "./web/dist"
	}

	if _, err := os.Stat(webDir); err == nil {
		// Serve static files
		fs := http.FileServer(http.Dir(webDir))
		r.Get("/*", func(w http.ResponseWriter, req *http.Request) {
			// If it's a file request (has extension), serve it
			if strings.Contains(req.URL.Path, ".") {
				fs.ServeHTTP(w, req)
				return
			}
			// Otherwise serve index.html for SPA routing
			http.ServeFile(w, req, filepath.Join(webDir, "index.html"))
		})
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	addr := fmt.Sprintf(":%s", port)
	log.Printf("Starting server on %s", addr)
	log.Printf("Projects directory: %s", projectsPath)

	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatal(err)
	}
}
