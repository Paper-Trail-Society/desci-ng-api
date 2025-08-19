import { categoriesTable, fieldsTable } from "db/schema";
import { v } from "pinata/dist/gateway-tools-l9hk7kz4";
import { db } from "utils/db";

const seedFieldsAndCategoriesTable = async () => {
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
    const [fieldDoc] = await db
      .insert(fieldsTable)
      .values({ name: field })
      .returning()
      .execute();

    const categories =
      fieldsToCategoriesMap[field as keyof typeof fieldsToCategoriesMap];

    await db
      .insert(categoriesTable)
      .values(
        categories.map((category) => ({ name: category, fieldId: fieldDoc.id }))
      )
      .returning()
      .execute();
  });
};

const main = () => {
  seedFieldsAndCategoriesTable();
};

main();
