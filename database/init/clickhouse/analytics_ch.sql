CREATE DATABASE IF NOT EXISTS analytics;

CREATE TABLE analytics.table1_ch
(
    id UInt64 COMMENT 'Уникальный идентификатор записи',
    user_id UUID COMMENT 'ID пользователя',
    created_at DateTime COMMENT 'Время создания события',
    t1_f1 VARCHAR(100) COMMENT 'Произвольное текстовое поле',
    status LowCardinality(String) COMMENT 'Статус обработки',
    amount Decimal(18, 2) COMMENT 'Сумма транзакции',
    tags Array(String) COMMENT 'Список тегов',
    is_active Nullable(Bool) COMMENT 'Флаг активности',
    metadata Map(String, String) COMMENT 'Метаданные JSON-like',
    country_code FixedString(2) COMMENT 'Код страны'
)
ENGINE = MergeTree()
ORDER BY (created_at, id)
PARTITION BY toYYYYMM(created_at)
COMMENT 'Основная таблица аналитики событий: хранит транзакции и метаданные';

CREATE TABLE analytics.table2_ch
(
    -- Идентификаторы
    session_id UUID COMMENT 'Уникальный идентификатор пользовательской сессии',
    
    -- Время с повышенной точностью (миллисекунды)
    request_time DateTime64(3) COMMENT 'Время запроса с точностью до миллисекунд',
    
    -- Сетевые данные
    url String COMMENT 'Полный URL запрашиваемой страницы',
    ip_address IPv4 COMMENT 'IP-адрес клиента в оптимизированном формате',
    user_agent String COMMENT 'Строка User-Agent браузера или клиента',
    
    -- Статусы через перечисление (ИСПРАВЛЕНО: Enum16 вместо Enum8)
    http_status Enum16(
        'OK' = 200, 
        'Redirect' = 301, 
        'NotFound' = 404, 
        'Error' = 500,
        'BadRequest' = 400,
        'Unauthorized' = 401,
        'Forbidden' = 403,
        'ServerError' = 502,
        'ServiceUnavailable' = 503
    ) COMMENT 'HTTP код ответа сервера',
    
    -- Метрики производительности
    response_time_ms UInt32 COMMENT 'Время обработки запроса в миллисекундах',
    bytes_sent UInt64 COMMENT 'Размер ответа сервера в байтах',
    
    -- Флаги и опциональные данные
    is_bot Bool COMMENT 'Флаг: является ли запрос ботом',
    referrer Nullable(String) COMMENT 'URL страницы перехода (может отсутствовать)'
)
ENGINE = MergeTree()
-- Сортировка по времени и сессии
ORDER BY (request_time, session_id)
-- Партиционирование по дням
PARTITION BY toYYYYMMDD(request_time)
-- Уменьшенный шаг гранулярности для более точных индексов
SETTINGS index_granularity = 4096
COMMENT 'Таблица логов веб-сессий: хранит детали HTTP-запросов, производительность и информацию о клиентах';