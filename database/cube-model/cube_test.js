// Вспомогательная функция для безопасной работы с фильтром
// Она гарантирует, что в ClickHouse всегда попадет валидная строка, а не "1=1"
const getSafeCtx = (filterObj) => {
  // .filter() с колбэком — самый стабильный способ вытащить значение
  const ctxVal = filterObj.filter(v => v, () => '{}');
  
  // Если фильтр не задан или вернул логическое выражение (1=1), сбрасываем в пустой JSON
  const isInvalid = typeof ctxVal !== 'string' || ctxVal === '1=1' || ctxVal.includes('=');
  const cleanCtx = isInvalid ? '{}' : ctxVal.replace(/^'|'$/g, '').replace(/'/g, "''");
  
  return `'${cleanCtx}'`;
};

cube(`ch_db_table__projection`, {
  sql: () => {
    const safeCtx = getSafeCtx(FILTER_PARAMS.ch_db_table__projection.ctx);

    return `
      SELECT id, amount, region, status, created_at
      FROM analytics.raw_table
      WHERE 
        -- Парсим JSON прямо из строкового литерала, который вшил Cube.js
        (visitParamExtractString(${safeCtx}, 'p_region') = '' 
         OR region = visitParamExtractString(${safeCtx}, 'p_region'))
    `;
  },

  measures: {
    total_amount: {
      sql: `amount`,
      type: `sum`
    }
  },

  dimensions: {
    id: { sql: `id`, type: `string`, primaryKey: true },
    region: { sql: `region`, type: `string` },
    status: { sql: `status`, type: `string` },
    createdAt: { sql: `created_at`, type: `time` },
    
    // Виртуальное измерение для приема фильтра. 
    // Мы пишем sql: '1', чтобы не лезть в реальную колонку БД.
    ctx: { 
      sql: `1`, 
      type: `string`, 
      public: false 
    }
  }
});

cube(`ch_db_table__block_filter`, {
  sql: () => {
    const safeCtx = getSafeCtx(FILTER_PARAMS.ch_db_table__block_filter.ctx);

    return `
      SELECT * FROM ${ch_db_table__projection.sql()}
      WHERE status = 'active'
        AND (visitParamExtractString(${safeCtx}, 'p_status') = '' 
             OR status = visitParamExtractString(${safeCtx}, 'p_status'))
    `;
  },

  dimensions: {
    // Вычисляемое поле на основе проброшенного JSON
    customLabel: {
      sql: () => {
        const safeCtx = getSafeCtx(FILTER_PARAMS.ch_db_table__block_filter.ctx);
        return `visitParamExtractString(${safeCtx}, 'p_label')`;
      },
      type: `string`
    },
    ctx: { sql: `1`, type: `string`, public: false }
  }
});

cube(`ch_db_table`, {
  sql: () => `SELECT * FROM ${ch_db_table__block_filter.sql()}`,

  measures: {
    count: { sql: `id`, type: `count` },
    total_amount: { sql: `amount`, type: `sum` }
  },

  dimensions: {
    id: { sql: `id`, type: `string`, primaryKey: true },
    region: { sql: `region`, type: `string` },
    
    // Это поле будет видеть BI пользователь
    ctx: { 
      sql: `1`, 
      type: `string`, 
      public: false 
    }
  }
});
