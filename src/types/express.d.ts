import "express";
import { Logger } from "pino";

declare module "express-serve-static-core" {
  interface Request {
    log: Logger;
    ctx: Map<string, any>;
  }
}
