console.log('--- CONFIG LOADING: cube.js initialized ---');

module.exports = {
  // Это разрешает использование COMPILE_CONTEXT в кубах
  contextToAppId: ({ securityContext }) => {
    return `APP_DEFAULT`; 
  },
  
  // Мы убираем модификацию securityContext из queryRewrite, 
  // так как SQL API это блокирует. 
  // Мы будем доставать фильтр напрямую в коде кубов.
  queryRewrite: (query) => {
    return query;
  }
};
