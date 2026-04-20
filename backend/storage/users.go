package storage

import (
	"bytes"
	"encoding/json"
	"os"

	"animal-center-backend/models"
)

func ReadUsers(path string) ([]models.User, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	if len(bytes.TrimSpace(data)) == 0 {
		return []models.User{}, nil
	}

	var users []models.User
	json.Unmarshal(data, &users)
	return users, nil
}

func WriteUsers(path string, users []models.User) error {
	data, _ := json.MarshalIndent(users, "", "  ")
	return os.WriteFile(path, data, 0644)
}