package utils

import (
	"strconv"
	"strings"
)

func ExtractNumber(s string) int {
	var num strings.Builder

	for _, ch := range s {
		if ch >= '0' && ch <= '9' {
			num.WriteRune(ch)
		}
	}

	n, _ := strconv.Atoi(num.String())
	return n
}

func ContainsFold(s, sub string) bool {
	return strings.Contains(strings.ToLower(s), strings.ToLower(sub))
}