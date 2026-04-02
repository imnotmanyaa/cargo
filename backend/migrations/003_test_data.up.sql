-- Тестовые данные для системы управления отправлениями
-- Выполнять после создания всех таблиц (schema.sql)

-- 1. Роли (справочники)
INSERT INTO roles (id, name, description) VALUES
    ('admin', 'admin', 'Administrator'),
    ('manager', 'manager', 'Manager'),
    ('operator', 'operator', 'Reception operator'),
    ('receiver', 'receiver', 'Destination receiver'),
    ('loading_operator', 'loading_operator', 'Loading employee'),
    ('transit_operator', 'transit_operator', 'Transit operator'),
    ('issue_operator', 'issue_operator', 'Issue operator'),
    ('accounting', 'accounting', 'Accounting'),
    ('individual', 'individual', 'Individual client'),
    ('corporate', 'corporate', 'Corporate client')
ON CONFLICT (id) DO NOTHING;

-- 2. Станции
INSERT INTO stations (id, name, city, code, is_active) VALUES
    ('shymkent', 'Шымкент', 'Шымкент', 'CIT-SHYM', TRUE),
    ('almaty-1', 'Алматы-1', 'Алматы', 'CIT-ALA1', TRUE),
    ('karaganda', 'Қарағанды', 'Қарағанды', 'CIT-KRG', TRUE),
    ('astana', 'Астана Нұрлы Жол', 'Астана', 'CIT-AST', TRUE),
    ('aktobe', 'Ақтөбе', 'Ақтөбе', 'CIT-AKT', TRUE)
ON CONFLICT (id) DO NOTHING;