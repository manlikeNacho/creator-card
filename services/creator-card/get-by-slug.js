const validator = require('@app-core/validator');
const { throwAppError, ERROR_CODE } = require('@app-core/errors');
const { appLogger } = require('@app-core/logger');
const CreatorCard = require('@app/repository/creator-card');
const CreatorCardMessages = require('@app/messages/creator-card');

const spec = `root {
  slug string<trim>
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
    // access_code intentionally omitted — never returned on public retrieval
    created: record.created,
    updated: record.updated,
    deleted: record.deleted || null,
  };
}

async function getCreatorCardBySlug(serviceData, options = {}) {
  const data = validator.validate(serviceData, parsedSpec);
  let response;

  try {
    // Query without paranoid filter so we can detect soft-deleted cards
    const card = await CreatorCard.findOne({
      query: { slug: data.slug },
      options: { lean: true },
    });

    // Rule 1: card does not exist at all
    if (!card) {
      throwAppError(CreatorCardMessages.CARD_NOT_FOUND, ERROR_CODE.NF01);
    }

    // Rule 1b: card has been soft-deleted — treat as not found (NF01)
    if (card.deleted && card.deleted !== 0) {
      throwAppError(CreatorCardMessages.CARD_NOT_FOUND, ERROR_CODE.NF01);
    }

    // Rule 2: card exists but is a draft
    if (card.status === 'draft') {
      throwAppError(CreatorCardMessages.CARD_NOT_FOUND, ERROR_CODE.NF02);
    }

    // Rule 3: card is private — access_code required
    if (card.access_type === 'private') {
      if (!data.access_code) {
        throwAppError(CreatorCardMessages.ACCESS_CODE_REQUIRED_FOR_VIEW, ERROR_CODE.AC03);
      }

      // Rule 4: access_code provided but wrong
      if (data.access_code !== card.access_code) {
        throwAppError(CreatorCardMessages.INVALID_ACCESS_CODE, ERROR_CODE.AC04);
      }
    }

    response = serializePublicCard(card);
  } catch (error) {
    appLogger.errorX(error, 'get-creator-card-by-slug-error');
    throw error;
  }

  return response;
}

module.exports = getCreatorCardBySlug;
