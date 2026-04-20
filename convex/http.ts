import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

/**
 * Verify a Svix webhook signature using the Web Crypto API.
 * Svix signs: `${svix-id}.${svix-timestamp}.${body}` with HMAC-SHA256.
 * The secret is base64-encoded after stripping the "whsec_" prefix.
 */
async function verifySvixSignature(
  body: string,
  svixId: string,
  svixTimestamp: string,
  svixSignature: string,
  secret: string
): Promise<boolean> {
  const base64Secret = secret.replace(/^whsec_/, "");
  const secretBytes = Uint8Array.from(atob(base64Secret), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signedContent = `${svixId}.${svixTimestamp}.${body}`;
  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signedContent)
  );

  const computedSig = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));

  // svix-signature can contain multiple sigs: "v1,<base64> v1,<base64>"
  return svixSignature
    .split(" ")
    .some((part) => part.replace(/^v1,/, "") === computedSig);
}

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("clerk-webhook: CLERK_WEBHOOK_SECRET not set");
      return new Response("Webhook secret not configured", { status: 500 });
    }

    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      return new Response("Missing svix headers", { status: 400 });
    }

    const body = await request.text();

    const valid = await verifySvixSignature(
      body,
      svixId,
      svixTimestamp,
      svixSignature,
      webhookSecret
    );

    if (!valid) {
      console.error("clerk-webhook: signature verification failed");
      return new Response("Invalid signature", { status: 400 });
    }

    let event: { type: string; data: Record<string, unknown> };
    try {
      event = JSON.parse(body);
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    if (event.type === "user.created") {
      const data = event.data as {
        id: string;
        first_name?: string | null;
        last_name?: string | null;
        username?: string | null;
        unsafe_metadata?: { dateOfBirth?: string };
      };

      const displayName =
        [data.first_name, data.last_name].filter(Boolean).join(" ") ||
        data.username ||
        "StyleMe User";

      const meta = data.unsafe_metadata ?? {};
      const dateOfBirth = meta.dateOfBirth ?? "2000-01-01";

      try {
        await ctx.runMutation(api.users.createUser, {
          clerkId: data.id,
          displayName,
          dateOfBirth,
        });
      } catch (err) {
        console.error("clerk-webhook: createUser failed", data.id, err);
        return new Response("Failed to create user", { status: 500 });
      }
    }

    return new Response(null, { status: 200 });
  }),
});

export default http;
