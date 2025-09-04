import { eq } from "drizzle-orm";
import { categoriesTable, fieldsTable, keywordsTable } from "../db/schema";
import { db } from "../utils/db";

const seedFieldsAndCategoriesTable = async () => {
  console.log("Seeding fields and categories tables...");

  const fieldsToCategoriesMap = {
    "Social Sciences": [
      "Political Science",
      "Psychology",
      "Sociology",
      "Economics",
    ],
    "Basic Medical Sciences": ["Anatomy", "Physiology", "Medical Biochemistry"],
    "Basic Clinical Sciences": [
      "Clinical Pathology & Immunology",
      "Physiotherapy",
      "Medical Laboratory Science",
      "Medical Radiography",
      "Pathology",
    ],
    "Clinical Sciences": [
      "Medicine",
      "Surgery",
      "Radiology",
      "Behavioural Science",
      "Nursing Science",
      "Dentistry",
    ],
    Education: [
      "Adult and Non-formal Education",
      "Early Childhood and Primary Education",
      "Science Education",
    ],
    "Management Sciences": ["Accounting"],
    Arts: ["English", "Performing Arts"],
    Agriculture: [
      "Animal Production",
      "Agronomy",
      "Home Economics & Food Science",
      "Aquaculture & Fisheries",
    ],
    "Pure and Applied Sciences": [
      "Pure and Applied Biology",
      "Biochemistry",
      "Microbiology",
    ],
    "Physical Sciences": ["Industrial Chemistry", "Chemistry"],
    "Computing, Communication & Information": [
      "Computer Science",
      "Mass Communication",
      "Library & Information Science",
    ],
    Law: [
      "Business Law",
      "Public Law",
      "Islamic Law",
      "Private and Property Law",
    ],
  };

  for (const field of Object.keys(fieldsToCategoriesMap)) {
    console.log(`Processing field: ${field}`);

    const [existingFieldDoc] = await db
      .select()
      .from(fieldsTable)
      .where(eq(fieldsTable.name, field))
      .execute();

    const fieldDoc =
      existingFieldDoc ||
      (
        await db
          .insert(fieldsTable)
          .values({
            name: field,
            title: field,
            abstract: `Research field focused on ${field}`,
            content: `This field encompasses research and studies related to ${field}`,
          })
          .returning()
          .execute()
      )[0];

    const categories =
      fieldsToCategoriesMap[field as keyof typeof fieldsToCategoriesMap];

    const existingCategories = await db
      .select({ name: categoriesTable.name })
      .from(categoriesTable)
      .where(eq(categoriesTable.fieldId, fieldDoc.id))
      .execute();

    const categoriesToInsert: string[] = [];
    const categoryNames = existingCategories.map((cat) => cat.name);
    for (const category of categories) {
      if (!categoryNames.includes(category)) {
        categoriesToInsert.push(category);
      }
    }

    if (categoriesToInsert.length > 0) {
      console.log(
        `Inserting ${categoriesToInsert.length} categories for field: ${field}`,
      );
      await db
        .insert(categoriesTable)
        .values(
          categoriesToInsert.map((category) => ({
            name: category,
            fieldId: fieldDoc.id,
          })),
        )
        .returning()
        .execute();
    }
  }

  console.log("Fields and categories tables seeding complete!");
  process.exit(0);
};

const seedKeywords = async () => {
  console.log("Seeding keywords table...");

  const keywords = [
    {
      name: "Machine Learning",
      aliases: ["ML", "Deep Learning", "Artificial Intelligence"],
    },
    {
      name: "React",
      aliases: ["ReactJS", "React Native"],
    },
    {
      name: "TypeScript",
      aliases: ["TS"],
    },
    {
      name: "JavaScript",
      aliases: ["JS"],
    },
    {
      name: "Python",
      aliases: ["Py"],
    },
    {
      name: "SQL",
      aliases: ["Structured Query Language"],
    },
    {
      name: "Databases",
      aliases: ["Database Management Systems", "DBMS"],
    },
    {
      name: "Cloud Computing",
      aliases: ["Cloud"],
    },
    {
      name: "Containerization",
      aliases: ["Containers"],
    },
    {
      name: "Serverless",
      aliases: ["FaaS", "Function as a Service"],
    },
  ];

  for (const keyword of keywords) {
    const existingKeyword = await db
      .select()
      .from(keywordsTable)
      .where(eq(keywordsTable.name, keyword.name))
      .execute();

    if (existingKeyword[0]) {
      console.log(`Skipping existing keyword: ${keyword.name}`);
      continue;
    }

    console.log(`Inserting new keyword: ${keyword.name}`);
    await db
      .insert(keywordsTable)
      .values({ name: keyword.name, aliases: keyword.aliases })
      .returning()
      .execute();
  }

  console.log("Keywords table seeding complete!");
  process.exit(0);
}


seedKeywords().catch((err) => {
  console.error("❌ Unhandled error during database seeding keywords:", err);
  process.exit(1);
});


seedFieldsAndCategoriesTable().catch((err) => {
  console.error("❌ Unhandled error during database seeding keywords:", err);
  process.exit(1);
});
