package service

import (
	"crypto/rand"
	"fmt"
	"math/big"
	"time"
)

func GenerateArtifactID(artifactType, manufacturer string) string {
	timestamp := time.Now().Unix()
	randomSuffix := generateRandomHex(4)
	return fmt.Sprintf("%s-%s-%d-%s", artifactType, manufacturer, timestamp, randomSuffix)
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
