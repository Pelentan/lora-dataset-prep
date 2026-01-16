package service

import (
	"crypto/rand"
	"fmt"
	"math/big"
	"strings"
	"time"
)

func GenerateArtifactID(artifactType string, components ...string) string {
	timestamp := time.Now().Unix()
	randomSuffix := generateRandomHex(4)

	// Start with artifact type
	parts := []string{artifactType}

	// Add any provided components
	for _, comp := range components {
		if comp != "" {
			parts = append(parts, comp)
		}
	}

	// Add timestamp and random suffix
	parts = append(parts, fmt.Sprintf("%d", timestamp), randomSuffix)

	return strings.Join(parts, "-")
}

func GenerateTrainingImageID(artifactID, angleCode string, sequence int) string {
	return fmt.Sprintf("IMG-%s-%s-%03d", artifactID, angleCode, sequence)
}

func GenerateQueueID() string {
	timestamp := time.Now().Unix()
	randomSuffix := generateRandomHex(6)
	return fmt.Sprintf("queue-%d-%s", timestamp, randomSuffix)
}

func GenerateQueueItemID() string {
	timestamp := time.Now().Unix()
	randomSuffix := generateRandomHex(6)
	return fmt.Sprintf("item-%d-%s", timestamp, randomSuffix)
}

func generateRandomHex(length int) string {
	const hexChars = "0123456789ABCDEF"
	result := make([]byte, length)

	for i := 0; i < length; i++ {
		n, _ := rand.Int(rand.Reader, big.NewInt(16))
		result[i] = hexChars[n.Int64()]
	}

	return string(result)
}
