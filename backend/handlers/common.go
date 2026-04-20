package handlers

import (
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
)

var (
	DataFile  string
	UsersFile string
	Mu        *sync.Mutex
)

func Init(dataFile, usersFile string, mu *sync.Mutex) {
	DataFile = dataFile
	UsersFile = usersFile
	Mu = mu
}

func Cors() gin.HandlerFunc {
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