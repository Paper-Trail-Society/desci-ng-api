import { Request } from "express";
import { adminAuth } from "../utils/admin-auth";
import { auth } from "../utils/auth";
import { Session } from "better-auth/*";

export interface AuthenticatedRequest extends Request {
  user?: typeof auth.$Infer.Session.user;
  admin?: typeof adminAuth.$Infer.Session.user;
  session?: Session;
}

export interface MulterRequest extends AuthenticatedRequest {
  file?: Express.Multer.File;
}
