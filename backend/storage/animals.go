package storage

import (
	"bytes"
	"encoding/json"
	"os"

	"animal-center-backend/models"
)

func ReadAnimals(path string) ([]models.Animal, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	if len(bytes.TrimSpace(data)) == 0 {
		return []models.Animal{}, nil
	}

	var animals []models.Animal
	json.Unmarshal(data, &animals)
	return animals, nil
}

func WriteAnimals(path string, animals []models.Animal) error {
	data, _ := json.MarshalIndent(animals, "", "  ")
	return os.WriteFile(path, data, 0644)
}