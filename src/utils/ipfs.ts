import { PinataSDK } from "pinata";
import { Logger } from "pino";
import { logger } from "../config/logger";

class IpfsService {
  private readonly pinata: PinataSDK;
  private readonly logger: Logger;

  constructor() {
    const isPinataEnabled = process.env.ENABLE_PINATA === "true";

    if (
      isPinataEnabled &&
      (!process.env.PINATA_JWT || !process.env.PINATA_GATEWAY)
    ) {
      throw new Error("[PINATA_JWT] and [PINATA_GATEWAY] is not defined.");
    }

    this.pinata = new PinataSDK({
      pinataJwt: process.env.PINATA_JWT,
      pinataGateway: process.env.PINATA_GATEWAY,
    });
    this.logger = logger.child({ origin: "ipfs-service" });
  }

  async uploadFile(file: File) {
    try {
      const response = await this.pinata.upload.public.file(file);
      return response;
    } catch (error) {
      this.logger.info(
        { error, ctx: file },
        `An error occurred while uploading file: ${file.name} to Pinata`,
      );
      throw error;
    }
  }

  async deleteFilesByCid(ids: string[]) {
    try {
      const response = await this.pinata.files.public.delete(ids);
      return response;
    } catch (error) {
      this.logger.info(
        { error, ctx: { ids } },
        "An error occurred while deleting file on Pinata",
      );
      throw error
    }
  }

  async getFileByCid(cid: string) {
    const { files } = await this.pinata.files.public.list().cid(cid);
    return files.length > 0 ? files[0] : null;
  }
}

export const ipfsService = new IpfsService();
