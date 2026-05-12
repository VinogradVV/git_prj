console.log('--- CONFIG LOADING: cube.js initialized ---');

module.exports = {
  contextToAppId: ({ securityContext }) => {
    return `APP_${securityContext?.ctxValue || 'default'}`;
  },
  queryRewrite: (query) => {
    const ctxFilter = (query.filters || []).find(f => f.member && f.member.endsWith('.ctx'));
    if (ctxFilter && ctxFilter.values) {
      query.securityContext = {
        ...query.securityContext,
        ctxValue: String(ctxFilter.values)
      };
    }
    return query;
  }
};
