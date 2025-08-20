import { eq } from "drizzle-orm";
import { categoriesTable, fieldsTable } from "../db/schema";
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

  Object.keys(fieldsToCategoriesMap).forEach(async (field) => {
    console.log(`Processing field: ${field}`);

    const [existingFieldDoc] = await db
      .select({ id: fieldsTable.id })
      .from(fieldsTable)
      .where(eq(fieldsTable.name, field))
      .execute();

    const fieldDoc =
      existingFieldDoc ||
      (
        await db
          .insert(fieldsTable)
          .values({ name: field })
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
      console.log(`Inserting ${categoriesToInsert.length} categories for field: ${field}`);
      await db
        .insert(categoriesTable)
        .values(
          categoriesToInsert.map((category) => ({
            name: category,
            fieldId: fieldDoc.id,
          }))
        )
        .returning()
        .execute();
    }
  });

  console.log("Fields and categories tables seeding complete!");
  process.exit(0);
};

const main = async () => {
  await seedFieldsAndCategoriesTable();
};

main().catch((err) => {
  console.error("❌ Unhandled error during database seeding:", err);
  process.exit(1);
});

