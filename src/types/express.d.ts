import type { Logger } from "pino";

import type { adminAuth } from "../utils/admin-auth";
import type { auth } from "../utils/auth";

declare global {
  namespace Express {
    interface Request {
      user?: typeof auth.$Infer.Session.user;
      admin?: typeof adminAuth.$Infer.Session.user;
      session?:
        | typeof auth.$Infer.Session.session
        | typeof adminAuth.$Infer.Session.session;
      log: Logger;
      ctx: Map<string, any>;
    }
  }
}

export {};
