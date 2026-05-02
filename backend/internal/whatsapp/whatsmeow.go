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

	_ "github.com/lib/pq"
	"github.com/mdp/qrterminal/v3"
	"go.mau.fi/whatsmeow"
	waProto "go.mau.fi/whatsmeow/binary/proto"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types"
	waLog "go.mau.fi/whatsmeow/util/log"
	"google.golang.org/protobuf/proto"
)

var (
	client   *whatsmeow.Client
	clientMu sync.RWMutex
	ready    bool
)

func isReady() bool {
	clientMu.RLock()
	defer clientMu.RUnlock()
	return ready && client != nil && client.IsConnected()
}

// Init initializes the WhatsApp client. Run in a goroutine.
func Init(dbURL string) {
	// lib/pq uses "postgres" driver name and expects postgresql:// or postgres:// DSN
	// Railway provides DATABASE_URL as postgresql://... — convert for lib/pq
	dsn := strings.Replace(dbURL, "postgresql://", "postgres://", 1)

	dbLog := waLog.Stdout("WhatsDB", "DEBUG", true)
	container, err := sqlstore.New(context.Background(), "postgres", dsn, dbLog)
	if err != nil {
		log.Printf("[WHATSAPP] ❌ sqlstore.New failed: %v", err)
		return
	}
	log.Printf("[WHATSAPP] sqlstore connected OK")

	deviceStore, err := container.GetFirstDevice(context.Background())
	if err != nil {
		log.Printf("[WHATSAPP] ❌ GetFirstDevice failed: %v", err)
		return
	}

	if deviceStore.ID != nil {
		log.Printf("[WHATSAPP] ✅ Found existing session for device: %s", deviceStore.ID)
	} else {
		log.Printf("[WHATSAPP] No existing session found — will show QR code")
	}

	clientLog := waLog.Stdout("WhatsClient", "DEBUG", true)
	c := whatsmeow.NewClient(deviceStore, clientLog)

	if c.Store.ID == nil {
		// New login — show QR
		qrChan, _ := c.GetQRChannel(context.Background())
		if err := c.Connect(); err != nil {
			log.Printf("[WHATSAPP] ❌ Connect failed: %v", err)
			return
		}
		for evt := range qrChan {
			switch evt.Event {
			case "code":
				fmt.Println("\n=======================================================")
				fmt.Println("СКАНИРУЙТЕ QR КОД (откройте ссылку в браузере):")
				fmt.Printf("https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=%s\n", url.QueryEscape(evt.Code))
				fmt.Println("=======================================================")
				qrterminal.GenerateHalfBlock(evt.Code, qrterminal.L, os.Stdout)
			case "success":
				log.Printf("[WHATSAPP] ✅ QR отсканирован! Сессия сохраняется в БД...")
			case "timeout":
				log.Printf("[WHATSAPP] QR истёк, генерируется новый...")
			default:
				log.Printf("[WHATSAPP] Событие QR: %s", evt.Event)
			}
		}
	} else {
		if err := c.Connect(); err != nil {
			log.Printf("[WHATSAPP] ❌ Reconnect failed: %v", err)
			return
		}
		log.Printf("[WHATSAPP] ✅ Переподключен из сохранённой сессии!")
	}

	// Give connection up to 20s to stabilise
	for i := 0; i < 20; i++ {
		if c.IsConnected() {
			break
		}
		time.Sleep(1 * time.Second)
	}

	clientMu.Lock()
	client = c
	ready = c.IsConnected()
	clientMu.Unlock()

	if ready {
		log.Printf("[WHATSAPP] ✅ Готов к отправке сообщений!")
	} else {
		log.Printf("[WHATSAPP] ⚠️ Подключен, но IsConnected()=false. Проверьте логи выше.")
	}
}

// SendMessage sends a WhatsApp message, waiting up to 30s for the client to be ready.
func SendMessage(phone, message string) error {
	deadline := time.Now().Add(30 * time.Second)
	for time.Now().Before(deadline) {
		if isReady() {
			break
		}
		log.Printf("[WHATSAPP] Ожидание подключения перед отправкой на %s...", phone)
		time.Sleep(2 * time.Second)
	}

	if !isReady() {
		log.Printf("[WHATSAPP] ❌ Клиент не готов, сообщение не отправлено (phone=%s)", phone)
		return fmt.Errorf("whatsapp not connected")
	}

	phone = strings.NewReplacer("+", "", "-", "", " ", "", "(", "", ")", "").Replace(phone)
	if strings.HasPrefix(phone, "87") {
		phone = "77" + phone[2:]
	}

	clientMu.RLock()
	c := client
	clientMu.RUnlock()

	log.Printf("[WHATSAPP] Отправка на %s", phone)
	_, err := c.SendMessage(context.Background(), types.NewJID(phone, "s.whatsapp.net"),
		&waProto.Message{Conversation: proto.String(message)})
	if err != nil {
		log.Printf("[WHATSAPP] ❌ Ошибка: %v", err)
		return err
	}
	log.Printf("[WHATSAPP] ✅ Отправлено на %s", phone)
	return nil
}

// IsConnected returns connection status.
func IsConnected() bool { return isReady() }
