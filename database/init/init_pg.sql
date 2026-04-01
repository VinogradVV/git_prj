-- Создаем схему, если не существует
CREATE SCHEMA IF NOT EXISTS analytics;

-- Создаем таблицу
CREATE TABLE analytics.table1_pg (
    -- Идентификаторы
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    
    -- Время
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Текст и строки
    t1_f1 VARCHAR(100),
    status VARCHAR(50) NOT NULL,
    country_code CHAR(2),
    
    -- Числа и деньги
    amount NUMERIC(18, 2),
    
    -- Массивы и JSON
    tags TEXT[],
    is_active BOOLEAN,
    metadata JSONB,
    
    -- Аудит
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Комментарии к столбцам
COMMENT ON COLUMN analytics.table1_pg.id IS 'Уникальный идентификатор записи (автоинкремент)';
COMMENT ON COLUMN analytics.table1_pg.user_id IS 'ID пользователя (UUID)';
COMMENT ON COLUMN analytics.table1_pg.created_at IS 'Дата и время создания записи (с часовым поясом)';
COMMENT ON COLUMN analytics.table1_pg.t1_f1 IS 'Произвольное текстовое поле (название или описание)';
COMMENT ON COLUMN analytics.table1_pg.status IS 'Статус обработки: new, processed, error';
COMMENT ON COLUMN analytics.table1_pg.country_code IS 'Код страны (ISO 3166-1 alpha-2: RU, US)';
COMMENT ON COLUMN analytics.table1_pg.amount IS 'Сумма транзакции с точностью до 2 знаков';
COMMENT ON COLUMN analytics.table1_pg.tags IS 'Массив тегов или категорий';
COMMENT ON COLUMN analytics.table1_pg.is_active IS 'Флаг активности записи (NULL = неизвестно)';
COMMENT ON COLUMN analytics.table1_pg.metadata IS 'Гибкие метаданные в формате JSONB';
COMMENT ON COLUMN analytics.table1_pg.updated_at IS 'Дата последнего обновления записи';

-- Комментарий к таблице
COMMENT ON TABLE analytics.table1_pg IS 'Основная таблица аналитики событий: хранит транзакции, статусы и метаданные пользователей';

-- Индексы для ускорения поиска
CREATE INDEX idx_table1_pg_user_id ON analytics.table1_pg(user_id);
CREATE INDEX idx_table1_pg_created_at ON analytics.table1_pg(created_at);
CREATE INDEX idx_table1_pg_status ON analytics.table1_pg(status);
-- GIN-индекс для поиска внутри JSONB
CREATE INDEX idx_table1_pg_metadata_gin ON analytics.table1_pg USING GIN(metadata);
-- GIN-индекс для поиска по массиву тегов
CREATE INDEX idx_table1_pg_tags_gin ON analytics.table1_pg USING GIN(tags);

-- Триггер для авто-обновления updated_at
CREATE OR REPLACE FUNCTION analytics.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_table1_pg_update_updated_at
    BEFORE UPDATE ON analytics.table1_pg
    FOR EACH ROW
    EXECUTE FUNCTION analytics.update_updated_at_column();


-- Создаем ENUM тип для статусов (если еще не создан)
CREATE TYPE analytics.http_status_enum AS ENUM (
    'OK', 'Redirect', 'NotFound', 'Error', 
    'BadRequest', 'Unauthorized', 'Forbidden', 
    'ServerError', 'ServiceUnavailable'
);




CREATE TABLE analytics.table2_pg (
    -- Идентификаторы
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Время с миллисекундами
    request_time TIMESTAMPTZ(3) DEFAULT NOW() NOT NULL,
    
    -- Сетевые данные
    url TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    
    -- Статус через ENUM
    http_status analytics.http_status_enum NOT NULL,
    
    -- Метрики производительности
    response_time_ms INTEGER CHECK (response_time_ms >= 0),
    bytes_sent BIGINT CHECK (bytes_sent >= 0),
    
    -- Флаги и опциональные данные
    is_bot BOOLEAN DEFAULT FALSE,
    referrer TEXT
);

-- Комментарии к столбцам
COMMENT ON COLUMN analytics.table2_pg.session_id IS 'Уникальный идентификатор пользовательской сессии (UUID)';
COMMENT ON COLUMN analytics.table2_pg.request_time IS 'Время запроса с точностью до миллисекунд (с часовым поясом)';
COMMENT ON COLUMN analytics.table2_pg.url IS 'Полный URL запрашиваемой страницы';
COMMENT ON COLUMN analytics.table2_pg.ip_address IS 'IP-адрес клиента (тип INET поддерживает IPv4/IPv6)';
COMMENT ON COLUMN analytics.table2_pg.user_agent IS 'Строка User-Agent браузера или клиента';
COMMENT ON COLUMN analytics.table2_pg.http_status IS 'HTTP код ответа (через ENUM тип)';
COMMENT ON COLUMN analytics.table2_pg.response_time_ms IS 'Время обработки запроса в миллисекундах';
COMMENT ON COLUMN analytics.table2_pg.bytes_sent IS 'Размер ответа сервера в байтах';
COMMENT ON COLUMN analytics.table2_pg.is_bot IS 'Флаг: является ли запрос ботом';
COMMENT ON COLUMN analytics.table2_pg.referrer IS 'URL страницы перехода (может быть NULL)';

-- Комментарий к таблице
COMMENT ON TABLE analytics.table2_pg IS 'Таблица логов веб-сессий: хранит детали HTTP-запросов, производительность и информацию о клиентах';

-- Индексы
CREATE INDEX idx_table2_pg_request_time ON analytics.table2_pg(request_time);
CREATE INDEX idx_table2_pg_ip_address ON analytics.table2_pg(ip_address);
CREATE INDEX idx_table2_pg_http_status ON analytics.table2_pg(http_status);
CREATE INDEX idx_table2_pg_is_bot ON analytics.table2_pg(is_bot) WHERE is_bot = true; -- Частичный индекс

