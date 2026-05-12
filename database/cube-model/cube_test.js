// 1. Общая функция для вычленения значения из фильтра
// Работает надежно и в SQL API, и в обычном API
const getRawJson = (filter) => {
  // Вызываем фильтр. Если его нет, Cube вернет null или (1=1)
  const val = filter.filter(v => v, () => '{}');
  const sVal = String(val);
  
  // Если Cube подставил SQL-заглушку, возвращаем пустой JSON
  if (!sVal || sVal === '{}' || sVal.includes('=') || sVal === '1') {
    return '{}';
  }
  // Очищаем от кавычек
  return sVal.replace(/^'|'$/g, '');
};

cube(`ch_db_table__projection`, {
  sql: () => {
    // Используем FILTER_PARAMS текущего куба
    const jsonStr = getRawJson(FILTER_PARAMS.ch_db_table__projection.ctx);
    const safeCtx = `'${jsonStr.replace(/'/g, "''")}'`;

    return `
      SELECT id, amount, region, status, created_at
      FROM analytics.raw_table
      WHERE 
        (visitParamExtractString(${safeCtx}, 'p_region') = '' 
         OR region = visitParamExtractString(${safeCtx}, 'p_region'))
    `;
  },

  dimensions: {
    id: { sql: `id`, type: `string`, primaryKey: true },
    region: { sql: `region`, type: `string` },
    status: { sql: `status`, type: `string` },
    // Поле должно называться одинаково во всех кубах для проброса!
    ctx: { 
      sql: `${FILTER_PARAMS.ch_db_table__projection.ctx.filter(v => v, () => `'{}'`)}`, 
      type: `string`, 
      public: false 
    }
  }
});

cube(`ch_db_table__block_filter`, {
  sql: () => {
    const jsonStr = getRawJson(FILTER_PARAMS.ch_db_table__block_filter.ctx);
    const safeCtx = `'${jsonStr.replace(/'/g, "''")}'`;

    return `
      SELECT * FROM ${ch_db_table__projection.sql()}
      WHERE status = 'active'
        AND (visitParamExtractString(${safeCtx}, 'p_status') = '' 
             OR status = visitParamExtractString(${safeCtx}, 'p_status'))
    `;
  },

  dimensions: {
    ctx: { 
      sql: `${FILTER_PARAMS.ch_db_table__block_filter.ctx.filter(v => v, () => `'{}'`)}`, 
      type: `string`, 
      public: false 
    }
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
    ctx: { 
      sql: `${FILTER_PARAMS.ch_db_table.ctx.filter(v => v, () => `'{}'`)}`, 
      type: `string`, 
      public: false 
    }
  }
});
