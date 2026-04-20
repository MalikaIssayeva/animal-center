// @title Animal Center API
// @version 1.0
// @description API для приюта животных
// @host localhost:8080
// @BasePath /api
package main

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"

	_ "animal-center-backend/docs"

	"github.com/gin-gonic/gin"

	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

type Animal struct {
	ID                  int      `json:"id"`
	Name                string   `json:"name"`
	Type                string   `json:"type"`
	Breed               string   `json:"breed"`
	Age                 string   `json:"age"`
	Gender              string   `json:"gender"`
	Health              string   `json:"health"`
	Description         string   `json:"description"`
	Image               string   `json:"image"`
	Status              string   `json:"status"`
	Tags                []string `json:"tags,omitempty"`
	OwnerID             int      `json:"ownerId"`
	AdoptionRequestedBy int      `json:"adoptionRequestedBy"`
}

type User struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Email       string `json:"email"`
	Password    string `json:"password"`
	Role        string `json:"role"`
	AccountType string `json:"accountType"`
	Favorites   []int  `json:"favorites"`
}

type RegisterInput struct {
	Name        string `json:"name"`
	Email       string `json:"email"`
	Password    string `json:"password"`
	AccountType string `json:"accountType"`
}

type LoginInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type StatusUpdateInput struct {
	Status string `json:"status"`
}

type AdoptionRequestInput struct {
	UserID int `json:"userId"`
}

type SafeUser struct {
	ID          int   `json:"id"`
	Name        string `json:"name"`
	Email       string `json:"email"`
	Role        string `json:"role"`
	AccountType string `json:"accountType"`
	Favorites   []int  `json:"favorites"`
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

	r := gin.Default()
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
	r.Use(cors())

	api := r.Group("/api")
	{
		api.GET("/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"status": "ok"})
		})

		api.GET("/animals", getAnimals)
		api.POST("/animals", createAnimal)
		api.GET("/animals/:id", getAnimalByID)
		api.DELETE("/animals/:id", deleteAnimal)
		api.POST("/animals/:id/adopt-request", requestAdoption)
		api.PATCH("/animals/:id/status", updateAnimalStatus)

		api.GET("/analytics", getAnalytics)
		api.POST("/classify", classifyAnimal)
		api.POST("/register", registerUser)
		api.POST("/login", loginUser)
		api.GET("/users/:id/favorites", getUserFavorites)
		api.POST("/users/:id/favorites/:animalId", addFavorite)
		api.DELETE("/users/:id/favorites/:animalId", removeFavorite)
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

func cors() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, PATCH, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

func ensureDataFile() error {
	dir := filepath.Dir(dataFile)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}

	if _, err := os.Stat(dataFile); os.IsNotExist(err) {
		initial := []Animal{}
		return writeAnimals(initial)
	}

	return nil
}

func ensureUsersFile() error {
	dir := filepath.Dir(usersFile)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}

	if _, err := os.Stat(usersFile); os.IsNotExist(err) {
		initial := []User{}
		return writeUsers(initial)
	}

	return nil
}

func readAnimals() ([]Animal, error) {
	data, err := os.ReadFile(dataFile)
	if err != nil {
		return nil, err
	}

	if len(bytes.TrimSpace(data)) == 0 {
		return []Animal{}, nil
	}

	var animals []Animal
	if err := json.Unmarshal(data, &animals); err != nil {
		return nil, err
	}

	return animals, nil
}

