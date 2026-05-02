package whatsapp

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
)

var apiURL = os.Getenv("WHATSAPP_API_URL")

func SendMessage(phone, message string) error {
	if apiURL == "" {
		// Default to local if not set, or just log
		apiURL = "http://localhost:3001/api/whatsapp/send"
	}

	payload := map[string]string{
		"phone":   phone,
		"message": message,
	}

	b, _ := json.Marshal(payload)
	resp, err := http.Post(apiURL, "application/json", bytes.NewReader(b))
	if err != nil {
		log.Printf("[WHATSAPP] Failed to send message to %s: %v", phone, err)
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("[WHATSAPP] API returned status %d for %s", resp.StatusCode, phone)
		return fmt.Errorf("whatsapp api returned %d", resp.StatusCode)
	}

	log.Printf("[WHATSAPP] Successfully sent message to %s", phone)
	return nil
}
