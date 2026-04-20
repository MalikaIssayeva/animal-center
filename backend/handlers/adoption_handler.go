package handlers

import (
	"net/http"
	"strconv"

	"animal-center-backend/models"
	"animal-center-backend/storage"

	"github.com/gin-gonic/gin"
)

// @Summary Подать заявку на усыновление
// @Description Создает заявку на усыновление животного и переводит его в статус pending
// @Tags animals
// @Accept json
// @Produce json
// @Param id path int true "ID животного"
// @Param input body models.AdoptionRequestInput true "ID пользователя"
// @Success 200 {object} models.Animal
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /animals/{id}/adopt-request [post]
func RequestAdoption(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный ID животного"})
		return
	}

	var input models.AdoptionRequestInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректные данные"})
		return
	}

	if input.UserID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный ID пользователя"})
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
			if a.Status != "available" {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Животное недоступно для усыновления"})
				return
			}

			if a.OwnerID == input.UserID {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Нельзя подать заявку на собственное животное"})
				return
			}

			animals[i].Status = "pending"
			animals[i].AdoptionRequestedBy = input.UserID
			animals[i].AdoptionDecision = "pending"

			if err := storage.WriteAnimals(DataFile, animals); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось сохранить заявку"})
				return
			}

			c.JSON(http.StatusOK, animals[i])
			return
		}
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "Животное не найдено"})
}