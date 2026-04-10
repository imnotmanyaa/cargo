-- Добавляем роль "Мобильная инспекционная группа"
INSERT INTO roles (id, name, description)
VALUES (
  'mobile_group',
  'mobile_group',
  'Мобильная инспекционная группа — выездная проверка груза на транзитных станциях без изменения статуса'
)
ON CONFLICT (id) DO NOTHING;
