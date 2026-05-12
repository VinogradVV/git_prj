/**
 * ctx-clickhouse-helper.js - библиотека хелперов для работы с контекстом (ctx) в Cube.js для ClickHouse
 *
 * Использование:
 * const { ctxVal, ctxWhere, ctxFilter } = require('./lib/ctx-clickhouse-helper');
 *
 * Каждый куб имеет измерение ctx, через которое передаются параметры.
 * Параметры передаются в формате JSON: {"param_name": "value", ...}
 *
 * Использует функции ClickHouse для парсинга JSON:
 * - visitParamExtractString, visitParamExtractInt, visitParamExtractFloat, visitParamExtractBool
 * - JSONExtractRaw, JSONExtract
 * - parseDateTimeBestEffort
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
  const rawCtx = `\$\{FILTER_PARAMS[${cubeName}].ctx.filter(v => v).slice(2)\}`;

  const typeMap = {
    'string': `visitParamExtractString(${rawCtx}, '${key}')`,
    'int': `visitParamExtractInt(${rawCtx}, '${key}')`,
    'float': `visitParamExtractFloat(${rawCtx}, '${key}')`,
    'bool': `visitParamExtractBool(${rawCtx}, '${key}')`,
    'date': `parseDateTimeBestEffort(visitParamExtractString(${rawCtx}, '${key}'))`
  };

  const sqlFunc = typeMap[type] || typeMap['string'];

  if (defaultValue === null) {
    return sqlFunc;
  }

  const isOptional = `empty(JSONExtractRaw(${rawCtx}, '${key}'))`;
  const formattedDefault = type === 'string' ? `'${defaultValue}'` : defaultValue;
  return `if(${isOptional}, ${formattedDefault}, ${sqlFunc})`;
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
  const rawCtx = `\$\{FILTER_PARAMS[${cubeName}].ctx.filter(v => v).slice(2)\}`;
  const isOptional = `empty(JSONExtractRaw(${rawCtx}, '${key}'))`;

  if (type === 'in_string') {
    const val = `JSONExtract(${rawCtx}, '${key}', 'Array(String)')`;
    return `(${isOptional} OR ${column} IN (${val}))`;
  }

  if (type === 'in_int') {
    const val = `JSONExtract(${rawCtx}, '${key}', 'Array(Int64)')`;
    return `(${isOptional} OR ${column} IN (${val}))`;
  }

  const val = ctxVal(key, type, null, cubeName);
  return `(${isOptional} OR ${column} = ${val})`;
};

module.exports = { ctxFilter, ctxVal, ctxWhere };
