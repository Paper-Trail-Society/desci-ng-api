import { PinataSDK } from "pinata";

class IpfsService {
  private readonly pinata: PinataSDK;

  constructor() {
    const isPinataEnabled = process.env.ENABLE_PINATA === "true";

    if (isPinataEnabled && (!process.env.PINATA_JWT || !process.env.PINATA_GATEWAY)) {
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

  async deleteFilesByCid(ids: string[]) {
    const response = await this.pinata.files.public.delete(ids);
    return response;
  }

  async getFileByCid(cid: string) {
    const { files } = await this.pinata.files.public.list().cid(cid);
    return files.length > 0 ? files[0] : null;
  }
}

export const ipfsService = new IpfsService();