func writeAnimals(animals []Animal) error {
	data, err := json.MarshalIndent(animals, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(dataFile, data, 0o644)
}

func readUsers() ([]User, error) {
	data, err := os.ReadFile(usersFile)
	if err != nil {
		return nil, err
	}

	if len(bytes.TrimSpace(data)) == 0 {
		return []User{}, nil
	}

	var users []User
	if err := json.Unmarshal(data, &users); err != nil {
		return nil, err
	}

	return users, nil
}

func writeUsers(users []User) error {
	data, err := json.MarshalIndent(users, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(usersFile, data, 0o644)
}

func nextUserID(users []User) int {
	maxID := 0
	for _, u := range users {
		if u.ID > maxID {
			maxID = u.ID
		}
	}
	return maxID + 1
}

func toSafeUser(user User) SafeUser {
	return SafeUser{
		ID:          user.ID,
		Name:        user.Name,
		Email:       user.Email,
		Role:        user.Role,
		AccountType: user.AccountType,
		Favorites:   user.Favorites,
	}
}

func nextAnimalID(animals []Animal) int {
	maxID := 0
	for _, a := range animals {
		if a.ID > maxID {
			maxID = a.ID
		}
	}
	return maxID + 1
}

// @Summary Получить список животных
// @Description Возвращает список животных с поиском, фильтрацией и сортировкой
// @Tags animals
// @Produce json
// @Param search query string false "Поиск по имени или породе"
// @Param type query string false "Тип животного"
// @Param sort query string false "Сортировка: name_asc, name_desc, age_asc, age_desc"
// @Success 200 {array} Animal
// @Failure 500 {object} map[string]string
// @Router /animals [get]
func getAnimals(c *gin.Context) {
	search := strings.TrimSpace(c.Query("search"))
	animalType := strings.TrimSpace(c.Query("type"))
	sortBy := strings.TrimSpace(c.Query("sort"))

	mu.Lock()
	animals, err := readAnimals()
	mu.Unlock()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка при чтении животных"})
		return
	}

	filtered := make([]Animal, 0)
	for _, a := range animals {
		matchSearch := search == "" ||
			containsFold(a.Name, search) ||
			containsFold(a.Breed, search)

		matchType := animalType == "" ||
			animalType == "Все" ||
			strings.EqualFold(a.Type, animalType)

		if matchSearch && matchType {
			filtered = append(filtered, a)
		}
	}

	switch sortBy {
	case "name_asc":
		sort.Slice(filtered, func(i, j int) bool {
			return strings.ToLower(filtered[i].Name) < strings.ToLower(filtered[j].Name)
		})
	case "name_desc":
		sort.Slice(filtered, func(i, j int) bool {
			return strings.ToLower(filtered[i].Name) > strings.ToLower(filtered[j].Name)
		})
	case "age_asc":
		sort.Slice(filtered, func(i, j int) bool {
			return extractNumber(filtered[i].Age) < extractNumber(filtered[j].Age)
		})
	case "age_desc":
		sort.Slice(filtered, func(i, j int) bool {
			return extractNumber(filtered[i].Age) > extractNumber(filtered[j].Age)
		})
	default:
		sort.Slice(filtered, func(i, j int) bool {
			return filtered[i].ID > filtered[j].ID
		})
	}

	c.JSON(http.StatusOK, filtered)
}

// @Summary Добавить животное
// @Description Создает новую карточку животного
// @Tags animals
// @Accept json
// @Produce json
// @Param input body Animal true "Данные животного"
// @Success 201 {object} Animal
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /animals [post]
func createAnimal(c *gin.Context) {
	var input Animal
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректные данные"})
		return
	}

	input.Name = strings.TrimSpace(input.Name)
	input.Type = strings.TrimSpace(input.Type)
	input.Breed = strings.TrimSpace(input.Breed)
	input.Age = strings.TrimSpace(input.Age)
	input.Gender = strings.TrimSpace(input.Gender)
	input.Health = strings.TrimSpace(input.Health)
	input.Description = strings.TrimSpace(input.Description)

	if input.Name == "" || input.Type == "" || input.Breed == "" || input.Age == "" || input.Gender == "" || input.Health == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Заполните обязательные поля"})
		return
	}

	if input.Image == "" {
		switch strings.ToLower(input.Type) {
		case "кошка":
			input.Image = "🐱"
		case "собака":
			input.Image = "🐶"
		case "птица":
			input.Image = "🐦"
		case "хомяк":
			input.Image = "🐹"
		default:
			input.Image = "🐾"
		}
	}

	if input.Status == "" {
		if containsFold(input.Health, "леч") {
			input.Status = "treatment"
		} else {
			input.Status = "available"
		}
	}

	mu.Lock()
	defer mu.Unlock()

	animals, err := readAnimals()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось прочитать данные"})
		return
	}

	input.AdoptionRequestedBy = 0
	input.ID = nextAnimalID(animals)
	animals = append(animals, input)

	if err := writeAnimals(animals); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось сохранить животное"})
		return
	}

	c.JSON(http.StatusCreated, input)
}

// @Summary Регистрация пользователя
// @Description Создает нового пользователя с типом owner или adopter
// @Tags auth
// @Accept json
// @Produce json
// @Param input body RegisterInput true "Данные регистрации"
// @Success 201 {object} SafeUser
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /register [post]
func registerUser(c *gin.Context) {
	var input RegisterInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректные данные"})
		return
	}

	input.Name = strings.TrimSpace(input.Name)
	input.Email = strings.TrimSpace(strings.ToLower(input.Email))
	input.Password = strings.TrimSpace(input.Password)
	input.AccountType = strings.TrimSpace(strings.ToLower(input.AccountType))

	if input.Name == "" || input.Email == "" || input.Password == "" || input.AccountType == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Заполните все поля"})
		return
	}

	if input.AccountType != "owner" && input.AccountType != "adopter" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Тип аккаунта должен быть owner или adopter"})
		return
	}

	mu.Lock()
	defer mu.Unlock()

	users, err := readUsers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось прочитать пользователей"})
		return
	}

	for _, u := range users {
		if strings.EqualFold(u.Email, input.Email) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Пользователь с таким email уже существует"})
			return
		}
	}

	user := User{
		ID:          nextUserID(users),
		Name:        input.Name,
		Email:       input.Email,
		Password:    input.Password,
		Role:        "user",
		AccountType: input.AccountType,
		Favorites:   []int{},
	}

	users = append(users, user)

	if err := writeUsers(users); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось сохранить пользователя"})
		return
	}

	c.JSON(http.StatusCreated, toSafeUser(user))
}

