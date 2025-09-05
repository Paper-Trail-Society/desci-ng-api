declare module "zeptomail" {
  export interface EmailAddress {
    address: string;
    name?: string;
  }

  export interface Recipient {
    email_address: EmailAddress;
    name?: string;
  }

  export interface Attachment {
    mime_type: string;
    name: string;
    content: string;
  }

  export interface SendMailOptions {
    from: EmailAddress;
    to: Recipient[];
    cc?: Recipient[];
    bcc?: Recipient[];
    reply_to?: EmailAddress[];
    subject: string;
    htmlbody?: string;
    textbody?: string;
    attachments?: Attachment[];
    headers?: Record<string, string>;
  }

  export interface SendMailClientConfig {
    url: string;
    token: string;
  }

  export class SendMailClient {
    constructor(config: SendMailClientConfig);
    sendMail(options: SendMailOptions): Promise<any>;
    sendMailWithTemplate(options: any): Promise<any>;
  }

  export default SendMailClient;
}
