const { createHandler } = require('@app-core/server');
const { getCreatorCardBySlug } = require('@app/services/creator-card/get-by-slug');
const logRequest = require('@app/middlewares/log-request');

module.exports = createHandler({
  path: '/creator-cards/:slug',
  method: 'get',
  middlewares: [logRequest],
  async handler(rc, helpers) {
    const payload = { slug: rc.params.slug, access_code: rc.query.access_code };
    const response = await getCreatorCardBySlug(payload);

    return {
      status: helpers.http_statuses.HTTP_200_OK,
      message: 'Creator card fetched',
      data: response,
    };
  },
});
