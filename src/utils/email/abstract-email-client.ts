import { SendMailOptions } from "./types";

/**
 * Abstract class representing a mail client.
 * All mail client adapters must extend this class and implement the sendMail method.
 */
export abstract class AbstractMailClient {
  abstract sendMail(options: SendMailOptions): Promise<any>;
}