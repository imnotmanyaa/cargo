package service

import (
	"context"
	"errors"
	"time"

	"cargo/backend/internal/model"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

func (s *ClientService) ListCorporateClients(ctx context.Context) ([]model.User, error) {
	return s.repo.ListCorporateClients(ctx)
}

func (s *ClientService) TopUp(ctx context.Context, userID string, amount float64) (float64, error) {
	return s.repo.TopUpDeposit(ctx, userID, amount)
}

func (s *ClientService) CreateCorporateClient(ctx context.Context, name, email, password, company, contractNumber string, phone *string, deposit float64) (model.User, error) {
	email = normalizeEmail(email)
	_, err := s.repo.GetUserByEmail(ctx, email)
	if err == nil {
		return model.User{}, ErrDuplicateEmail
	}
	if !errors.Is(err, ErrNotFound) {
		return model.User{}, err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return model.User{}, err
	}
	user := model.User{
		ID:             uuid.NewString(),
		Name:           name,
		Email:          email,
		PasswordHash:   string(hash),
		Role:           model.RoleCorporate,
		Company:        &company,
		DepositBalance: deposit,
		ContractNumber: &contractNumber,
		Phone:          phone,
		IsActive:       true,
		CreatedAt:      time.Now().UTC(),
	}
	return s.repo.CreateUser(ctx, user)
}

func (s *ClientService) UpdateCorporateClient(ctx context.Context, id, name, company, contractNumber string, phone *string, deposit float64, is_active *bool) (model.User, error) {
	user, err := s.repo.GetUserByID(ctx, id)
	if err != nil {
		return model.User{}, err
	}
	if user.Role != model.RoleCorporate {
		return model.User{}, errors.New("user is not a corporate client")
	}

	user.Name = name
	user.Company = &company
	user.ContractNumber = &contractNumber
	user.Phone = phone
	user.DepositBalance = deposit
	if is_active != nil {
		user.IsActive = *is_active
	}

	return s.repo.UpdateUser(ctx, user)
}

func (s *ClientService) DeleteCorporateClient(ctx context.Context, id string) error {
	user, err := s.repo.GetUserByID(ctx, id)
	if err != nil {
		return err
	}
	if user.Role != model.RoleCorporate {
		return errors.New("user is not a corporate client")
	}

	user.IsActive = false
	_, err = s.repo.UpdateUser(ctx, user)
	return err
}
