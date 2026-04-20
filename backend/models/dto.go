package models

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
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Email       string `json:"email"`
	Role        string `json:"role"`
	AccountType string `json:"accountType"`
	Favorites   []int  `json:"favorites"`
}