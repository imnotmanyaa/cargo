package whatsapp

import (
	"context"
	"fmt"
	"log"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/mdp/qrterminal/v3"
	"go.mau.fi/whatsmeow"
	waProto "go.mau.fi/whatsmeow/binary/proto"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types"
	waLog "go.mau.fi/whatsmeow/util/log"
	"google.golang.org/protobuf/proto"
)

var (
	client    *whatsmeow.Client
	clientMu  sync.RWMutex
	connected bool
)

func isReady() bool {
	clientMu.RLock()
	defer clientMu.RUnlock()
	return connected && client != nil && client.IsConnected()
}

// Init initializes the WhatsApp client. Call this in a goroutine.
func Init(dbURL string) {
	dbLog := waLog.Stdout("Database", "WARN", true)
	container, err := sqlstore.New(context.Background(), "pgx", dbURL, dbLog)
	if err != nil {
		log.Printf("[WHATSAPP] Failed to connect to WhatsApp database: %v", err)
		return
	}

	deviceStore, err := container.GetFirstDevice(context.Background())
	if err != nil {
		log.Printf("[WHATSAPP] Failed to get WhatsApp device store: %v", err)
		return
	}

	clientLog := waLog.Stdout("Client", "WARN", true)
	c := whatsmeow.NewClient(deviceStore, clientLog)

	if c.Store.ID == nil {
		// New login - show QR code
		qrChan, _ := c.GetQRChannel(context.Background())
		if err := c.Connect(); err != nil {
			log.Printf("[WHATSAPP] Failed to connect: %v", err)
			return
		}
		for evt := range qrChan {
			if evt.Event == "code" {
				fmt.Println("\n\n=======================================================")
				fmt.Println("СКАНИРУЙТЕ ЭТОТ QR КОД ЧЕРЕЗ WHATSAPP НА ВАШЕМ ТЕЛЕФОНЕ")
				fmt.Println("Если код ниже не читается, откройте ссылку в браузере:")
				fmt.Printf("https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=%s\n", url.QueryEscape(evt.Code))
				fmt.Println("=======================================================")
				qrterminal.GenerateHalfBlock(evt.Code, qrterminal.L, os.Stdout)
			} else if evt.Event == "success" {
				fmt.Println("[WHATSAPP] QR отсканирован! Авторизация успешна.")
				break
			} else {
				fmt.Println("[WHATSAPP] Событие:", evt.Event)
			}
		}
	} else {
		// Already logged in
		if err := c.Connect(); err != nil {
			log.Printf("[WHATSAPP] Failed to reconnect: %v", err)
			return
		}
	}

	// Wait up to 15s for stable connection
	for i := 0; i < 15; i++ {
		if c.IsConnected() {
			break
		}
		time.Sleep(1 * time.Second)
	}

	clientMu.Lock()
	client = c
	connected = c.IsConnected()
	clientMu.Unlock()

	if connected {
		log.Printf("[WHATSAPP] ✅ WhatsApp-бот успешно подключен! Готов к отправке сообщений.")
	} else {
		log.Printf("[WHATSAPP] ⚠️ WhatsApp клиент создан, но соединение не установлено.")
	}
}

// SendMessage sends a WhatsApp message to the given phone number.
func SendMessage(phone, message string) error {
	// Wait up to 30s for client to be ready (handles startup race condition)
	deadline := time.Now().Add(30 * time.Second)
	for time.Now().Before(deadline) {
		if isReady() {
			break
		}
		log.Printf("[WHATSAPP] Клиент ещё не готов, ожидаем... (phone: %s)", phone)
		time.Sleep(2 * time.Second)
	}

	if !isReady() {
		log.Printf("[WHATSAPP] ❌ Клиент не подключён, сообщение не отправлено (phone: %s)", phone)
		return fmt.Errorf("whatsapp is not connected")
	}

	// Normalize phone number
	phone = strings.ReplaceAll(phone, "+", "")
	phone = strings.ReplaceAll(phone, "-", "")
	phone = strings.ReplaceAll(phone, " ", "")
	phone = strings.ReplaceAll(phone, "(", "")
	phone = strings.ReplaceAll(phone, ")", "")
	// Convert old-style 8-XXX to 7-XXX
	if strings.HasPrefix(phone, "87") {
		phone = "77" + phone[2:]
	}

	log.Printf("[WHATSAPP] Отправка на %s: %s", phone, message)

	clientMu.RLock()
	c := client
	clientMu.RUnlock()

	jid := types.NewJID(phone, "s.whatsapp.net")
	msg := &waProto.Message{
		Conversation: proto.String(message),
	}

	_, err := c.SendMessage(context.Background(), jid, msg)
	if err != nil {
		log.Printf("[WHATSAPP] ❌ Ошибка отправки на %s: %v", phone, err)
		return err
	}
	log.Printf("[WHATSAPP] ✅ Успешно отправлено на %s", phone)
	return nil
}

// IsConnected returns whether the WhatsApp client is ready.
func IsConnected() bool {
	return isReady()
}
