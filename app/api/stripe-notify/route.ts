import Stripe from "stripe";
import { handleOrderSession } from "@/services/order";
import { respOk } from "@/lib/resp";
import { log } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const stripePrivateKey = process.env.STRIPE_PRIVATE_KEY;
    const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripePrivateKey || !stripeWebhookSecret) {
      throw new Error("invalid stripe config");
    }

    const stripe = new Stripe(stripePrivateKey);

    const sign = req.headers.get("stripe-signature") as string;
    const body = await req.text();
    if (!sign || !body) {
      throw new Error("invalid notify data");
    }

    const event = await stripe.webhooks.constructEventAsync(
      body,
      sign,
      stripeWebhookSecret
    );

    log.info("stripe notify event received", {
      eventType: event.type,
      eventId: event.id,
      function: 'stripe-notify'
    });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;

        await handleOrderSession(session);
        break;
      }

      default:
        log.info("unhandled stripe event", {
          eventType: event.type,
          eventId: event.id,
          function: 'stripe-notify'
        });
    }

    return respOk();
  } catch (e: any) {
    log.error("stripe notify failed", e as Error, { function: 'stripe-notify' });
    return Response.json(
      { error: `handle stripe notify failed: ${e.message}` },
      { status: 500 }
    );
  }
}
