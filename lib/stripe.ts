type StripeConstructor = new (...args: any[]) => any;
type StripeInstance = any;

let stripeInstance: StripeInstance | null = null;

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function loadStripeConstructor(): StripeConstructor {
  try {
    const stripeModule = eval("require")("stripe");
    // Fall back to the root module if .default is undefined
    return stripeModule.default || stripeModule;
  } catch {
    throw new Error(
      "Stripe package is not installed yet. Run `npm install stripe` before using billing routes."
    );
  }
}

export function getStripeServer() {
  if (stripeInstance) {
    return stripeInstance;
  }

  const Stripe = loadStripeConstructor();
  stripeInstance = new Stripe(getRequiredEnv("STRIPE_SECRET_KEY"), {
    apiVersion: "2025-05-28.basil",
    typescript: true,
  });

  return stripeInstance;
}

export function getProPriceId() {
  return getRequiredEnv("STRIPE_PRICE_PRO");
}

export function getStripeWebhookSecret() {
  return getRequiredEnv("STRIPE_WEBHOOK_SECRET");
}

export function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "http://localhost:3000"
  );
}
