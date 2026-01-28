import { Request, Response } from "express";
import crypto from "node:crypto";
import { DonationRepository } from "./repository";
import { paystackEventSchema } from "./schema";
import { db } from "../../config/db";
import { paystackDonationsTable, usersTable } from "../../db/schema";
import { eq } from "drizzle-orm";
import { isWebhookEventFromPaystack } from "./service";
import ApiError from "../../utils/api-error";

export class DonationController {
  private paystackSecretKey: string;
  private donationRepository: DonationRepository;

  public constructor(donationRepository: DonationRepository) {
    if (!process.env.PAYSTACK_SECRET_KEY) {
      throw new Error(
        "Environment variable [PAYSTACK_SECRET_KEY] is undefined",
      );
    }
    this.paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    this.donationRepository = donationRepository;
  }

  public handlePaystackWebhook = async (req: Request, res: Response) => {
    const payload = paystackEventSchema.parse(req.body);
    req.ctx.set("payload", payload);

    if (
      !isWebhookEventFromPaystack({
        payload: req.body,
        paystackSecretKey: this.paystackSecretKey,
        paystackSignature: req.headers["x-paystack-signature"] as string,
      })
    ) {
      // discard request
      req.log.warn(
        "Webhook event doesn't originate from Paystack. Ignoring...",
      );
      return res.status(400).json({ message: "Invalid request" });
    }

    const donationHasExistingRecord =
      await this.donationRepository.doesPaystackDonationWithPaymentRefExist(
        payload.data.reference,
      );

    if (donationHasExistingRecord) {
      req.log.warn(
        `Donation with payment reference: ${payload.data.reference} has an existing record in the DB.`,
      );
      return res.status(200).json({ message: "ack" });
    }

    try {
      await this.donationRepository.createPaystackDonation(payload.data);
    } catch (error) {
      req.log.error(
        error,
        "An error occurred while creating paystack donation",
      );

      throw new ApiError(
        "An error occurred while creating paystack donation",
        500,
        (error as Error).stack,
      );
    }
    return res.status(200).json({ message: "ack" });
  };
}
