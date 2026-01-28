import { eq } from "drizzle-orm";
import { db } from "../../config/db";
import { paystackDonationsTable, usersTable } from "../../db/schema";
import { PaystackEventSchema } from "./schema";

export class DonationRepository {
  public doesPaystackDonationWithPaymentRefExist = async (
    paymentRef: string,
  ) => {
    // convert this to a select exists query
    const donation = await db
      .select({ id: paystackDonationsTable.id })
      .from(paystackDonationsTable)
      .where(eq(paystackDonationsTable.paymentReference, paymentRef))
      .execute();

    return donation.length > 0;
  };

  public createPaystackDonation = async (
    payload: PaystackEventSchema["data"],
  ) => {
    const donationId = await db.transaction(async (tx) => {
      const existingUser = await tx
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.email, payload.customer.email.trim()));
      const paymentInfo = payload;

      const [{ id: donationId }] = await tx
        .insert(paystackDonationsTable)
        .values({
          donorId: existingUser.length > 0 ? existingUser[0].id : null,
          donorEmail: paymentInfo.customer.email,
          amount: paymentInfo.amount,
          paidAt: new Date(paymentInfo.paid_at),
          donorName:
            `${paymentInfo.customer.first_name ?? ""} ${paymentInfo.customer.last_name ?? ""}`.trim(),
          currencyCode: paymentInfo.currency,
          paymentStatus: paymentInfo.status,
          paymentMethod: paymentInfo.channel,
          paymentReference: paymentInfo.reference,
          transactionData: paymentInfo,
        })
        .returning({ id: paystackDonationsTable.id });

      return donationId;
    });

    return { id: donationId };
  };
}
