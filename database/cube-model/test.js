cube(`MyTestCube`, {
  sql: `SELECT 1 as id, 100 as amount, 'RU' as country`, // Можно заменить на имя вашей таблицы
  
  measures: {
    total_amount: {
      sql: `amount`,
      type: `sum`
    }
  },
  
  dimensions: {
    country: {
      sql: `country`,
      type: `string`
    }
  }
});
