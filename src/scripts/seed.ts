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
        `Inserting ${categoriesToInsert.length} categories for field: ${field}`
      );
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
  }

  console.log("Fields and categories tables seeding complete!");
  process.exit(0);
};

const seedKeywords = async () => {
  console.log("Seeding keywords table...");

  const keywords = [
    {
      name: "Artificial Intelligence",
      aliases: ["AI", "Machine Learning", "ML"],
    },
    {
      name: "Data Science",
      aliases: ["Data Analysis", "Data Analytics"],
    },
    {
      name: "Web Development",
      aliases: ["Web Dev", "Full Stack Development"],
    },
    {
      name: "Cyber Security",
      aliases: ["InfoSec", "Security"],
    },
    {
      name: "DevOps",
      aliases: ["Development Operations", "Continuous Integration"],
    },
    {
      name: "Cloud Architecture",
      aliases: ["Cloud Design", "Cloud Infrastructure"],
    },
    {
      name: "Frontend Development",
      aliases: ["Client-side Development", "UI Development"],
    },
    {
      name: "Backend Development",
      aliases: ["Server-side Development", "API Development"],
    },
    {
      name: "Database Administration",
      aliases: ["DBA", "Database Management"],
    },
    {
      name: "Network Administration",
      aliases: ["Network Management", "Networking"],
    },
    {
      name: "Software Engineering",
      aliases: ["Software Development", "SE"],
    },
    {
      name: "Quality Assurance",
      aliases: ["QA", "Testing"],
    },
    {
      name: "Agile Development",
      aliases: ["Agile Methodologies", "Scrum"],
    },
    {
      name: "User Experience",
      aliases: ["UX", "User Interface Design"],
    },
    {
      name: "Data Engineering",
      aliases: ["Data Architecture", "Data Warehousing"],
    },
    {
      name: "Business Intelligence",
      aliases: ["BI", "Data Visualization"],
    },
    {
      name: "Machine Learning Engineering",
      aliases: ["MLE", "Deep Learning Engineering"],
    },
    {
      name: "Natural Language Processing",
      aliases: ["NLP", "Text Analysis"],
    },
    {
      name: "Computer Vision",
      aliases: ["CV", "Image Processing"],
    },
    {
      name: "Robotics",
      aliases: ["Robotics Engineering", "Autonomous Systems"],
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
};

seedKeywords().catch((err) => {
  console.error("❌ Unhandled error during database seeding keywords:", err);
  process.exit(1);
});

seedFieldsAndCategoriesTable().catch((err) => {
  console.error("❌ Unhandled error during database seeding keywords:", err);
  process.exit(1);
});
