import { PinataSDK } from "pinata";

class IpfsService {
  private readonly pinata: PinataSDK;

  constructor() {
    if (!process.env.PINATA_JWT || !process.env.PINATA_GATEWAY) {
      throw new Error("[PINATA_JWT] and [PINATA_GATEWAY] is not defined.");
    }
    this.pinata = new PinataSDK({
      pinataJwt: process.env.PINATA_JWT,
      pinataGateway: process.env.PINATA_GATEWAY,
    });
  }

  async uploadFile(file: File) {
    const response = await this.pinata.upload.public.file(file);
    return response;
  }

  async deleteFilesByCid(cids: string[]) {
    const response = await this.pinata.files.public.delete(cids);
    return response;
  }
}

export const ipfsService = new IpfsService();
