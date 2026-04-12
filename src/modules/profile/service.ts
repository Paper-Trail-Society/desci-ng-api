import { eq } from "drizzle-orm";
import { db } from "../../config/db";
import { institutionsTable, usersTable } from "../../db/schema";
import type { PublicUserProfile } from "./types";

type RawPublicProfileQueryResult = {
  id: string;
  name: string;
  emailVerified: boolean;
  image: string | null;
  areasOfInterest: string[] | null;
  createdAt: Date;
  institutionId: number | null;
  institutionName: string | null;
};

export class ProfileService {
  public async getPublicProfileByUserId(
    userId: string,
  ): Promise<PublicUserProfile | null> {
    const [result] = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        image: usersTable.image,
        areasOfInterest: usersTable.areasOfInterest,
        emailVerified: usersTable.emailVerified,
        createdAt: usersTable.createdAt,
        institutionId: institutionsTable.id,
        institutionName: institutionsTable.name,
      })
      .from(usersTable)
      .leftJoin(
        institutionsTable,
        eq(usersTable.institutionId, institutionsTable.id),
      )
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!result) {
      return null;
    }

    const areasOfInterest = result.areasOfInterest as string[] | null;

    const profileData = {
      ...result,
      areasOfInterest
    };

    return this.formatPublicProfile(profileData);
  }

  private formatPublicProfile(
    profile: RawPublicProfileQueryResult,
  ): PublicUserProfile {
    return {
      id: profile.id,
      name: profile.name,
      image: profile.image,
      areasOfInterest: profile.areasOfInterest,
      emailVerified: profile.emailVerified,
      createdAt: profile.createdAt,
      institution:
        profile.institutionId && profile.institutionName
          ? { id: profile.institutionId, name: profile.institutionName }
          : null,
    };
  }
}
