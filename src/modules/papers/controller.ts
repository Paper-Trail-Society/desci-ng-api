import * as z from 'zod';
import type { Request, Response } from "express";
import { uploadPaper } from './schema';
import { ipfsService } from 'utils/ipfs';
import { db } from 'utils/db';
import { papersTable } from 'db/schema';

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}


export class PapersController {
  // Create method
  async create(req: MulterRequest, res: Response) {

    console.log(req.body)
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


    // upload file to Pinata
    const ipfsResponse = await ipfsService.uploadFile(new File([file.buffer], file.originalname, { type: file.mimetype }));

    // {
    //     ipfsResponse: {
    //       id: '0198bf52-0805-7164-bcaa-fb1323768955',
    //       name: 'Complete Computer Science Self-Learning Path with Resources.pdf',
    //       size: 9,
    //       mime_type: 'application/pdf',
    //       cid: 'bafkreihlaroxruttcbzurmbqbqa5fg3vkllcfk54n6xydm7mku2zvkmvbq',
    //       network: 'public',
    //       is_duplicate: true,
    //       number_of_files: 1,
    //       streamable: false,
    //       created_at: '2025-08-18T22:34:41.819Z',
    //       updated_at: '2025-08-18T22:34:41.819Z'
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
          field: body.field,
          abstract: body.abstract,
          category: body.category,
          keywords: body.keywords,
          notes: body.notes,
          ipfsCid: ipfsResponse.cid,
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
