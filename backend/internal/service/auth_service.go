package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"cargo/backend/internal/model"
	"cargo/backend/internal/whatsapp"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

func (s *AuthService) Register(ctx context.Context, name, login, password string, role model.Role, company, phone *string) (model.User, string, error) {
	login = normalizeLogin(login)
	_, err := s.repo.GetUserByEmail(ctx, login)
	if err == nil {
		return model.User{}, "", ErrDuplicateLogin
	}
	if !errors.Is(err, ErrNotFound) {
		return model.User{}, "", err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return model.User{}, "", err
	}
	user := model.User{
		ID:             uuid.NewString(),
		Name:           name,
		Login:          login,
		PasswordHash:   string(hash),
		Role:           role,
		ClientSegment:  model.ClientSegmentForRole(role),
		Company:        company,
		Phone:          phone,
		IsActive:       true,
		CreatedAt:      time.Now().UTC(),
	}
	created, err := s.repo.CreateUser(ctx, user)
	if err != nil {
		return model.User{}, "", err
	}
	token, err := s.issueToken(created)
	// Welcome WhatsApp notification
	if created.Phone != nil && *created.Phone != "" {
		go whatsapp.SendMessage(*created.Phone,
			fmt.Sprintf("📦 Добро пожаловать, %s! Ваш аккаунт в системе грузоперевозок успешно создан.\nДля отслеживания посылок обращайтесь к менеджерам или в приложение.\nЭто сообщение подтверждает регистрацию вашего номера в системе.", created.Name))
	}
	return created, token, err
}

func (s *AuthService) Login(ctx context.Context, login, password string) (model.User, string, error) {
	user, err := s.repo.GetUserByEmail(ctx, normalizeLogin(login))
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return model.User{}, "", ErrInvalidCredentials
		}
		return model.User{}, "", err
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return model.User{}, "", ErrInvalidCredentials
	}
	if !user.IsActive {
		return model.User{}, "", ErrForbidden
	}
	token, err := s.issueToken(user)
	return user, token, err
}

func (s *AuthService) Me(ctx context.Context, id string) (model.User, error) {
	return s.repo.GetUserByID(ctx, id)
}

func (s *AuthService) ParseToken(token string) (AuthenticatedUser, error) {
	if _, blacklisted := s.blacklist.Load(token); blacklisted {
		return AuthenticatedUser{}, ErrUnauthorized
	}
	claims := jwt.MapClaims{}
	parsed, err := jwt.ParseWithClaims(token, claims, func(token *jwt.Token) (interface{}, error) {
		return []byte(s.jwtSecret), nil
	})
	if err != nil || !parsed.Valid {
		return AuthenticatedUser{}, ErrUnauthorized
	}
	role, _ := claims["role"].(string)
	station, _ := claims["station"].(string)
	name, _ := claims["name"].(string)
	id, _ := claims["sub"].(string)
	login, _ := claims["login"].(string)
	phoneStr, _ := claims["phone"].(string)
	var phone *string
	if phoneStr != "" {
		phone = &phoneStr
	}
	return AuthenticatedUser{
		ID:      id,
		Login:   login,
		Role:    model.Role(role),
		Name:    name,
		Station: station,
		Phone:   phone,
	}, nil
}

// IssueQRLoginToken returns a permanent, static QR token for the given user.
// The token has no expiry ("exp" claim is intentionally omitted) so that:
//  1. The same receiver always gets the same QR code.
//  2. The QR code is valid for the entire lifetime of the employee.
func (s *AuthService) IssueQRLoginToken(ctx context.Context, userID string) (string, error) {
	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		return "", err
	}
	// No "exp" claim → token never expires and is always identical for the same user.
	claims := jwt.MapClaims{
		"sub": user.ID,
		"typ": "qr_login",
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.jwtSecret))
}

func (s *AuthService) QRLogin(ctx context.Context, qrToken string) (model.User, string, error) {
	claims := jwt.MapClaims{}
	parsed, err := jwt.ParseWithClaims(qrToken, claims, func(token *jwt.Token) (interface{}, error) {
		return []byte(s.jwtSecret), nil
	})
	if err != nil || !parsed.Valid {
		return model.User{}, "", ErrUnauthorized
	}
	if typ, _ := claims["typ"].(string); typ != "qr_login" {
		return model.User{}, "", fmt.Errorf("%w: invalid qr token type", ErrForbidden)
	}
	userID, _ := claims["sub"].(string)
	if userID == "" {
		return model.User{}, "", ErrUnauthorized
	}
	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		return model.User{}, "", err
	}
	if !user.IsActive {
		return model.User{}, "", ErrForbidden
	}
	authToken, err := s.issueToken(user)
	return user, authToken, err
}

func (s *AuthService) issueToken(user model.User) (string, error) {
	claims := jwt.MapClaims{
		"sub":   user.ID,
		"login": user.Login,
		"role":  string(user.Role),
		"name":  user.Name,
		"exp":   time.Now().Add(24 * time.Hour).Unix(),
	}
	if user.Station != nil {
		claims["station"] = *user.Station
	}
	if user.Phone != nil {
		claims["phone"] = *user.Phone
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.jwtSecret))
}

func (s *AuthService) Logout(token string) {
	if token != "" {
		s.blacklist.Store(token, time.Now().UTC())
	}
}
