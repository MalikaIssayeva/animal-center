package handlers

import (
	"net/http"
	"sort"

	"animal-center-backend/storage"
	"animal-center-backend/utils"

	"github.com/gin-gonic/gin"
)

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

// @Summary Получить аналитику
// @Description Возвращает статистику по животным
// @Tags analytics
// @Produce json
// @Success 200 {object} Analytics
// @Failure 500 {object} map[string]string
// @Router /analytics [get]
func GetAnalytics(c *gin.Context) {
	Mu.Lock()
	animals, err := storage.ReadAnimals(DataFile)
	Mu.Unlock()
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
		if utils.ContainsFold(a.Health, "леч") || a.Status == "treatment" {
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