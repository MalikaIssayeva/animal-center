package handlers

import (
	"net/http"
	"sort"
	"strconv"
	"strings"

	"animal-center-backend/models"
	"animal-center-backend/storage"
	"animal-center-backend/utils"

	"github.com/gin-gonic/gin"
)

// @Summary Получить список животных
// @Description Возвращает список животных с поиском, фильтрацией и сортировкой
// @Tags animals
// @Produce json
// @Param search query string false "Поиск по имени или породе"
// @Param type query string false "Тип животного"
// @Param sort query string false "Сортировка: name_asc, name_desc, age_asc, age_desc"
// @Success 200 {array} models.Animal
// @Failure 500 {object} map[string]string
// @Router /animals [get]
func GetAnimals(c *gin.Context) {
	search := strings.TrimSpace(c.Query("search"))
	animalType := strings.TrimSpace(c.Query("type"))
	sortBy := strings.TrimSpace(c.Query("sort"))

	Mu.Lock()
	animals, err := storage.ReadAnimals(DataFile)
	Mu.Unlock()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка при чтении животных"})
		return
	}

	filtered := make([]models.Animal, 0)
	for _, a := range animals {
		matchSearch := search == "" ||
			utils.ContainsFold(a.Name, search) ||
			utils.ContainsFold(a.Breed, search)

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
			return utils.ExtractNumber(filtered[i].Age) < utils.ExtractNumber(filtered[j].Age)
		})
	case "age_desc":
		sort.Slice(filtered, func(i, j int) bool {
			return utils.ExtractNumber(filtered[i].Age) > utils.ExtractNumber(filtered[j].Age)
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
// @Param input body models.Animal true "Данные животного"
// @Success 201 {object} models.Animal
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /animals [post]
func CreateAnimal(c *gin.Context) {
	var input models.Animal
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
	input.Source = strings.TrimSpace(input.Source)
	input.Description = strings.TrimSpace(input.Description)

	if input.Name == "" ||
		input.Type == "" ||
		input.Breed == "" ||
		input.Age == "" ||
		input.Gender == "" ||
		input.Health == "" ||
		input.Source == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Заполните обязательные поля"})
		return
	}

	if input.Status == "" {
		if utils.ContainsFold(input.Health, "леч") {
			input.Status = "treatment"
		} else {
			input.Status = "available"
		}
	}

	Mu.Lock()
	defer Mu.Unlock()

	animals, err := storage.ReadAnimals(DataFile)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось прочитать данные"})
		return
	}

	input.AdoptionRequestedBy = 0
	input.AdoptionDecision = ""
	input.ID = nextAnimalID(animals)
	animals = append(animals, input)

	if err := storage.WriteAnimals(DataFile, animals); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось сохранить животное"})
		return
	}

	c.JSON(http.StatusCreated, input)
}

// @Summary Получить животное по ID
// @Description Возвращает одно животное по его ID
// @Tags animals
// @Produce json
// @Param id path int true "ID животного"
// @Success 200 {object} models.Animal
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /animals/{id} [get]
func GetAnimalByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный ID"})
		return
	}

	Mu.Lock()
	animals, err := storage.ReadAnimals(DataFile)
	Mu.Unlock()
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
func DeleteAnimal(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный ID"})
		return
	}

	Mu.Lock()
	defer Mu.Unlock()

	animals, err := storage.ReadAnimals(DataFile)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка при чтении данных"})
		return
	}

	filtered := make([]models.Animal, 0, len(animals))
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

	if err := storage.WriteAnimals(DataFile, filtered); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось удалить животное"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Животное удалено"})
}

// @Summary Изменить статус животного
// @Description Обновляет статус животного: available, adopted или treatment
// @Tags animals
// @Accept json
// @Produce json
// @Param id path int true "ID животного"
// @Param input body models.StatusUpdateInput true "Новый статус"
// @Success 200 {object} models.Animal
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /animals/{id}/status [patch]
func UpdateAnimalStatus(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный ID"})
		return
	}

	var input models.StatusUpdateInput
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

	Mu.Lock()
	defer Mu.Unlock()

	animals, err := storage.ReadAnimals(DataFile)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось прочитать животных"})
		return
	}

	for i, a := range animals {
		if a.ID == id {
			animals[i].Status = input.Status

			if input.Status == "adopted" {
				animals[i].AdoptionDecision = "approved"
			}

			if input.Status == "available" && animals[i].AdoptionRequestedBy != 0 {
				animals[i].AdoptionDecision = "rejected"
			}

			if input.Status == "treatment" && !utils.ContainsFold(animals[i].Health, "леч") {
				animals[i].Health = "На лечении"
			}

			if err := storage.WriteAnimals(DataFile, animals); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось сохранить статус"})
				return
			}

			c.JSON(http.StatusOK, animals[i])
			return
		}
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "Животное не найдено"})
}

func nextAnimalID(animals []models.Animal) int {
	maxID := 0
	for _, a := range animals {
		if a.ID > maxID {
			maxID = a.ID
		}
	}
	return maxID + 1
}