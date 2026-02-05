export type MailAddress = {
  address: string;
  name?: string;
};

export interface Attachment {
  mime_type: string;
  name: string;
  content: string;
}

export type Recipient = MailAddress;

export type SendMailOptions = {
  /**
   * List of primary recipients for the email.
   */
  to: Recipient[];

  /**
   * Subject line of the email.
   */
  subject: string;

  /**
   * HTML content of the email body.
   */
  html: string;

  /**
   * from - Sender's email address.
   */
  from: MailAddress;

  /**
   * reply_to - (Optional) List of addresses to use for reply-to.
   */
  replyTo?: MailAddress[];

  /**
   * (Optional) List of recipients to be copied (CC) on the email.
   */
  cc?: Recipient[];

  /**
   * (Optional) List of recipients to be blind copied (BCC) on the email.
   */
  bcc?: Recipient[];

  /**
   * attachments - List of files to attach to the email.
   */
  attachments?: Attachment[];
};
