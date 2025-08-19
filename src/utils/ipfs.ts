import { PinataSDK } from "pinata";

class IpfsService {
    private readonly pinata: PinataSDK;

    constructor() {
        this.pinata = new PinataSDK({
            pinataJwt: process.env.PINATA_JWT!,
            pinataGateway: process.env.PINATA_GATEWAY!,
        });
    }

    async uploadFile(file: File) {
        const response = await this.pinata.upload.public.file(file);
        return response;
    }
    
}

export const ipfsService = new IpfsService();