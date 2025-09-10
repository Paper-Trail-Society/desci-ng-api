import "dotenv/config";
import fs from "fs";
import csv from "csv-parser";
import { db } from "../utils/db";
import { categoriesTable, institutionsTable, papersTable } from "../db/schema";
import { eq } from "drizzle-orm";
import { ipfsService } from "../utils/ipfs";

type CsvObjectType = {
  author: string;
  email: string;
  abstract: string;
  note: string;
  institution: string;
  field: string;
  category: string;
  paper_name: string;
  github_url: string;
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
      Math.floor(Math.random() * characters.length)
    );
  }
  return password;
};

const indexPaper = async (row: CsvObjectType) => {
  const [category] = await db
    .select()
    .from(categoriesTable)
    .where(
      eq(categoriesTable.name, stripEscapes(row.category.trim())) // remove leading or trailing escape characters
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
  console.log({ institution });
  const fileResponse = await fetch(row.github_url);
  const fileBlob = new Blob([await fileResponse.arrayBuffer()]);

  const ipfsResponse = await ipfsService.uploadFile(
    new File([fileBlob], row.paper_name.split(" ").join("-"), {
      type: "application/pdf",
    })
  );

  console.log({ ipfsResponse });

  const paperCreationPayload = {
    title: row.paper_name.trim(),
    abstract: row.abstract,
    notes: row.note,
    categoryId: category.id,
    ipfsCid: ipfsResponse.cid,
    ipfsUrl: `https://${process.env.PINATA_GATEWAY}/ipfs/${ipfsResponse.cid}`,
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

  console.log({ signUpPayload });

  const signUpResponse = await fetch(
    `${process.env.BETTER_AUTH_URL}/auth/sign-up/email`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(signUpPayload),
    }
  );

  const user = await signUpResponse.json();

  if (signUpResponse.ok) {
    console.log({ user });

    await db
      .insert(papersTable)
      .values({ ...paperCreationPayload, userId: user.user.id as string })
      .execute();

    console.log(`📄 Inserted paper: ${row.paper_name}`);
  }
};

async function parseCsvAndInsert(filePath: string) {
  const singleAuthorResults: CsvObjectType[] = [];
  const multipleAuthorResults: CsvObjectType[] = [];

  // Wrap the stream in a Promise
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

  // Example insert logic
  for (const row of singleAuthorResults) {
    if (!row.email) continue;
    console.log({ row });
    // ensure category exists

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
  await parseCsvAndInsert("./desci-ng-fields-categories-authors.csv");
  console.log("🎉 Import complete");
  process.exit(0);
})();
