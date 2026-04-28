package service

import (
	"context"
	"fmt"
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
	switch role {
	case model.RoleAdmin, model.RoleManager, model.RoleDirectionHead, model.RoleChiefHead, model.RoleReceiver, model.RoleMobileGroup, model.RoleLoading, model.RoleTransit, model.RoleIssue, model.RoleAccounting:
	default:
		return model.User{}, fmt.Errorf("%w: unsupported role", ErrValidation)
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return model.User{}, err
	}
	user := model.User{
		ID:             uuid.NewString(),
		Name:           name,
		Email:          normalizeEmail(email),
		PasswordHash:   string(hash),
		Role:           role,
		ClientSegment:  model.ClientSegmentForRole(role),
		Station:        station,
		IsActive:       true,
		CreatedAt:      time.Now().UTC(),
	}
	return s.repo.CreateEmployee(ctx, user)
}

func (s *AdminService) UpdateUser(ctx context.Context, user model.User) (model.User, error) {
	prev, err := s.repo.GetUserByID(ctx, user.ID)
	if err != nil {
		return model.User{}, err
	}
	user.PasswordHash = prev.PasswordHash
	user.CreatedAt = prev.CreatedAt
	user.ClientSegment = model.ClientSegmentForRole(user.Role)
	return s.repo.UpdateUser(ctx, user)
}

func (s *AdminService) DeleteEmployee(ctx context.Context, id string) error {
	return s.repo.DeleteEmployee(ctx, id)
}
