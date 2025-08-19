import * as fs from 'fs';
import type { Request, Response } from "express";
import { uploadPaper } from './schema';
import { ipfsService } from 'utils/ipfs';
import { db } from 'utils/db';
import { papersTable } from 'db/schema';

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}


export class PapersController {
  async create(req: MulterRequest, res: Response) {
    const body = uploadPaper.parse(req.body);


    if (!req.file) {
        return res.status(400).json({
          status: "error",
          message: "No PDF file uploaded",
        });
      }

    const file = req.file;

    console.log("File details:", {
        filename: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        path: file.path,
      });


    const fileBlob = new Blob([fs.readFileSync(req.file.path)]);

    const ipfsResponse = await ipfsService.uploadFile(
      new File([fileBlob], file.originalname, { type: file.mimetype }),
    );

    // {
    //     ipfsResponse: {
    //       id: '0198c2b9-41cc-7743-aa32-63e44fb60ddc',
    //       name: 'Complete Computer Science Self-Learning Path with Resources.pdf',
    //       size: 370188,
    //       mime_type: 'application/pdf',
    //       cid: 'bafybeidezwnftflonhxsffi7so4nzqtgdmovrm2v7wzxm4kql7scumjiai',
    //       network: 'public',
    //       number_of_files: 1,
    //       streamable: false,
    //       created_at: '2025-08-19T14:26:19.273Z',
    //       updated_at: '2025-08-19T14:26:19.273Z'
    //     }
    //   }

    console.log({ipfsResponse})
    const userId = 1; // should be the currently authenticated user

    // get IPFS hash

    // Create paper in DB
    const [newPaper] = await db
        .insert(papersTable)
        .values({
          title: body.title,
          fieldId: body.fieldId,
          abstract: body.abstract,
          categoryId: body.categoryId,
          keywords: body.keywords,
          notes: body.notes,
          ipfsCid: ipfsResponse.cid,
          ipfsUrl: `${process.env.PINATA_GATEWAY}/ipfs/${ipfsResponse.cid}`,
          userId, 
        })
        .returning();
    
    return res.status(201).json(newPaper);
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
