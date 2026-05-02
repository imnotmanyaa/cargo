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
// Set environment variables: GREEN_API_ID and GREEN_API_TOKEN

func sendViaGreenAPI(phone, message string) error {
	idInstance := os.Getenv("GREEN_API_ID")
	apiToken := os.Getenv("GREEN_API_TOKEN")

	if idInstance == "" || apiToken == "" {
		log.Println("[WHATSAPP] GREEN_API_ID or GREEN_API_TOKEN not set")
		return fmt.Errorf("green api credentials not configured")
	}

	// Normalize phone: strip non-digits, fix 8-xxx → 7-xxx
	phone = strings.NewReplacer("+", "", "-", "", " ", "", "(", "", ")", "").Replace(phone)
	if strings.HasPrefix(phone, "87") {
		phone = "77" + phone[2:]
	}
	chatID := phone + "@c.us"

	url := fmt.Sprintf("https://api.green-api.com/waInstance%s/sendMessage/%s", idInstance, apiToken)

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
