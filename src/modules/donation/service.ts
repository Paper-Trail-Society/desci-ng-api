import crypto from "node:crypto";

export const isWebhookEventFromPaystack = ({
  payload,
  paystackSecretKey,
  paystackSignature,
}: {
  payload: any;
  paystackSecretKey: string;
  paystackSignature: string;
}) => {
  const hash = crypto
    .createHmac("sha512", paystackSecretKey)
    .update(JSON.stringify(payload))
    .digest("hex");

  return hash == paystackSignature;
};
