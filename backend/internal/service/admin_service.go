package service

import (
	"context"
	"time"

	"cargo/backend/internal/model"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

func (s *AdminService) ListEmployees(ctx context.Context) ([]model.User, error) {
	return s.repo.ListEmployees(ctx)
}

func (s *AdminService) ListUsers(ctx context.Context) ([]model.User, error) {
	return s.repo.ListUsers(ctx)
}

func (s *AdminService) CreateEmployee(ctx context.Context, name, email, password string, role model.Role, station *string) (model.User, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return model.User{}, err
	}
	user := model.User{
		ID:           uuid.NewString(),
		Name:         name,
		Email:        normalizeEmail(email),
		PasswordHash: string(hash),
		Role:         role,
		Station:      station,
		IsActive:     true,
		CreatedAt:    time.Now().UTC(),
	}
	return s.repo.CreateEmployee(ctx, user)
}

func (s *AdminService) UpdateUser(ctx context.Context, user model.User) (model.User, error) {
	return s.repo.UpdateUser(ctx, user)
}

func (s *AdminService) DeleteEmployee(ctx context.Context, id string) error {
	return s.repo.DeleteEmployee(ctx, id)
}
