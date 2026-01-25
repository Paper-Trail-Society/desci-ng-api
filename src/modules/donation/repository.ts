import { eq } from "drizzle-orm";
import { db } from "../../config/db";
import { paystackDonationsTable } from "../../db/schema";

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
}
