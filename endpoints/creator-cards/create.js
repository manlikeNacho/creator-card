const { createHandler } = require('@app-core/server');
const createCreatorCard = require('@app/services/creator-card/create');
const logRequest = require('@app/middlewares/log-request');

module.exports = createHandler({
  path: '/creator-cards',
  method: 'post',
  middlewares: [logRequest],
  async handler(rc, helpers) {
    const payload = { ...rc.body };
    const response = await createCreatorCard(payload);

    return {
      status: helpers.http_statuses.HTTP_201_CREATED,
      message: 'Creator card created successfully',
      data: response,
    };
  },
});
