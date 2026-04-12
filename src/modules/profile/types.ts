export type PublicUserProfile = {
  id: string;
  name: string;
  emailVerified: boolean;
  image: string | null;
  areasOfInterest: string[] | null;
  createdAt: Date;
  institution: {
    id: number;
    name: string;
  } | null;
};
