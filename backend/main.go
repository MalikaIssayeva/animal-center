package main

import (
    "net/http"
    "sort"
    "strconv"
    "strings"
    "sync"

    "github.com/gin-gonic/gin"
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
    Tags        []string `json:"tags"`
}

type ClassificationResponse struct {
    PredictedType   string             `json:"predictedType"`
    PredictedBreed  string             `json:"predictedBreed"`
    AgeCategory     string             `json:"ageCategory"`
    HealthStatus    string             `json:"healthStatus"`
    Confidence      int                `json:"confidence"`
    Alternatives    []PredictionResult `json:"alternatives"`
}

type PredictionResult struct {
    Label      string `json:"label"`
    Confidence int    `json:"confidence"`
}

type Analytics struct {
    TotalAnimals       int               `json:"totalAnimals"`
    AdoptedAnimals     int               `json:"adoptedAnimals"`
    NeedTreatment      int               `json:"needTreatment"`
    ModelAccuracy      int               `json:"modelAccuracy"`
    MonthlyIntake      []MonthlyStat     `json:"monthlyIntake"`
    TypeDistribution   []Distribution    `json:"typeDistribution"`
    BreedTable         []BreedStat       `json:"breedTable"`
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
    animals = []Animal{
        {ID: 1, Name: "Барон", Type: "Собака", Breed: "Лабрадор", Age: "3 года", Gender: "Самец", Health: "Здоров", Description: "Спокойный и дружелюбный пес.", Image: "🐶", Status: "available", Tags: []string{"привит", "крупный"}},
        {ID: 2, Name: "Муся", Type: "Кошка", Breed: "Беспородная", Age: "2 года", Gender: "Самка", Health: "Стерилизована", Description: "Ласковая кошка, любит людей.", Image: "🐱", Status: "available", Tags: []string{"стерилизована", "домашняя"}},
        {ID: 3, Name: "Рыжик", Type: "Собака", Breed: "Метис", Age: "1 год", Gender: "Самец", Health: "На лечении", Description: "Активный и игривый щенок.", Image: "🐕", Status: "treatment", Tags: []string{"энергичный"}},
        {ID: 4, Name: "Снежок", Type: "Кошка", Breed: "Британский", Age: "4 года", Gender: "Самец", Health: "Здоров", Description: "Спокойный кот с хорошим характером.", Image: "😺", Status: "available", Tags: []string{"спокойный"}},
    }
    nextID = 5
    mu     sync.Mutex
)

func main() {
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

    r.Run(":8080")
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

    mu.Lock()
    defer mu.Unlock()

    filtered := make([]Animal, 0)
    for _, a := range animals {
        if search != "" && !containsFold(a.Name, search) && !containsFold(a.Breed, search) {
            continue
        }
        if animalType != "" && animalType != "Все" && !containsFold(a.Type, animalType) {
            continue
        }
        filtered = append(filtered, a)
    }

    c.JSON(http.StatusOK, filtered)
}

func createAnimal(c *gin.Context) {
    var input Animal
    if err := c.ShouldBindJSON(&input); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректные данные"})
        return
    }

    mu.Lock()
    defer mu.Unlock()

    input.ID = nextID
    nextID++
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
    animals = append([]Animal{input}, animals...)
    c.JSON(http.StatusCreated, input)
}

func getAnimalByID(c *gin.Context) {
    id, err := strconv.Atoi(c.Param("id"))
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный ID"})
        return
    }

    mu.Lock()
    defer mu.Unlock()

    for _, a := range animals {
        if a.ID == id {
            c.JSON(http.StatusOK, a)
            return
        }
    }
    c.JSON(http.StatusNotFound, gin.H{"error": "Животное не найдено"})
}

func getAnalytics(c *gin.Context) {
    mu.Lock()
    defer mu.Unlock()

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
        breedTable = append(breedTable, BreedStat{Breed: breed, Count: count, Status: status})
    }
    sort.Slice(breedTable, func(i, j int) bool {
        return breedTable[i].Count > breedTable[j].Count
    })

    typeDistribution := []Distribution{}
    for label, value := range typeCount {
        typeDistribution = append(typeDistribution, Distribution{Label: label, Value: value})
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
    // Черновой мок-ответ: сюда позже можно подключить Python ML-модель
    c.JSON(http.StatusOK, ClassificationResponse{
        PredictedType:  "Собака",
        PredictedBreed: "Лабрадор-ретривер",
        AgeCategory:    "1–2 года",
        HealthStatus:   "Здоров",
        Confidence:     94,
        Alternatives: []PredictionResult{
            {Label: "Лабрадор-ретривер", Confidence: 94},
            {Label: "Голден-ретривер", Confidence: 4},
            {Label: "Другое", Confidence: 2},
        },
    })
}

func containsFold(s, sub string) bool {
	return strings.Contains(strings.ToLower(s), strings.ToLower(sub))
}
