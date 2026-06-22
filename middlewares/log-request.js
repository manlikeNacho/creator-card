const { createHandler } = require('@app-core/server');
const { appLogger } = require('@app-core/logger');

module.exports = createHandler({
  // Step 1: Define path pattern
  path: '*', // '*' = all routes, or specific pattern like '/api/*'

  // Step 2: Define handler
  async handler(rc, helpers) {
    // rc = request context
    // rc.props = endpoint props (from endpoint definition)

    // Step 3: Perform middleware logic
    appLogger.info(
      {
        method: rc.method,
        path: rc.path,
        body: rc.body,
      },
      'request-received'
    );

    // Step 4: Augment request context (optional)
    // Data added here becomes available in endpoint handler as rc.meta
    return {
      augments: {
        meta: {
          requestTime: Date.now(),
          // Add any data you want available in endpoint handler
        },
      },
    };
  },
});
