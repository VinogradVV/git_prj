cube(`ch_db_table__projection`, {
  sql: () => {
    // Извлекаем значение фильтра. 
    // Если фильтр не применен, Cube.js вернет "1=1" во втором аргументе.
    let ctxVal = FILTER_PARAMS.ch_db_table__projection.ctx.filter(
      (v) => v, 
      () => '{}'
    );

    // Защита: если фильтра нет или он некорректен для JSON-парсинга
    if (typeof ctxVal !== 'string' || ctxVal === '1=1' || ctxVal.includes('=') ) {
      ctxVal = '{}';
    }

    // Чистим от лишних кавычек (BI иногда их дублирует) и экранируем
    const cleanCtx = ctxVal.replace(/^'|'$/g, '').replace(/'/g, "''");
    const safeCtx = `'${cleanCtx}'`;

    return `
      SELECT id, amount, region, status, created_at
      FROM analytics.raw_table
      WHERE 
        (visitParamExtractString(${safeCtx}, 'p_region') = '' 
         OR region = visitParamExtractString(${safeCtx}, 'p_region'))
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
      sql: `1`, // Виртуальное поле, колонки в БД нет
      type: `string`, 
      public: false 
    }
  }
});

cube(`ch_db_table__block_filter`, {
  sql: () => {
    let ctxVal = FILTER_PARAMS.ch_db_table__block_filter.ctx.filter(v => v, () => '{}');
    if (typeof ctxVal !== 'string' || ctxVal === '1=1' || ctxVal.includes('=')) {
      ctxVal = '{}';
    }
    
    const cleanCtx = ctxVal.replace(/^'|'$/g, '').replace(/'/g, "''");
    const safeCtx = `'${cleanCtx}'`;

    return `
      SELECT * FROM ${ch_db_table__projection.sql()}
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
  sql: () => `SELECT * FROM ${ch_db_table__block_filter.sql()}`,

  measures: {
    count: { sql: `id`, type: `count` },
    total_amount: {
      sql: `amount`,
      type: `sum`
    }
  },

  dimensions: {
    id: { sql: `id`, type: `string`, primaryKey: true },
    region: { sql: `region`, type: `string` },
    // Главная точка входа для фильтра в BI
    ctx: { 
      sql: `1`, 
      type: `string`, 
      public: false 
    }
  }
});
