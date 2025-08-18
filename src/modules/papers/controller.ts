import * as z from 'zod';
import type { Request, Response } from "express";
import { uploadPaper } from './schema';

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

export class PapersController {
  // Create method
  async create(req: Request, res: Response) {
    const body = uploadPaper.parse(req.body);

    // upload file to Pinata

    // get IPFS hash

    // Create paper in DB

    // Return paper
    
    console.log({body})
    return {};
  }

  // Read method
  async read(req: Request, res: Response) {
    //no-op
  }

  // Update method
  async update(req: Request, res: Response) {
    // no-op
  }

  // Delete method
  async delete(req: Request, res: Response) {
    // no-op
  }
}
