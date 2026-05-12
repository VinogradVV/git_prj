// Функция-хирург: вырезает чистый JSON из любого мусора, который подсунет Cube SQL API
const getHardCleanJson = (filterObj) => {
  const s = String(filterObj.filter(v => v, () => '{}'));
  
  // Если фильтра нет (1=1) или это объект
  if (s.includes('=') || s === '1' || s === '[object Object]') {
    return '{}';
  }

  // 1. Ищем содержимое внутри фигурных скобок { ... }
  const match = s.match(/\{.*\}/);
  if (match) {
    let clean = match[0];
    // 2. Убираем обратные слеши (\"), которые Cube добавил для экранирования
    clean = clean.replace(/\\"/g, '"');
    // 3. Экранируем одинарные кавычки для ClickHouse (на всякий случай)
    return clean.replace(/'/g, "''");
  }
  
  return '{}';
};

cube(`ch_db_table__projection`, {
  sql: () => {
    // Берем фильтр от главного куба, чистим его "в мясо"
    const raw = getHardCleanJson(FILTER_PARAMS.ch_db_table.ctx);
    const safeCtx = `'${raw}'`;

    return `
      SELECT id, amount, region, status, created_at
      FROM analytics.raw_table
      WHERE (visitParamExtractString(${safeCtx}, 'p_region') = '' 
             OR region = visitParamExtractString(${safeCtx}, 'p_region'))
    `;
  },
  dimensions: {
    id: { sql: `id`, type: `string`, primaryKey: true },
    region: { sql: `region`, type: `string` },
    ctx: { sql: `1`, type: `string`, public: false }
  }
});

cube(`ch_db_table__block_filter`, {
  sql: () => {
    const raw = getHardCleanJson(FILTER_PARAMS.ch_db_table.ctx);
    const safeCtx = `'${raw}'`;

    return `
      SELECT * FROM (${ch_db_table__projection.sql()}) AS sub_p
      WHERE status = 'active'
        AND (visitParamExtractString(${safeCtx}, 'p_status') = '' 
             OR status = visitParamExtractString(${safeCtx}, 'p_status'))
    `;
  },
  dimensions: {
    ctx: { sql: `1`, type: `string`, public: false }
  }
});

cube(`ch_db_table`, {
  sql: () => `SELECT * FROM (${ch_db_table__block_filter.sql()}) AS sub_f`,

  measures: {
    total_amount: { sql: `amount`, type: `sum` },
    count: { sql: `id`, type: `count` }
  },

  dimensions: {
    id: { sql: `id`, type: `string`, primaryKey: true },
    region: { sql: `region`, type: `string` },
    status: { sql: `status`, type: `string` },
    // Поле для DBeaver/Superset
    ctx: { 
      // Возвращаем само значение, чтобы WHERE 'json' = 'json' был валидным
      sql: `${FILTER_PARAMS.ch_db_table.ctx.filter(v => v, () => `'{}'`)}`, 
      type: `string`, 
      public: false 
    }
  }
});
