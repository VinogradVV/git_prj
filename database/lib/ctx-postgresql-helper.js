/**
 * ctx-postgresql-helper.js - библиотека хелперов для работы с контекстом (ctx) в Cube.js для PostgreSQL
 *
 * Использование:
 * const { ctxVal, ctxWhere, ctxFilter } = require('./lib/ctx-postgresql-helper');
 *
 * Каждый куб имеет измерение ctx, через которое передаются параметры.
 * Параметры передаются в формате JSON: {"param_name": "value", ...}
 *
 * Использует JSONB операторы PostgreSQL:
 * - (json_col->>'key')::type - для извлечения значений
 * - COALESCE для значений по умолчанию
 */

/**
 * ctxFilter: Получает значение ctx для WHERE условия
 * Используется в WHERE: WHERE ctx = ${ctxFilter()}
 */
const ctxFilter = (cubeName = '[CUBE]') => {
  return `\${FILTER_PARAMS[${cubeName}].ctx.filter(v => v).slice(2)}`;
};

/**
 * ctxVal: Получение значения параметра из ctx для использования в формулах
 *
 * @param {string} key - имя параметра
 * @param {string} type - тип значения: 'string', 'int', 'float', 'bool', 'date'
 * @param {*} defaultValue - значение по умолчанию (если параметр не передан)
 * @param {string} cubeName - имя куба
 * @returns {string} SQL-выражение для получения значения
 */
const ctxVal = (key, type = 'string', defaultValue = null, cubeName = '[CUBE]') => {
  // Используем JSONB операторы для PostgreSQL
  const jsonExpr = `(ctx_data->>'${key}')`;

  const typeMap = {
    'string': `${jsonExpr}::text`,
    'int': `NULLIF(${jsonExpr}::text, '')::integer`,
    'float': `NULLIF(${jsonExpr}::text, '')::numeric`,
    'bool': `${jsonExpr}::boolean`,
    'date': `${jsonExpr}::timestamp`
  };

  const sqlFunc = typeMap[type] || typeMap['string'];

  if (defaultValue === null) {
    return sqlFunc;
  }

  const formattedDefault = type === 'string' ? `'${defaultValue}'` : defaultValue;
  return `COALESCE(NULLIF(${sqlFunc}, NULL), ${formattedDefault})`;
};

/**
 * ctxWhere: Формирование условия WHERE для фильтрации по параметру из ctx
 *
 * @param {string} column - имя колонки для фильтрации
 * @param {string} key - имя параметра в ctx
 * @param {string} type - тип: 'string', 'int', 'date', 'in_string', 'in_int'
 * @param {string} cubeName - имя куба
 * @returns {string} SQL-условие для WHERE
 */
const ctxWhere = (column, key, type = 'string', cubeName = '[CUBE]') => {
  const jsonExpr = `(ctx_data->>'${key}')`;

  if (type === 'in_string') {
    const val = `string_to_array(trim(both '{}' from ${jsonExpr}::text), ',')`;
    return `(${jsonExpr} IS NULL OR ${jsonExpr} = '' OR ${jsonExpr} = 'null' OR ${column} = ANY(${val}))`;
  }

  if (type === 'in_int') {
    const val = `string_to_array(trim(both '{}' from ${jsonExpr}::text), ',')`;
    return `(${jsonExpr} IS NULL OR ${jsonExpr} = '' OR ${jsonExpr} = 'null' OR ${column} = ANY(${val})::integer)`;
  }

  const val = ctxVal(key, type, null, cubeName);
  return `(${jsonExpr} IS NULL OR ${jsonExpr} = '' OR ${jsonExpr} = 'null' OR ${column} = ${val})`;
};

module.exports = { ctxFilter, ctxVal, ctxWhere };
