const validator = require('@app-core/validator');
const { throwAppError, ERROR_CODE } = require('@app-core/errors');
const { appLogger } = require('@app-core/logger');
const CreatorCard = require('@app/repository/creator-card');
const CreatorCardMessages = require('@app/messages/creator-card');

const spec = `root {
  slug string<trim>
  creator_reference string<trim|length:20>
}`;
const parsedSpec = validator.parse(spec);

function serializeCard(record) {
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
    access_code: record.access_code ?? null,
    created: record.created,
    updated: record.updated,
    deleted: record.deleted || null,
  };
}

async function deleteCreatorCardBySlug(serviceData, options = {}) {
  const data = validator.validate(serviceData, parsedSpec);
  let response;

  try {
    // Find by slug — use raw query to bypass paranoid filter so we can check deleted state
    const card = await CreatorCard.findOne({
      query: { slug: data.slug },
      options: { lean: true },
    });

    // Rule: card does not exist
    if (!card) {
      throwAppError(CreatorCardMessages.CARD_NOT_FOUND, ERROR_CODE.NF01);
    }

    // Rule: card is already soft-deleted — treat as not found
    if (card.deleted && card.deleted !== 0) {
      throwAppError(CreatorCardMessages.CARD_NOT_FOUND, ERROR_CODE.NF01);
    }

    // Rule: creator_reference must match
    if (card.creator_reference !== data.creator_reference) {
      throwAppError(CreatorCardMessages.CREATOR_REFERENCE_MISMATCH, ERROR_CODE.INVLDDATA);
    }

    // Perform soft delete
    await CreatorCard.deleteOne({ query: { slug: data.slug } });

    // Re-fetch the deleted record so we return accurate deleted timestamp
    const deletedCard = await CreatorCard.findOne({
      query: { slug: data.slug },
      options: { lean: true },
    });

    response = serializeCard(deletedCard || { ...card, deleted: Date.now() });
  } catch (error) {
    appLogger.errorX(error, 'delete-creator-card-by-slug-error');
    throw error;
  }

  return response;
}

module.exports = deleteCreatorCardBySlug;
