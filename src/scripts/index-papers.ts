import "dotenv/config";
import fs from "fs";
import csv from "csv-parser";
import { db } from "../utils/db";
import {
  categoriesTable,
  institutionsTable,
  papersTable,
  usersTable,
} from "../db/schema";
import { eq } from "drizzle-orm";
import { ipfsService } from "../utils/ipfs";
import slug from "slug";

type CsvObjectType = {
  author: string;
  email: string;
  abstract: string;
  note: string;
  institution: string;
  field: string;
  category: string;
  paper_name: string;
  file_url: string | null;
  pinata_url: string | null;
  cid: string | null;
};

/**
 * Strip leading/trailing escape characters (\n, \t, \r) from a string.
 */
function stripEscapes(input: string): string {
  return input.replace(/^[\n\r\t]+|[\n\r\t]+$/g, "");
}

const generateRandomPassword = () => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let password = "";
  for (let i = 0; i < 9; i++) {
    password += characters.charAt(
      Math.floor(Math.random() * characters.length),
    );
  }
  return password;
};

const emailToPasswordMap: Record<string, any> = {};

const indexPaper = async (row: CsvObjectType) => {
  const [category] = await db
    .select()
    .from(categoriesTable)
    .where(
      eq(categoriesTable.name, stripEscapes(row.category.trim())), // remove leading or trailing escape characters
    );

  console.log({ category, categoryName: stripEscapes(row.category.trim()) });

  // ensure institution exists
  let [institution] = await db
    .select()
    .from(institutionsTable)
    .where(eq(institutionsTable.name, stripEscapes(row.institution.trim())));

  if (!institution) {
    [institution] = await db
      .insert(institutionsTable)
      .values({ name: stripEscapes(row.institution.trim()) })
      .returning();
  }
  let cid: string | null = null;
  console.log({ institution });
  if (!row.pinata_url && !row.cid && row.file_url) {
    const fileResponse = await fetch(row.file_url);
    const fileBlob = new Blob([await fileResponse.arrayBuffer()]);

    const ipfsResponse = await ipfsService.uploadFile(
      new File([fileBlob], row.paper_name.split(" ").join("-"), {
        type: "application/pdf",
      }),
    );

    cid = ipfsResponse.cid;
  } else if (row.cid) {
    cid = row.cid;
  }

  if (!cid) {
    console.log("No CID for paper PDF");
    return;
  }

  const paperCreationPayload = {
    title: row.paper_name.trim(),
    slug: slug(row.paper_name.trim().substring(0, 100)),
    abstract: row.abstract,
    notes: row.note,
    categoryId: category.id,
    ipfsCid: cid,
    ipfsUrl: `https://${process.env.PINATA_GATEWAY}/ipfs/${cid}`,
    institutionId: institution.id,
  };

  console.log({ paperCreationPayload });

  const signUpPayload = {
    name: row.author.trim(),
    email: row.email.trim(),
    institutionId: institution.id,
    areasOfInterest: [],
    password: generateRandomPassword(),
  };

  const [existingUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, signUpPayload.email.trim()))
    .execute();
  let user;

  if (!existingUser) {
    console.log({ signUpPayload });

    const signUpResponse = await fetch(
      `${process.env.BETTER_AUTH_URL}/auth/sign-up/email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(signUpPayload),
      },
    );

    console.log({ signUpResponse });

    const res = await signUpResponse.json();
    console.log({ res });

    if (signUpResponse.ok) {
      user = res.user;
      if (!emailToPasswordMap[signUpPayload.email]) {
        emailToPasswordMap[signUpPayload.email] = user;
      }
    } else {
      user = emailToPasswordMap[signUpPayload.email];
    }
  } else {
    user = existingUser;
  }

  console.log({ user });
  await db
    .insert(papersTable)
    .values({ ...paperCreationPayload, userId: user.id as string })
    .execute();

  console.log(`📄 Inserted paper: ${row.paper_name}`);
};

async function parseCsvAndInsert(filePath: string) {
  const singleAuthorResults: CsvObjectType[] = [];
  const multipleAuthorResults: CsvObjectType[] = [];

  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row: CsvObjectType) => {
        if (row.author.split(",").length > 1) {
          multipleAuthorResults.push(row);
        } else {
          singleAuthorResults.push(row);
        }
      })
      .on("end", () => resolve())
      .on("error", reject);
  });

  console.log("✅ CSV parsed");
  console.log("Single authors:", singleAuthorResults.length);
  console.log("Multiple authors:", multipleAuthorResults.length);

  for (const row of singleAuthorResults) {
    if (!row.email) continue;
    console.log({ row });
    await indexPaper(row);
  }

  for (const row of multipleAuthorResults) {
    if (!row.email) continue;
    console.log({ row });

    // remove leading and trailing asterisks from the author name
    const authorName = row.author
      .split(",")[0]
      .replace(/^\*|\*$/g, "")
      .trim();
    row.author = authorName;

    await indexPaper(row);
  }
}

(async () => {
  await parseCsvAndInsert("./desci-ng-papers.csv");
  console.log("🎉 Import complete");
  process.exit(0);
})();
