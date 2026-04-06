import { eq } from "drizzle-orm";
import { db } from "../../config/db";
import { institutionsTable, usersTable } from "../../db/schema";
import type { PublicUserProfile } from "./types";

type RawPublicProfileQueryResult = {
  id: string;
  name: string;
  image: string | null;
  areasOfInterest: string | null;
  createdAt: Date;
  institutionId: number | null;
  institutionName: string | null;
};

export class ProfileService {
  public async getPublicProfileByUserId(
    userId: string,
  ): Promise<PublicUserProfile | null> {
    const [profile] = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        image: usersTable.image,
        areasOfInterest: usersTable.areasOfInterest,
        createdAt: usersTable.createdAt,
        institutionId: institutionsTable.id,
        institutionName: institutionsTable.name,
      })
      .from(usersTable)
      .leftJoin(institutionsTable, eq(usersTable.institutionId, institutionsTable.id))
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!profile) {
      return null;
    }

    return this.formatPublicProfile(profile);
  }

  private formatPublicProfile(profile: RawPublicProfileQueryResult): PublicUserProfile {
    return {
      id: profile.id,
      name: profile.name,
      image: profile.image,
      areasOfInterest: profile.areasOfInterest,
      createdAt: profile.createdAt,
      institution:
        profile.institutionId && profile.institutionName
          ? { id: profile.institutionId, name: profile.institutionName }
          : null,
    };
  }
}
