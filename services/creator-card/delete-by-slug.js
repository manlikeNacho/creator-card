const validator = require('@app-core/validator');
const { throwAppError, ERROR_CODE } = require('@app-core/errors');
const { appLogger } = require('@app-core/logger');
const CreatorCard = require('@app/repository/creator-card');
const CreatorCardMessages = require('@app/messages/creator-card');

const spec = `root {
  creator_reference string<trim|length:1,20>
  access_code? string<trim>
}`;
const parsedSpec = validator.parse(spec);

function serializePublicCard(record) {
  return {
    id: record._id,
    title: record.title,
    description: record.description ?? null,
    slug: record.slug,
    creator_reference: record.creator_reference,
    links: record.links || [],
    service_rates: record.service_rates || null,
    status: record.status,
    access_type: record.access_type,
    // access_code intentionally omitted — never returned publicly
    created: record.created,
    updated: record.updated,
    deleted: record.deleted || null,
  };
}

async function deleteCreatorCardBySlug(serviceData, options = {}) {
  const data = validator.validate(serviceData, parsedSpec);
  let response;

  try {
    // Rule order: NF01 -> NF02 -> AC03 -> AC04
    const card = await CreatorCard.findOne({ query: { slug: data.slug } });

    if (!card) {
      throwAppError(CreatorCardMessages.CARD_NOT_FOUND, ERROR_CODE.NF01);
    }

    if (card.deleted) {
      throwAppError(CreatorCardMessages.CARD_ALREADY_DELETED, ERROR_CODE.NF02);
    }

    await CreatorCard.deleteOne({ query: { slug: data.slug } });

    response = serializePublicCard(card);
  } catch (error) {
    appLogger.errorX(error, 'delete-creator-card-by-slug-error');
    throw error;
  }

  return response;
}

module.exports = deleteCreatorCardBySlug;
