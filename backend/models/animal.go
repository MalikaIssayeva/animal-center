package models

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
	AdoptionDecision    string   `json:"adoptionDecision"`
}