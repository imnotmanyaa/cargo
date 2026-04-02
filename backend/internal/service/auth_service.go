package service

import (
	"context"
	"errors"
	"time"

	"cargo/backend/internal/model"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

func (s *AuthService) Register(ctx context.Context, name, email, password string, role model.Role, company, phone *string) (model.User, string, error) {
	email = normalizeEmail(email)
	_, err := s.repo.GetUserByEmail(ctx, email)
	if err == nil {
		return model.User{}, "", ErrDuplicateEmail
	}
	if !errors.Is(err, ErrNotFound) {
		return model.User{}, "", err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return model.User{}, "", err
	}
	user := model.User{
		ID:           uuid.NewString(),
		Name:         name,
		Email:        email,
		PasswordHash: string(hash),
		Role:         role,
		Company:      company,
		Phone:        phone,
		IsActive:     true,
		CreatedAt:    time.Now().UTC(),
	}
	created, err := s.repo.CreateUser(ctx, user)
	if err != nil {
		return model.User{}, "", err
	}
	token, err := s.issueToken(created)
	return created, token, err
}

func (s *AuthService) Login(ctx context.Context, email, password string) (model.User, string, error) {
	user, err := s.repo.GetUserByEmail(ctx, normalizeEmail(email))
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return model.User{}, "", ErrInvalidCredentials
		}
		return model.User{}, "", err
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return model.User{}, "", ErrInvalidCredentials
	}
	token, err := s.issueToken(user)
	return user, token, err
}

func (s *AuthService) Me(ctx context.Context, id string) (model.User, error) {
	return s.repo.GetUserByID(ctx, id)
}

func (s *AuthService) ParseToken(token string) (AuthenticatedUser, error) {
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
	email, _ := claims["email"].(string)
	return AuthenticatedUser{
		ID:      id,
		Email:   email,
		Role:    model.Role(role),
		Name:    name,
		Station: station,
	}, nil
}

func (s *AuthService) issueToken(user model.User) (string, error) {
	claims := jwt.MapClaims{
		"sub":   user.ID,
		"email": user.Email,
		"role":  string(user.Role),
		"name":  user.Name,
		"exp":   time.Now().Add(24 * time.Hour).Unix(),
	}
	if user.Station != nil {
		claims["station"] = *user.Station
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.jwtSecret))
}
