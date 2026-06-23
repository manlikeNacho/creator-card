const { createHandler } = require('@app-core/server');
const deleteCreatorCardBySlug = require('@app/services/creator-card/delete-by-slug');
const logRequest = require('@app/middlewares/log-request');

module.exports = createHandler({
  path: '/creator-cards/:slug',
  method: 'delete',
  middlewares: [logRequest],
  async handler(rc, helpers) {
    const payload = {
      slug: rc.params.slug,
      creator_reference: rc.body.creator_reference,
    };

    const response = await deleteCreatorCardBySlug(payload);

    return {
      status: helpers.http_statuses.HTTP_200_OK,
      message: 'Creator Card Deleted Successfully.',
      data: response,
    };
  },
});
