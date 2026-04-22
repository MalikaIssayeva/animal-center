package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"animal-center-backend/models"
	"animal-center-backend/storage"

	"github.com/gin-gonic/gin"
)

// @Summary Регистрация пользователя
// @Description Создает нового пользователя с типом owner или adopter
// @Tags auth
// @Accept json
// @Produce json
// @Param input body models.RegisterInput true "Данные регистрации"
// @Success 201 {object} models.SafeUser
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /register [post]
func RegisterUser(c *gin.Context) {
	var input models.RegisterInput
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

	if len(input.Password) < 6 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Пароль должен содержать минимум 6 символов"})
		return
	}

	if input.AccountType != "owner" && input.AccountType != "adopter" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Тип аккаунта должен быть owner или adopter"})
		return
	}

	Mu.Lock()
	defer Mu.Unlock()

	users, err := storage.ReadUsers(UsersFile)
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

	user := models.User{
		ID:          nextUserID(users),
		Name:        input.Name,
		Email:       input.Email,
		Password:    input.Password,
		Role:        "user",
		AccountType: input.AccountType,
		Favorites:   []int{},
	}

	users = append(users, user)

	if err := storage.WriteUsers(UsersFile, users); err != nil {
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
// @Param input body models.LoginInput true "Данные для входа"
// @Success 200 {object} models.SafeUser
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /login [post]
func LoginUser(c *gin.Context) {
	var input models.LoginInput
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

	Mu.Lock()
	users, err := storage.ReadUsers(UsersFile)
	Mu.Unlock()
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

func GetUserFavorites(c *gin.Context) {
	userID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный ID пользователя"})
		return
	}

	Mu.Lock()
	defer Mu.Unlock()

	users, err := storage.ReadUsers(UsersFile)
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

func AddFavorite(c *gin.Context) {
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

	Mu.Lock()
	defer Mu.Unlock()

	users, err := storage.ReadUsers(UsersFile)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось прочитать пользователей"})
		return
	}

	animals, err := storage.ReadAnimals(DataFile)
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

			if err := storage.WriteUsers(UsersFile, users); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось сохранить избранное"})
				return
			}

			c.JSON(http.StatusOK, toSafeUser(users[i]))
			return
		}
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "Пользователь не найден"})
}

func RemoveFavorite(c *gin.Context) {
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

	Mu.Lock()
	defer Mu.Unlock()

	users, err := storage.ReadUsers(UsersFile)
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

			if err := storage.WriteUsers(UsersFile, users); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось сохранить избранное"})
				return
			}

			c.JSON(http.StatusOK, toSafeUser(users[i]))
			return
		}
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "Пользователь не найден"})
}

func nextUserID(users []models.User) int {
	maxID := 0
	for _, u := range users {
		if u.ID > maxID {
			maxID = u.ID
		}
	}
	return maxID + 1
}

func toSafeUser(user models.User) models.SafeUser {
	return models.SafeUser{
		ID:          user.ID,
		Name:        user.Name,
		Email:       user.Email,
		Role:        user.Role,
		AccountType: user.AccountType,
		Favorites:   user.Favorites,
	}
}

// @Summary Получить пользователя по ID
// @Description Возвращает безопасные данные пользователя без пароля
// @Tags users
// @Produce json
// @Param id path int true "ID пользователя"
// @Success 200 {object} models.SafeUser
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /users/{id} [get]
func GetUserByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный ID пользователя"})
		return
	}

	Mu.Lock()
	users, err := storage.ReadUsers(UsersFile)
	Mu.Unlock()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось прочитать пользователей"})
		return
	}

	for _, u := range users {
		if u.ID == id {
			c.JSON(http.StatusOK, toSafeUser(u))
			return
		}
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "Пользователь не найден"})
}