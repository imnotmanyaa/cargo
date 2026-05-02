package whatsapp

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/mdp/qrterminal/v3"
	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/store/sqlstore"
	waLog "go.mau.fi/whatsmeow/util/log"
	waProto "go.mau.fi/whatsmeow/binary/proto"
	"go.mau.fi/whatsmeow/types"
	"google.golang.org/protobuf/proto"
)

var client *whatsmeow.Client

func Init(dbURL string) {
	dbLog := waLog.Stdout("Database", "WARN", true)
	// sqlstore can use pgx from standard library wrapper
	container, err := sqlstore.New(context.Background(), "pgx", dbURL, dbLog)
	if err != nil {
		log.Printf("Failed to connect to WhatsApp database: %v", err)
		return
	}

	deviceStore, err := container.GetFirstDevice(context.Background())
	if err != nil {
		log.Printf("Failed to get WhatsApp device store: %v", err)
		return
	}

	clientLog := waLog.Stdout("Client", "WARN", true)
	client = whatsmeow.NewClient(deviceStore, clientLog)

	if client.Store.ID == nil {
		// No ID stored, new login
		qrChan, _ := client.GetQRChannel(context.Background())
		err = client.Connect()
		if err != nil {
			log.Printf("Failed to connect WhatsApp client: %v", err)
			return
		}
		
		go func() {
			for evt := range qrChan {
				if evt.Event == "code" {
					fmt.Println("\n\n=======================================================")
					fmt.Println("СКАНИРУЙТЕ ЭТОТ QR КОД ЧЕРЕЗ WHATSAPP НА ВАШЕМ ТЕЛЕФОНЕ")
					fmt.Println("=======================================================")
					qrterminal.GenerateHalfBlock(evt.Code, qrterminal.L, os.Stdout)
				} else {
					fmt.Println("Событие WhatsApp:", evt.Event)
				}
			}
		}()
	} else {
		// Already logged in, just connect
		err = client.Connect()
		if err != nil {
			log.Printf("Failed to connect WhatsApp client: %v", err)
			return
		}
		fmt.Println("WhatsApp-бот успешно подключен из базы данных!")
	}
}

func SendMessage(phone, message string) error {
	if client == nil || !client.IsConnected() {
		log.Println("[WHATSAPP] Попытка отправить сообщение, но клиент не подключен!")
		return fmt.Errorf("whatsapp is not connected")
	}
	
	phone = strings.ReplaceAll(phone, "+", "")
	phone = strings.ReplaceAll(phone, "-", "")
	phone = strings.ReplaceAll(phone, " ", "")
	phone = strings.ReplaceAll(phone, "(", "")
	phone = strings.ReplaceAll(phone, ")", "")
	if strings.HasPrefix(phone, "87") {
		phone = "77" + phone[2:]
	}

	jid := types.NewJID(phone, "s.whatsapp.net")

	msg := &waProto.Message{
		Conversation: proto.String(message),
	}

	_, err := client.SendMessage(context.Background(), jid, msg)
	if err != nil {
		log.Printf("Ошибка отправки WhatsApp на %s: %v", phone, err)
		return err
	}
	log.Printf("[WHATSAPP] Успешно отправлено на %s", phone)
	return nil
}
