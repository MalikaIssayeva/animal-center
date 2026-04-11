CREATE TABLE IF NOT EXISTS animals (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    breed TEXT NOT NULL,
    age TEXT NOT NULL,
    gender TEXT NOT NULL,
    health TEXT NOT NULL,
    description TEXT,
    image TEXT,
    status TEXT NOT NULL DEFAULT 'available'
);

INSERT INTO animals (name, type, breed, age, gender, health, description, image, status)
VALUES
    ('Барон', 'Собака', 'Лабрадор', '3 года', 'Самец', 'Здоров', 'Спокойный и дружелюбный пес.', '🐶', 'available'),
    ('Муся', 'Кошка', 'Беспородная', '2 года', 'Самка', 'Стерилизована', 'Ласковая кошка, любит людей.', '🐱', 'available'),
    ('Рыжик', 'Собака', 'Метис', '1 год', 'Самец', 'На лечении', 'Активный и игривый щенок.', '🐕', 'treatment'),
    ('Снежок', 'Кошка', 'Британский', '4 года', 'Самец', 'Здоров', 'Спокойный кот с хорошим характером.', '😺', 'available')
ON CONFLICT DO NOTHING;