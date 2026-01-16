import "express";
import { Logger } from "pino";
import { auth } from "../utils/auth";
import { adminAuth } from "../utils/admin-auth";

declare module "express-serve-static-core" {
  interface Request {
    user?: typeof auth.$Infer.Session.user;
    admin?: typeof adminAuth.$Infer.Session.user;
    session?: Session;
    log: Logger;
    ctx: Map<string, any>;
  }
}
