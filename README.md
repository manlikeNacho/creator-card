# Creator Card API

A REST API built with Node.js and Express that allows creators to build and share public-facing digital cards — complete with links, service rates, and access control. Built as part of the Resilience 17 Venture Studio backend engineering assessment.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
  - [Create a Creator Card](#1-create-a-creator-card)
  - [Retrieve a Creator Card](#2-retrieve-a-creator-card)
  - [Delete a Creator Card](#3-delete-a-creator-card)
- [Error Codes](#error-codes)
- [Project Structure](#project-structure)
- [Business Rules](#business-rules)
- [Deployment](#deployment)

---

## Overview

The Creator Card API enables creators to register a public card that showcases their links and service rates. Cards can be public or private (pin-protected), and support draft/published status. The API is stateless — no authentication is required to interact with any endpoint.

---

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (via Mongoose)
- **Validation:** VSL (internal Validation Specification Language DSL)
- **Logging:** Pino
- **ID Generation:** ULID
- **Deployment:** Render / Heroku

---

## Getting Started

### Prerequisites

- Node.js v16+
- MongoDB instance (local or Atlas)

### Installation

```bash
git clone <your-repo-url>
cd <project-directory>
npm install
cp .env.example .env
```

Edit `.env` with your values (see [Environment Variables](#environment-variables)), then:

```bash
node bootstrap.js
```

The server starts on the port defined in your `.env` file (default: `3000`).

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Port the server listens on | Yes |
| `MONGODB_URI` | MongoDB connection string | Yes |
| `APP_NAME` | Application name used in logs | Yes |
| `JWT_SECRET` | Secret for JWT signing | Yes |
| `JWT_DEFAULT_EXPIRY` | JWT token expiry (e.g. `1H`) | Yes |
| `HASH_SALT_ROUNDS` | bcrypt salt rounds (e.g. `10`) | Yes |
| `PINO_LOG_LEVEL` | Log level (`info`, `warn`, `error`) | No |
| `RESEND_TOKEN` | Resend API key for email notifications | No |
| `RESEND_SENDER_ADDRESS` | Sender email address | No |

---

## API Reference

**Base URL:** `https://creator-card-59vp.onrender.com`

> No authentication is required. No API keys or bearer tokens needed.

---

### 1. Create a Creator Card

**`POST /creator-cards`**

Creates a new Creator Card.

#### Request Body

```json
{
  "title": "George Cooks",
  "description": "George Cooks is a weekly cooking podcast by Chef George AmadiObi",
  "slug": "george-cooks",
  "creator_reference": "crt_8f2k1m9x4p7w3q5z",
  "links": [
    { "title": "YouTube Channel", "url": "https://youtube.com/@georgecooks" },
    { "title": "Instagram", "url": "https://instagram.com/georgecooks" }
  ],
  "service_rates": {
    "currency": "NGN",
    "rates": [
      { "name": "IG Story Post", "description": "One Instagram story mention", "amount": 5000000 },
      { "name": "Recipe Feature", "description": "Featured recipe segment", "amount": 15000000 }
    ]
  },
  "status": "published",
  "access_type": "public"
}
```

#### Field Rules

| Field | Required | Rules |
|-------|----------|-------|
| `title` | Yes | String, 3–100 characters |
| `description` | No | String, max 500 characters |
| `slug` | No | 5–50 chars; letters, numbers, hyphens and underscores only; must be unique. Auto-generated from title if omitted |
| `creator_reference` | Yes | Exactly 20 characters |
| `links` | No | Array; each entry needs `title` (1–100 chars) and `url` (max 200 chars, must start with `http://` or `https://`) |
| `service_rates` | No | If present: `currency` must be `NGN`, `USD`, `GBP`, or `GHS`; `rates` must be non-empty array of objects with `name`, optional `description`, and positive integer `amount` |
| `status` | Yes | `draft` or `published` |
| `access_type` | No | `public` or `private`; defaults to `public` |
| `access_code` | Conditional | Required if `access_type` is `private`; exactly 6 alphanumeric characters. Must NOT be provided for public cards |

#### Slug Auto-Generation

If `slug` is omitted, one is auto-generated from `title`:
1. Lowercase the title
2. Replace spaces with hyphens
3. Strip any character that isn't a letter, number, hyphen, or underscore
4. If result is shorter than 5 characters or already taken, append `-` followed by a random 6-character alphanumeric suffix (e.g. `cook-a8x2k1`)

If you provide a `slug` that is already taken, the API returns error `SL02` — it will never silently modify a client-provided slug.

#### Success Response — `HTTP 200`

```json
{
  "status": "success",
  "message": "Creator Card Created Successfully.",
  "data": {
    "id": "01JG8XYZA2B3C4D5E6F7G8H9J0",
    "title": "George Cooks",
    "description": "George Cooks is a weekly cooking podcast by Chef George AmadiObi",
    "slug": "george-cooks",
    "creator_reference": "crt_8f2k1m9x4p7w3q5z",
    "links": [
      { "title": "YouTube Channel", "url": "https://youtube.com/@georgecooks" }
    ],
    "service_rates": {
      "currency": "NGN",
      "rates": [
        { "name": "IG Story Post", "description": "One Instagram story mention", "amount": 5000000 }
      ]
    },
    "status": "published",
    "access_type": "public",
    "access_code": null,
    "created": 1767052800000,
    "updated": 1767052800000,
    "deleted": null
  }
}
```

> `access_code` is returned on creation so the creator can record it. It is **never** returned by the retrieval endpoint.

---

### 2. Retrieve a Creator Card

**`GET /creator-cards/:slug`**

Publicly retrieves a single card by its slug.

#### Path Parameter

| Parameter | Description |
|-----------|-------------|
| `slug` | The unique slug of the card |

#### Query Parameter (Private Cards Only)

| Parameter | Description |
|-----------|-------------|
| `access_code` | Required for private cards — e.g. `?access_code=A1B2C3` |

#### Access Rules (applied in order)

1. Card does not exist → `404` / `NF01`
2. Card is soft-deleted → `404` / `NF01`
3. Card status is `draft` → `404` / `NF02`
4. Card is `private` and no `access_code` provided → `403` / `AC03`
5. Card is `private` and `access_code` is wrong → `403` / `AC04`
6. All checks pass → `200` with card data

#### Success Response — `HTTP 200`

```json
{
  "status": "success",
  "message": "Creator Card Retrieved Successfully.",
  "data": {
    "id": "01JG8XYZA2B3C4D5E6F7G8H9J0",
    "title": "George Cooks",
    "description": "George Cooks is a weekly cooking podcast by Chef George AmadiObi",
    "slug": "george-cooks",
    "creator_reference": "crt_8f2k1m9x4p7w3q5z",
    "links": [
      { "title": "YouTube Channel", "url": "https://youtube.com/@georgecooks" }
    ],
    "service_rates": {
      "currency": "NGN",
      "rates": [
        { "name": "IG Story Post", "description": "One story mention", "amount": 5000000 }
      ]
    },
    "status": "published",
    "access_type": "public",
    "created": 1767052800000,
    "updated": 1767052800000,
    "deleted": null
  }
}
```

> `access_code` is **omitted entirely** from retrieval responses, even for private cards accessed with the correct pin.

---

### 3. Delete a Creator Card

**`DELETE /creator-cards/:slug`**

Soft-deletes a card by its slug. The card is no longer publicly retrievable after deletion.

#### Path Parameter

| Parameter | Description |
|-----------|-------------|
| `slug` | The unique slug of the card to delete |

#### Request Body

```json
{
  "creator_reference": "crt_8f2k1m9x4p7w3q5z"
}
```

| Field | Required | Rules |
|-------|----------|-------|
| `creator_reference` | Yes | Exactly 20 characters; must match the value stored on the card |

#### Success Response — `HTTP 200`

```json
{
  "status": "success",
  "message": "Creator Card Deleted Successfully.",
  "data": {
    "id": "01JG8XYZA2B3C4D5E6F7G8H9J0",
    "title": "George Cooks",
    "description": "George Cooks is a weekly cooking podcast by Chef George AmadiObi",
    "slug": "george-cooks",
    "creator_reference": "crt_8f2k1m9x4p7w3q5z",
    "links": [],
    "service_rates": null,
    "status": "published",
    "access_type": "public",
    "access_code": null,
    "created": 1767052800000,
    "updated": 1767052800000,
    "deleted": 1767139200000
  }
}
```

> After deletion, `GET /creator-cards/:slug` returns `404` / `NF01`.

---

## Error Codes

### Framework Validation Errors

Field-level validation failures (wrong types, missing required fields, length violations, invalid enum values) return `HTTP 400` with the validator's own error response format.

### Business Rule Errors

| Code | HTTP Status | Trigger |
|------|-------------|---------|
| `SL02` | 400 | Provided slug is already taken by another card |
| `AC01` | 400 | `access_code` is required when `access_type` is `private` |
| `AC05` | 400 | `access_code` must not be provided when `access_type` is `public` |
| `NF01` | 404 | Card with the given slug does not exist (or has been deleted) |
| `NF02` | 404 | Card exists but its status is `draft` |
| `AC03` | 403 | Card is private — `access_code` query parameter is required |
| `AC04` | 403 | Provided `access_code` does not match |

#### Error Response Format

```json
{
  "status": "error",
  "message": "Slug is already taken",
  "code": "SL02"
}
```

---

## Project Structure

```
├── app.js                          # Express app entry point
├── bootstrap.js                    # Bootstraps env and starts app
├── endpoints/
│   └── creator-cards/
│       ├── create.js               # POST /creator-cards
│       ├── get-by-slug.js          # GET /creator-cards/:slug
│       └── delete-by-slug.js       # DELETE /creator-cards/:slug
├── services/
│   └── creator-card/
│       ├── create.js               # Creation business logic
│       ├── get-by-slug.js          # Retrieval business logic
│       └── delete-by-slug.js       # Deletion business logic
├── models/
│   └── creator-card.js             # Mongoose schema
├── repository/
│   └── creator-card/
│       └── index.js                # Repository factory instance
├── messages/
│   └── creator-card.js             # Human-readable error messages
├── middlewares/
│   └── log-request.js              # Request logging middleware
├── core/                           # Internal framework utilities
│   ├── errors/                     # Error throwing and HTTP mapping
│   ├── validator-vsl/              # VSL validation DSL
│   ├── express/                    # Express server factory
│   ├── mongoose/                   # Mongoose connection helpers
│   ├── logger/                     # Pino logger
│   └── repository-factory/         # Repository method factories
└── .env.example                    # Environment variable template
```

---

## Business Rules

- **Identifiers:** MongoDB stores documents with `_id`. All API responses expose this as `id` — `_id` is never returned.
- **Soft Deletion:** Cards are never hard-deleted. A `deleted` timestamp is set on the document. Deleted cards return `NF01` on the retrieval endpoint.
- **Slug uniqueness:** Enforced across all active cards. A slug freed by a deleted card can be reused.
- **Draft cards:** Draft cards are never publicly retrievable. Attempting to retrieve one returns `NF02` — a distinct code from `NF01` so callers can differentiate "does not exist" from "exists but is a draft".
- **access_code secrecy:** The `access_code` is returned on creation (the creator needs it) but is **never** included in retrieval responses.
- **Service rates amounts:** Must be positive integers representing minor currency units (kobo for NGN, cents for USD, pence for GBP, pesewas for GHS).

---

## Deployment

This project is configured for deployment on **Render** or **Heroku**.

### Render

| Setting | Value |
|---------|-------|
| Build Command | `npm install` |
| Start Command | `node bootstrap.js` |
| Root Directory | *(leave blank)* |

### Heroku

The included `Procfile` handles this automatically:

```
web: node bootstrap.js
```

Make sure all required environment variables are set in your platform's dashboard before deploying.

---

*Built for the Resilience 17 Venture Studio Backend Engineering Assessment.*
