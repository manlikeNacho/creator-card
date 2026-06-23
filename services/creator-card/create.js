const validator = require('@app-core/validator');
const { throwAppError, ERROR_CODE } = require('@app-core/errors');
const { appLogger } = require('@app-core/logger');
const CreatorCard = require('@app/repository/creator-card');
const CreatorCardMessages = require('@app/messages/creator-card');

const spec = `root {
  title string<trim|minLength:3|maxLength:100>
  description? string<trim|maxLength:500>
  slug? string<trim|minLength:5|maxLength:50>
  creator_reference string<length:20>
  links[]? {
    title string<trim|minLength:1|maxLength:100>
    url string<trim|maxLength:200>
  }
  service_rates? {
    currency string(NGN|USD|GBP|GHS)
    rates[] {
      name string<trim|minLength:3|maxLength:100>
      description? string<trim|maxLength:250>
      amount number<min:1>
    }
  }
  status string(draft|published)
  access_type? string(public|private)
  access_code? string<length:6>
}`;
const parsedSpec = validator.parse(spec);

const URL_PREFIXES = ['http://', 'https://'];
const SLUG_CHARSET_REGEX = /^[a-zA-Z0-9_-]+$/;
const ACCESS_CODE_REGEX = /^[a-zA-Z0-9]{6}$/;
const ALPHANUMERIC = 'abcdefghijklmnopqrstuvwxyz0123456789';

function generateRandomSuffix(length = 6) {
  let suffix = '';
  for (let i = 0; i < length; i += 1) {
    suffix += ALPHANUMERIC[Math.floor(Math.random() * ALPHANUMERIC.length)];
  }
  return suffix;
}

function slugify(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '');
}

function validateLinks(links) {
  (links || []).forEach((link) => {
    const startsWithValidPrefix = URL_PREFIXES.some((prefix) => link.url.startsWith(prefix));
    if (!startsWithValidPrefix) {
      throwAppError(CreatorCardMessages.INVALID_LINK_URL, ERROR_CODE.VALIDATIONERR);
    }
  });
}

function validateServiceRates(serviceRates) {
  if (!serviceRates) return;

  serviceRates.rates.forEach((rate) => {
    if (!Number.isInteger(rate.amount)) {
      throwAppError(CreatorCardMessages.INVALID_RATE_AMOUNT, ERROR_CODE.VALIDATIONERR);
    }
  });
}

function resolveAccessControl(data) {
  const accessType = data.access_type || 'public';

  if (accessType === 'private' && !data.access_code) {
    throwAppError(CreatorCardMessages.ACCESS_CODE_REQUIRED, ERROR_CODE.AC01);
  }

  if (accessType === 'public' && data.access_code) {
    throwAppError(CreatorCardMessages.ACCESS_CODE_NOT_ALLOWED, ERROR_CODE.AC05);
  }

  if (data.access_code && !ACCESS_CODE_REGEX.test(data.access_code)) {
    throwAppError(CreatorCardMessages.INVALID_ACCESS_CODE_FORMAT, ERROR_CODE.VALIDATIONERR);
  }

  return { access_type: accessType, access_code: data.access_code || null };
}

async function resolveSlug(data) {
  if (data.slug) {
    if (!SLUG_CHARSET_REGEX.test(data.slug)) {
      throwAppError(CreatorCardMessages.INVALID_SLUG_FORMAT, ERROR_CODE.VALIDATIONERR);
    }

    const existing = await CreatorCard.findOne({ query: { slug: data.slug, deleted: 0 } });
    if (existing) {
      throwAppError(CreatorCardMessages.SLUG_TAKEN, ERROR_CODE.SL02);
    }

    return data.slug;
  }

  let candidate = slugify(data.title);
  let needsSuffix = candidate.length < 5;

  if (!needsSuffix) {
    const existing = await CreatorCard.findOne({ query: { slug: candidate } });
    needsSuffix = !!existing;
  }

  if (needsSuffix) {
    let isUnique = false;
    while (!isUnique) {
      const attempt = `${candidate}-${generateRandomSuffix(6)}`;
      // eslint-disable-next-line no-await-in-loop
      const existing = await CreatorCard.findOne({ query: { slug: attempt } });
      if (!existing) {
        candidate = attempt;
        isUnique = true;
      }
    }
  }

  return candidate;
}

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

async function createCreatorCard(serviceData, options = {}) {
  const data = validator.validate(serviceData, parsedSpec);
  let response;

  try {
    validateLinks(data.links);
    validateServiceRates(data.service_rates);

    const accessControl = resolveAccessControl(data);
    const slug = await resolveSlug(data);

    const record = await CreatorCard.create({
      ...data,
      slug,
      access_type: accessControl.access_type,
      access_code: accessControl.access_code,
    });

    response = serializeCard(record);
  } catch (error) {
    appLogger.errorX(error, 'create-creator-card-error');
    throw error;
  }

  return response;
}

module.exports = createCreatorCard;
