# Summaria

[**View Live Demo**](https://summaria-y1d6.vercel.app/)
Summari is a Next.js application that turns PDFs into concise, readable AI summaries. Users can upload documents, generate summaries with Gemini or OpenAI, manage saved summaries, and upgrade from a free Basic plan to a Pro subscription with Stripe.

## Features

- Clerk authentication with protected product routes
- PDF uploads powered by UploadThing
- PDF text extraction with LangChain
- AI summary generation with Gemini and OpenAI fallback
- Summary dashboard and individual summary pages
- Client-side PDF export for generated summaries
- Free Basic plan with monthly usage limits
- Stripe-powered Pro subscriptions and billing portal support

## Tech Stack

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Clerk
- Neon Postgres
- UploadThing
- Stripe
- Google Gemini API
- OpenAI API

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env.local` file with values like these:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_PRO=
APP_URL=http://localhost:3000

UPLOADTHING_TOKEN=
OPENAI_KEY=
GEMINI_API_KEY=
DATABASE_URL=
```

### 3. Apply the database schema

Run the SQL in [schema.sql](./schema.sql) against your Neon database before starting the app.

### 4. Start the development server

```bash
npm run dev
```

Open `http://localhost:3000`.

## Stripe Test Mode Setup

To test subscriptions locally:

1. Create a Pro product and recurring monthly price in Stripe.
2. Copy the resulting `price_...` value into `STRIPE_PRICE_PRO`.
3. Configure a webhook endpoint for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Point the webhook to:

```text
http://localhost:3000/api/stripe/webhook
```

If you are testing locally, use the Stripe CLI or a public tunnel so Stripe can reach your app.

## Available Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Project Structure

```text
app/                  App Router pages and API routes
action/               Server actions
components/           UI and feature components
lib/                  Database, billing, Stripe, AI, and helper modules
utils/                Shared utility functions
schema.sql            Database schema
```

## Deployment Notes

Before deploying:

- set production environment variables in your hosting provider
- set `APP_URL` to your production domain
- apply [schema.sql](./schema.sql) to the production database
- configure the production Stripe webhook endpoint
- rotate any secrets that were exposed during development

## Status

Summari is ready for local testing of:

- free Basic plan usage
- Pro checkout flow
- Stripe subscription upgrades
- summary generation and management

Production deployment should only happen after valid production secrets and webhook configuration are in place.
