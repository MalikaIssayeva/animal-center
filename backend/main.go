package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"sort"
	"strconv"
	"strings"

	"bytes"
	"encoding/json"
	"io"
	"mime/multipart"

	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"
)

type Animal struct {
	ID          int      `json:"id"`
	Name        string   `json:"name"`
	Type        string   `json:"type"`
	Breed       string   `json:"breed"`
	Age         string   `json:"age"`
	Gender      string   `json:"gender"`
	Health      string   `json:"health"`
	Description string   `json:"description"`
	Image       string   `json:"image"`
	Status      string   `json:"status"`
	Tags        []string `json:"tags,omitempty"`
}

type ClassificationResponse struct {
	PredictedType  string             `json:"predictedType"`
	PredictedBreed string             `json:"predictedBreed"`
	AgeCategory    string             `json:"ageCategory"`
	HealthStatus   string             `json:"healthStatus"`
	Confidence     int                `json:"confidence"`
	Alternatives   []PredictionResult `json:"alternatives"`
}

type PredictionResult struct {
	Label      string `json:"label"`
	Confidence int    `json:"confidence"`
}

type Analytics struct {
	TotalAnimals     int            `json:"totalAnimals"`
	AdoptedAnimals   int            `json:"adoptedAnimals"`
	NeedTreatment    int            `json:"needTreatment"`
	ModelAccuracy    int            `json:"modelAccuracy"`
	MonthlyIntake    []MonthlyStat  `json:"monthlyIntake"`
	TypeDistribution []Distribution `json:"typeDistribution"`
	BreedTable       []BreedStat    `json:"breedTable"`
}

type MonthlyStat struct {
	Month string `json:"month"`
	Count int    `json:"count"`
}

type Distribution struct {
	Label string `json:"label"`
	Value int    `json:"value"`
}

type BreedStat struct {
	Breed  string `json:"breed"`
	Count  int    `json:"count"`
	Status string `json:"status"`
}

var db *sql.DB

func main() {
	var err error
	db, err = initDB()
	if err != nil {
		log.Fatalf("database connection failed: %v", err)
	}
	defer db.Close()

	r := gin.Default()
	r.Use(cors())

	api := r.Group("/api")
	{
		api.GET("/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"status": "ok"})
		})

		api.GET("/animals", getAnimals)
		api.POST("/animals", createAnimal)
		api.GET("/animals/:id", getAnimalByID)
		api.GET("/analytics", getAnalytics)
		api.POST("/classify", classifyAnimal)
	}

	log.Println("server started on :8080")
	r.Run(":8080")
}

func initDB() (*sql.DB, error) {
	host := getEnv("DB_HOST", "localhost")
	port := getEnv("DB_PORT", "5432")
	user := getEnv("DB_USER", "postgres")
	password := getEnv("DB_PASSWORD", "postgres")
	name := getEnv("DB_NAME", "animal_center")
	sslmode := getEnv("DB_SSLMODE", "disable")

	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		host, port, user, password, name, sslmode,
	)

	database, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, err
	}

	if err := database.Ping(); err != nil {
		return nil, err
	}

	return database, nil
}

func getEnv(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}

func cors() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

func getAnimals(c *gin.Context) {
	search := c.Query("search")
	animalType := c.Query("type")

	query := `
		SELECT id, name, type, breed, age, gender, health, description, image, status
		FROM animals
		WHERE ($1 = '' OR LOWER(name) LIKE LOWER('%' || $1 || '%') OR LOWER(breed) LIKE LOWER('%' || $1 || '%'))
		  AND ($2 = '' OR $2 = 'Все' OR LOWER(type) = LOWER($2))
		ORDER BY id DESC
	`

	rows, err := db.Query(query, search, animalType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка при получении животных"})
		return
	}
	defer rows.Close()

	animals := []Animal{}
	for rows.Next() {
		var a Animal
		if err := rows.Scan(
			&a.ID,
			&a.Name,
			&a.Type,
			&a.Breed,
			&a.Age,
			&a.Gender,
			&a.Health,
			&a.Description,
			&a.Image,
			&a.Status,
		); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка чтения данных"})
			return
		}
		animals = append(animals, a)
	}

	c.JSON(http.StatusOK, animals)
}

