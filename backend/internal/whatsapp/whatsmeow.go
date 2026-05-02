package whatsapp

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

// Green API docs: https://green-api.com/en/docs/api/sending/SendMessage/
// Required env vars: GREEN_API_ID, GREEN_API_TOKEN, GREEN_API_URL (e.g. 7107.api.greenapi.com)

func sendViaGreenAPI(phone, message string) error {
	idInstance := os.Getenv("GREEN_API_ID")
	apiToken := os.Getenv("GREEN_API_TOKEN")
	apiURL := os.Getenv("GREEN_API_URL") // e.g. 7107.api.greenapi.com

	if idInstance == "" || apiToken == "" {
		log.Println("[WHATSAPP] GREEN_API_ID or GREEN_API_TOKEN not set")
		return fmt.Errorf("green api credentials not configured")
	}
	if apiURL == "" {
		apiURL = "api.green-api.com"
	}

	// Normalize phone number to international format (77XXXXXXXXX)
	// Strip all non-digit characters
	phone = strings.Map(func(r rune) rune {
		if r >= '0' && r <= '9' {
			return r
		}
		return -1
	}, phone)

	switch {
	case len(phone) == 11 && strings.HasPrefix(phone, "8"):
		// 8XXXXXXXXXX → 7XXXXXXXXXX (Kazakh local format)
		phone = "7" + phone[1:]
	case len(phone) == 10 && strings.HasPrefix(phone, "7"):
		// 7XXXXXXXXX → 77XXXXXXXXX (missing country code)
		phone = "7" + phone
	case len(phone) == 10:
		// XXXXXXXXXX → 77XXXXXXXXX (no country code at all)
		phone = "77" + phone
	}
	// If already 77XXXXXXXXX or +77XXXXXXXXX — just use as-is

	chatID := phone + "@c.us"
	log.Printf("[WHATSAPP] Нормализованный номер: %s → chatID: %s", phone, chatID)

	url := fmt.Sprintf("https://%s/waInstance%s/sendMessage/%s", apiURL, idInstance, apiToken)

	body, _ := json.Marshal(map[string]string{
		"chatId":  chatID,
		"message": message,
	})

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Post(url, "application/json", bytes.NewReader(body))
	if err != nil {
		log.Printf("[WHATSAPP] ❌ HTTP error: %v", err)
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("[WHATSAPP] ❌ Green API returned status %d for %s", resp.StatusCode, phone)
		return fmt.Errorf("green api status %d", resp.StatusCode)
	}

	log.Printf("[WHATSAPP] ✅ Отправлено на %s через Green API", phone)
	return nil
}

// SendMessage sends a WhatsApp message via Green API.
func SendMessage(phone, message string) error {
	err := sendViaGreenAPI(phone, message)
	if err != nil {
		log.Printf("[WHATSAPP] Ошибка отправки на %s: %v", phone, err)
	}
	return err
}

// IsConnected returns true if Green API credentials are configured.
func IsConnected() bool {
	return os.Getenv("GREEN_API_ID") != "" && os.Getenv("GREEN_API_TOKEN") != ""
}
