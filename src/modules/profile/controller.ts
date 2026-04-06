import type { Request, Response } from "express";
import { profileParamsSchema } from "./schema";
import { ProfileService } from "./service";

export class ProfileController {
  public constructor(private readonly profileService: ProfileService) {}

  public getByUserId = async (req: Request, res: Response) => {
    const { userId } = profileParamsSchema.parse(req.params);
    req.ctx.set("payload", req.params);

    try {
      const profile = await this.profileService.getPublicProfileByUserId(userId);

      if (!profile) {
        req.log.warn({ userId }, "Profile not found");
        return res.status(404).json({
          status: "error",
          message: "Profile not found",
        });
      }

      return res.status(200).json(profile);
    } catch (error) {
      req.ctx.set("error", error);
      req.log.error({ userId, error }, "Failed to fetch profile");
      return res.status(500).json({
        status: "error",
        message: "Failed to fetch profile",
      });
    }
  };
}