func createAnimal(c *gin.Context) {
	var input Animal
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректные данные"})
		return
	}

	if input.Image == "" {
		if input.Type == "Кошка" {
			input.Image = "🐱"
		} else {
			input.Image = "🐶"
		}
	}

	if input.Status == "" {
		input.Status = "available"
	}

	query := `
		INSERT INTO animals (name, type, breed, age, gender, health, description, image, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id
	`

	err := db.QueryRow(
		query,
		input.Name,
		input.Type,
		input.Breed,
		input.Age,
		input.Gender,
		input.Health,
		input.Description,
		input.Image,
		input.Status,
	).Scan(&input.ID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось сохранить животное"})
		return
	}

	c.JSON(http.StatusCreated, input)
}

func getAnimalByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный ID"})
		return
	}

	var a Animal
	query := `
		SELECT id, name, type, breed, age, gender, health, description, image, status
		FROM animals
		WHERE id = $1
	`

	err = db.QueryRow(query, id).Scan(
		&a.ID,
		&a.Name,
		&a.Type,
		&a.Breed,
		&a.Age,
		&a.Gender,
		&a.Health,
		&a.Description,
		&a.Image,
		&a.Status,
	)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Животное не найдено"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка при получении животного"})
		return
	}

	c.JSON(http.StatusOK, a)
}

func getAnalytics(c *gin.Context) {
	rows, err := db.Query(`
		SELECT id, name, type, breed, age, gender, health, description, image, status
		FROM animals
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка при получении аналитики"})
		return
	}
	defer rows.Close()

	animals := []Animal{}
	for rows.Next() {
		var a Animal
		if err := rows.Scan(
			&a.ID,
			&a.Name,
			&a.Type,
			&a.Breed,
			&a.Age,
			&a.Gender,
			&a.Health,
			&a.Description,
			&a.Image,
			&a.Status,
		); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка чтения аналитики"})
			return
		}
		animals = append(animals, a)
	}

	total := len(animals)
	adopted := 0
	treatment := 0
	typeCount := map[string]int{}
	breedCount := map[string]int{}

	for _, a := range animals {
		if a.Status == "adopted" {
			adopted++
		}
		if containsFold(a.Health, "леч") || a.Status == "treatment" {
			treatment++
		}
		typeCount[a.Type]++
		breedCount[a.Breed]++
	}

	breedTable := make([]BreedStat, 0, len(breedCount))
	for breed, count := range breedCount {
		status := "Норма"
		if count >= 3 {
			status = "Много"
		}
		breedTable = append(breedTable, BreedStat{
			Breed:  breed,
			Count:  count,
			Status: status,
		})
	}
	sort.Slice(breedTable, func(i, j int) bool {
		return breedTable[i].Count > breedTable[j].Count
	})

	typeDistribution := []Distribution{}
	for label, value := range typeCount {
		typeDistribution = append(typeDistribution, Distribution{
			Label: label,
			Value: value,
		})
	}

	c.JSON(http.StatusOK, Analytics{
		TotalAnimals:   total,
		AdoptedAnimals: adopted,
		NeedTreatment:  treatment,
		ModelAccuracy:  94,
		MonthlyIntake: []MonthlyStat{
			{Month: "Окт", Count: 18},
			{Month: "Ноя", Count: 24},
			{Month: "Дек", Count: 13},
			{Month: "Янв", Count: 29},
			{Month: "Фев", Count: 20},
			{Month: "Мар", Count: 26},
		},
		TypeDistribution: typeDistribution,
		BreedTable:       breedTable,
	})
}

func classifyAnimal(c *gin.Context) {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Файл не был загружен"})
		return
	}

	file, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось открыть файл"})
		return
	}
	defer file.Close()

	var requestBody bytes.Buffer
	writer := multipart.NewWriter(&requestBody)

	part, err := writer.CreateFormFile("file", fileHeader.Filename)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось подготовить файл"})
		return
	}

	_, err = io.Copy(part, file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось скопировать файл"})
		return
	}

	if err := writer.Close(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось завершить form-data"})
		return
	}

	mlURL := getEnv("ML_SERVICE_URL", "http://localhost:8000")
	resp, err := http.Post(
		mlURL+"/predict",
		writer.FormDataContentType(),
		&requestBody,
	)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "ML service недоступен"})
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось прочитать ответ ML service"})
		return
	}

	if resp.StatusCode != http.StatusOK {
		c.JSON(http.StatusBadGateway, gin.H{
			"error": "ML service вернул ошибку",
			"details": string(body),
		})
		return
	}

	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Некорректный JSON от ML service"})
		return
	}

	c.JSON(http.StatusOK, result)
}

func containsFold(s, sub string) bool {
	return strings.Contains(strings.ToLower(s), strings.ToLower(sub))
}