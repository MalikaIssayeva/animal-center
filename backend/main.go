package main

import (
	"log"
	"os"
	"path/filepath"
	"sync"

	_ "animal-center-backend/docs"
	"animal-center-backend/handlers"
	"animal-center-backend/models"
	"animal-center-backend/storage"

	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

var (
	dataFile  = getEnv("DATA_FILE", "data/animals.json")
	usersFile = getEnv("USERS_FILE", "data/users.json")
	mu        sync.Mutex
)

func main() {
	if err := ensureDataFile(); err != nil {
		log.Fatalf("failed to prepare data file: %v", err)
	}

	if err := ensureUsersFile(); err != nil {
		log.Fatalf("failed to prepare users file: %v", err)
	}

	handlers.Init(dataFile, usersFile, &mu)

	r := gin.Default()
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
	r.Use(handlers.Cors())

	api := r.Group("/api")
	{
		api.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{"status": "ok"})
		})

		api.GET("/animals", handlers.GetAnimals)
		api.POST("/animals", handlers.CreateAnimal)
		api.GET("/animals/:id", handlers.GetAnimalByID)
		api.DELETE("/animals/:id", handlers.DeleteAnimal)
		api.POST("/animals/:id/adopt-request", handlers.RequestAdoption)
		api.PATCH("/animals/:id/status", handlers.UpdateAnimalStatus)

		api.GET("/analytics", handlers.GetAnalytics)
		api.POST("/classify", handlers.ClassifyAnimal)

		api.POST("/register", handlers.RegisterUser)
		api.POST("/login", handlers.LoginUser)
		api.GET("/users/:id/favorites", handlers.GetUserFavorites)
		api.POST("/users/:id/favorites/:animalId", handlers.AddFavorite)
		api.DELETE("/users/:id/favorites/:animalId", handlers.RemoveFavorite)
		api.GET("/users/:id", handlers.GetUserByID)
	}

	log.Println("server started on :8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("server error: %v", err)
	}
}

func getEnv(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}

func ensureDataFile() error {
	dir := filepath.Dir(dataFile)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}

	if _, err := os.Stat(dataFile); os.IsNotExist(err) {
		return storage.WriteAnimals(dataFile, []models.Animal{})
	}

	return nil
}

func ensureUsersFile() error {
	dir := filepath.Dir(usersFile)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}

	if _, err := os.Stat(usersFile); os.IsNotExist(err) {
		return storage.WriteUsers(usersFile, []models.User{})
	}

	return nil
}