// @Summary Вход пользователя
// @Description Авторизация по email и паролю
// @Tags auth
// @Accept json
// @Produce json
// @Param input body LoginInput true "Данные для входа"
// @Success 200 {object} SafeUser
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /login [post]
func loginUser(c *gin.Context) {
	var input LoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректные данные"})
		return
	}

	input.Email = strings.TrimSpace(strings.ToLower(input.Email))
	input.Password = strings.TrimSpace(input.Password)

	if input.Email == "" || input.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Введите email и пароль"})
		return
	}

	mu.Lock()
	users, err := readUsers()
	mu.Unlock()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось прочитать пользователей"})
		return
	}

	for _, u := range users {
		if strings.EqualFold(u.Email, input.Email) && u.Password == input.Password {
			c.JSON(http.StatusOK, toSafeUser(u))
			return
		}
	}

	c.JSON(http.StatusUnauthorized, gin.H{"error": "Неверный email или пароль"})
}

func getUserFavorites(c *gin.Context) {
	userID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный ID пользователя"})
		return
	}

	mu.Lock()
	defer mu.Unlock()

	users, err := readUsers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось прочитать пользователей"})
		return
	}

	for _, u := range users {
		if u.ID == userID {
			c.JSON(http.StatusOK, gin.H{"favorites": u.Favorites})
			return
		}
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "Пользователь не найден"})
}

func addFavorite(c *gin.Context) {
	userID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный ID пользователя"})
		return
	}

	animalID, err := strconv.Atoi(c.Param("animalId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный ID животного"})
		return
	}

	mu.Lock()
	defer mu.Unlock()

	users, err := readUsers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось прочитать пользователей"})
		return
	}

	animals, err := readAnimals()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось прочитать животных"})
		return
	}

	animalExists := false
	for _, a := range animals {
		if a.ID == animalID {
			animalExists = true
			break
		}
	}
	if !animalExists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Животное не найдено"})
		return
	}

	for i, u := range users {
		if u.ID == userID {
			for _, favID := range u.Favorites {
				if favID == animalID {
					c.JSON(http.StatusOK, toSafeUser(users[i]))
					return
				}
			}

			users[i].Favorites = append(users[i].Favorites, animalID)

			if err := writeUsers(users); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось сохранить избранное"})
				return
			}

			c.JSON(http.StatusOK, toSafeUser(users[i]))
			return
		}
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "Пользователь не найден"})
}

func removeFavorite(c *gin.Context) {
	userID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный ID пользователя"})
		return
	}

	animalID, err := strconv.Atoi(c.Param("animalId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный ID животного"})
		return
	}

	mu.Lock()
	defer mu.Unlock()

	users, err := readUsers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось прочитать пользователей"})
		return
	}

	for i, u := range users {
		if u.ID == userID {
			filtered := make([]int, 0, len(u.Favorites))
			for _, favID := range u.Favorites {
				if favID != animalID {
					filtered = append(filtered, favID)
				}
			}

			users[i].Favorites = filtered

			if err := writeUsers(users); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось сохранить избранное"})
				return
			}

			c.JSON(http.StatusOK, toSafeUser(users[i]))
			return
		}
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "Пользователь не найден"})
}

// @Summary Получить животное по ID
// @Description Возвращает одно животное по его ID
// @Tags animals
// @Produce json
// @Param id path int true "ID животного"
// @Success 200 {object} Animal
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /animals/{id} [get]
func getAnimalByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный ID"})
		return
	}

	mu.Lock()
	animals, err := readAnimals()
	mu.Unlock()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка при чтении животного"})
		return
	}

	for _, a := range animals {
		if a.ID == id {
			c.JSON(http.StatusOK, a)
			return
		}
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "Животное не найдено"})
}

