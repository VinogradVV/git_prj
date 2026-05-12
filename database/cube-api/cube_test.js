// Вспомогательная функция для извлечения JSON-строки
const getCtxString = (filter) => {
  const s = String(filter.filter(v => v, () => '{}'));
  // Находим только содержимое внутри фигурных скобок
  const match = s.match(/\{.*\}/); 
  return match ? match[0] : '{}';
};

// 1. Проекция
cube(`ch_db_table__projection`, {
  sql: (inheritedCtx) => {
    const currentJson = (typeof inheritedCtx === 'string') ? inheritedCtx : getCtxString(FILTER_PARAMS.ch_db_table__projection.ctx);
    const escapedJson = currentJson.replace(/'/g, "''");
    
    return `
      SELECT id, amount, region, status, created_at
      FROM analytics.raw_table
      WHERE (visitParamExtractString('${escapedJson}', 'p_region') = '' 
             OR region = visitParamExtractString('${escapedJson}', 'p_region'))
    `;
  },

  measures: {
    total_amount: { sql: `amount`, type: `sum` },
    count: { type: `count` }
  },

  dimensions: {
    id: { sql: `id`, type: `string`, primaryKey: true },
    region: { sql: `region`, type: `string` },
    status: { sql: `status`, type: `string` },
    createdAt: { sql: `created_at`, type: `time` },
    ctx: { 
      sql: `${FILTER_PARAMS.ch_db_table__projection.ctx.filter(v => v, () => `'{}'`)}`, 
      type: `string`, public: false 
    }
  }
});

// 2. Блок-фильтр
cube(`ch_db_table__block_filter`, {
  sql: (inheritedCtx) => {
    const currentJson = (typeof inheritedCtx === 'string') ? inheritedCtx : getCtxString(FILTER_PARAMS.ch_db_table__block_filter.ctx);
    const escapedJson = currentJson.replace(/'/g, "''");

    return `
      SELECT * FROM (${ch_db_table__projection.sql(currentJson)}) AS sub_proj
      WHERE status = 'active'
        AND (visitParamExtractString('${escapedJson}', 'p_status') = '' 
             OR status = visitParamExtractString('${escapedJson}', 'p_status'))
    `;
  },

  measures: {
    total_amount: { sql: `amount`, type: `sum` },
    count: { type: `count` }
  },

  dimensions: {
    id: { sql: `id`, type: `string`, primaryKey: true },
    region: { sql: `region`, type: `string` },
    status: { sql: `status`, type: `string` },
    ctx: { 
      sql: `${FILTER_PARAMS.ch_db_table__block_filter.ctx.filter(v => v, () => `'{}'`)}`, 
      type: `string`, public: false 
    }
  }
});

// 3. Основной куб
cube(`ch_db_table`, {
  sql: () => {
    const topJson = getCtxString(FILTER_PARAMS.ch_db_table.ctx);
    // Пробрасываем JSON по цепочке функций
    return `SELECT * FROM (${ch_db_table__block_filter.sql(topJson)}) AS sub_final`;
  },

  measures: {
    total_amount: { sql: `amount`, type: `sum` },
    count: { sql: `id`, type: `count` }
  },

  dimensions: {
    id: { sql: `id`, type: `string`, primaryKey: true },
    region: { sql: `region`, type: `string` },
    status: { sql: `status`, type: `string` },
    ctx: { 
      sql: `${FILTER_PARAMS.ch_db_table.ctx.filter(v => v, () => `'{}'`)}`, 
      type: `string`, public: false 
    }
  }
});
