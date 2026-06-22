module.exports = {
  MISSING_AUTH_HEADER: 'An authorization header is required',
  SLUG_TAKEN: 'Slug is already taken', // SL02
  ACCESS_CODE_REQUIRED: 'access_code is required when access_type is private', // AC01 (you'll define exact code)
  ACCESS_CODE_NOT_ALLOWED: 'access_code must not be provided when access_type is public', // AC02
  CARD_NOT_FOUND: 'Creator card not found', // NF01
  CARD_NOT_PUBLISHED: 'Creator card not found', // drafts return same as not-found, don't leak existence
  INVALID_ACCESS_CODE: 'Invalid access code', // AC03
};