// @Summary Удалить животное
// @Description Удаляет животное по ID
// @Tags animals
// @Produce json
// @Param id path int true "ID животного"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /animals/{id} [delete]
func deleteAnimal(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный ID"})
		return
	}

	mu.Lock()
	defer mu.Unlock()

	animals, err := readAnimals()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка при чтении данных"})
		return
	}

	filtered := make([]Animal, 0, len(animals))
	found := false

	for _, a := range animals {
		if a.ID == id {
			found = true
			continue
		}
		filtered = append(filtered, a)
	}

	if !found {
		c.JSON(http.StatusNotFound, gin.H{"error": "Животное не найдено"})
		return
	}

	if err := writeAnimals(filtered); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось удалить животное"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Животное удалено"})
}

// @Summary Подать заявку на усыновление
// @Description Создает заявку на усыновление животного и переводит его в статус pending
// @Tags animals
// @Accept json
// @Produce json
// @Param id path int true "ID животного"
// @Param input body AdoptionRequestInput true "ID пользователя"
// @Success 200 {object} Animal
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /animals/{id}/adopt-request [post]
func requestAdoption(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный ID животного"})
		return
	}

	var input AdoptionRequestInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректные данные"})
		return
	}

	if input.UserID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный ID пользователя"})
		return
	}

	mu.Lock()
	defer mu.Unlock()

	animals, err := readAnimals()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось прочитать животных"})
		return
	}

	for i, a := range animals {
		if a.ID == id {
			if a.Status != "available" {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Животное недоступно для усыновления"})
				return
			}

			animals[i].Status = "pending"
			animals[i].AdoptionRequestedBy = input.UserID

			if err := writeAnimals(animals); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось сохранить заявку"})
				return
			}

			c.JSON(http.StatusOK, animals[i])
			return
		}
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "Животное не найдено"})
}


// @Summary Изменить статус животного
// @Description Обновляет статус животного: available, adopted или treatment
// @Tags animals
// @Accept json
// @Produce json
// @Param id path int true "ID животного"
// @Param input body StatusUpdateInput true "Новый статус"
// @Success 200 {object} Animal
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /animals/{id}/status [patch]
func updateAnimalStatus(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный ID"})
		return
	}

	var input StatusUpdateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректные данные"})
		return
	}

	input.Status = strings.TrimSpace(strings.ToLower(input.Status))
	if input.Status != "available" &&
		input.Status != "pending" &&
		input.Status != "adopted" &&
		input.Status != "treatment" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Недопустимый статус"})
		return
	}
	mu.Lock()
	defer mu.Unlock()

	animals, err := readAnimals()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось прочитать животных"})
		return
	}

	for i, a := range animals {
		if a.ID == id {
			animals[i].Status = input.Status

			if input.Status == "available" {
				animals[i].AdoptionRequestedBy = 0
			}

			if input.Status == "adopted" {
				// requester остается сохранённым, чтобы было видно, кто подал заявку
			}

			if input.Status == "treatment" && !containsFold(animals[i].Health, "леч") {
				animals[i].Health = "На лечении"
			}

			if err := writeAnimals(animals); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось сохранить статус"})
				return
			}

			c.JSON(http.StatusOK, animals[i])
			return
		}
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "Животное не найдено"})
}

// @Summary Получить аналитику
// @Description Возвращает статистику по животным
// @Tags analytics
// @Produce json
// @Success 200 {object} Analytics
// @Failure 500 {object} map[string]string
// @Router /analytics [get]
func getAnalytics(c *gin.Context) {
	mu.Lock()
	animals, err := readAnimals()
	mu.Unlock()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка при получении аналитики"})
		return
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

	typeDistribution := make([]Distribution, 0, len(typeCount))
	for label, value := range typeCount {
		typeDistribution = append(typeDistribution, Distribution{
			Label: label,
			Value: value,
		})
	}

	sort.Slice(typeDistribution, func(i, j int) bool {
		return typeDistribution[i].Value > typeDistribution[j].Value
	})

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

// @Summary Классификация животного
// @Description Загружает изображение и отправляет его в ML service
// @Tags classify
// @Accept mpfd
// @Produce json
// @Param file formData file true "Изображение животного"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Failure 502 {object} map[string]interface{}
// @Router /classify [post]
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

	if _, err := io.Copy(part, file); err != nil {
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
			"error":   "ML service вернул ошибку",
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

func extractNumber(s string) int {
	var num strings.Builder

	for _, ch := range s {
		if ch >= '0' && ch <= '9' {
			num.WriteRune(ch)
		}
	}

	if num.Len() == 0 {
		return 0
	}

	n, err := strconv.Atoi(num.String())
	if err != nil {
		return 0
	}

	return n
}

func containsFold(s, sub string) bool {
	return strings.Contains(strings.ToLower(s), strings.ToLower(sub))
}