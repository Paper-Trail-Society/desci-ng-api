import { Request, Response } from "express";
import crypto from "node:crypto";
import { DonationRepository } from "./repository";
import { paystackEventSchema } from "./schema";
import { db } from "../../config/db";
import { paystackDonationsTable, usersTable } from "../../db/schema";
import { eq } from "drizzle-orm";

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
    // only handle 'charge.success' events
    // verify that the event is from paystack using the paystack signature || whitelist only paystack IPs for this endpoint
    const hash = crypto
      .createHmac("sha512", this.paystackSecretKey)
      .update(JSON.stringify(req.body))
      .digest("hex");
    if (hash != req.headers["x-paystack-signature"]) {
      // discard request
      req.log.warn(
        "Webhook event doesn't originate from Paystack. Ignoring...",
      );
      return res.status(400).json({ message: "Invalid request" });
    }

    const payload = paystackEventSchema.parse(req.body);

    // confirm that a payment with the paystack reference from the payload doesn't exist in the DB before
    const donationHasExistingRecord =
      await this.donationRepository.doesPaystackDonationWithPaymentRefExist(
        payload.data.reference,
      );

    if (donationHasExistingRecord) {
      return res.status(200).json({ message: "ack" });
    }

    // creating the payment record
    const paystackDonation = await db.transaction(async (tx) => {
      const existingUser = await tx
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.email, payload.data.customer.email.trim()));
      const paymentInfo = payload.data;

      // tx.insert(paystackDonationsTable).values({
      //   donorId: existingUser.length > 0 ? existingUser[0].id : null,
      //   donorEmail: paymentInfo.customer.email,
      // });
    });
    //
    // check if a user with email of the donor exists in the `users` table. If it exists, user the user ID as the donor ID

    req.ctx.set("payload", req.body);

    return res.status(200).json({ message: "ack" });
  };
}
