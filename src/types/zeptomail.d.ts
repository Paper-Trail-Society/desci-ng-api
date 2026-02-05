declare module "zeptomail" {
  interface SendMailOptions {
    from: EmailAddress;
    to: Recipient[];
    cc?: Recipient[];
    bcc?: Recipient[];
    reply_to?: EmailAddress[];
    subject: string;
    htmlbody?: string;
    textbody?: string;
    attachments?: Attachment[];
  }

  export interface SendClientConfig {
    url: string;
    token: string;
  }

  export class SendMailClient {
    constructor(config: SendMailClientConfig);
    sendMail(options: SendMailOptions): Promise<any>;
  }

  export default SendMailClient;
}
