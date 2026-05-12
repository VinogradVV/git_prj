DROP TABLE IF EXISTS analytics.raw_table;
CREATE TABLE IF NOT EXISTS analytics.raw_table
(
    `id` String  COMMENT 'ID',
    `amount` Float64 COMMENT 'Сумма',
    `region` String COMMENT 'Регион',
    `status` String COMMENT 'Статус',
    `created_at` DateTime COMMENT 'Время создания'
)
ENGINE = MergeTree()
ORDER BY (region, status, created_at)
SETTINGS index_granularity = 8192;

ALTER TABLE analytics.raw_table MODIFY COMMENT '{
  "app": "asapBI",
  "descr": "Тест для Cube.js",
  "folder": "cube/raw"
}';


INSERT INTO analytics.raw_table 
(id, amount, region, status, created_at) 
VALUES
('1', 100.0, 'North', 'active', '2024-01-01 10:00:00'),
('2', 200.0, 'North', 'inactive', '2024-01-02 11:00:00'),
('3', 150.0, 'South', 'active', '2024-01-03 12:00:00'),
('4', 300.0, 'South', 'active', '2024-01-04 13:00:00'),
('5', 50.0,  'West',  'active', '2024-01-05 14:00:00'),
('6', 400.0, 'East',  'pending','2024-01-06 15:00:00'),
('7', 250.0, 'North', 'active', '2024-01-07 16:00:00'),
('8', 120.0, 'West',  'active', '2024-01-08 17:00:00'),
('9', 90.0,  'South', 'inactive','2024-01-09 18:00:00'),
('10',180.0, 'North', 'active', '2024-01-10 19:00:00');