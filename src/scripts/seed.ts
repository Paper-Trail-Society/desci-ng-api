import "dotenv/config";
import { eq } from "drizzle-orm";
import {
  categoriesTable,
  fieldsTable,
  institutionsTable,
  keywordsTable,
} from "../db/schema";
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
      "Obstetrics & Gynecology",
      "Medicine & Surgery",
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
    "Arts and Humanities": ["English Language", "Performing Arts"],
    Agriculture: [
      "Animal Production",
      "Agronomy",
      "Home Economics",
      "Food Science",
      "Aquaculture & Fisheries",
    ],
    "Pure and Applied Sciences": [
      "Pure and Applied Biology",
      "Biology",
      "Agriculture",
      "Biochemistry",
      "Microbiology",
      "Astronomy",
    ],
    "Physical Sciences": ["Industrial Chemistry", "Chemistry"],
    "Computing, Communication & Information": [
      "Computer Science",
      "Mass Communication",
      "Library & Information Science",
      "Blockchain Technology",
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

      console.log(`Categories to insert for ${field}:`, categories);

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
};

const seedInstitutions = async () => {
  console.log("Seeding institutions table...");

  const nigerianUniversities = [
    "University of Ibadan",
    "University of Nigeria, Nsukka",
    "Ahmadu Bello University",
    "University of Lagos",
    "Obafemi Awolowo University",
    "University of Benin",
    "University of Ilorin",
    "University of Jos",
    "University of Calabar",
    "University of Port Harcourt",
    "Bayero University Kano",
    "University of Maiduguri",
    "University of Abuja",
    "Federal University of Technology, Akure",
    "Federal University of Technology, Owerri",
    "Federal University of Technology, Minna",
    "Lagos State University",
    "Rivers State University",
    "Ekiti State University",
    "Osun State University",
    "Kogi State University",
    "Nasarawa State University",
    "Plateau State University",
    "Cross River State University of Technology",
    "Abia State University",
    "Enugu State University of Science and Technology",
    "Imo State University",
    "Delta State University",
    "Ambrose Alli University",
    "Niger Delta University",
    "Covenant University",
    "Babcock University",
    "Redeemer's University",
    "Bowen University",
    "Landmark University",
    "Afe Babalola University",
    "American University of Nigeria",
    "Nile University of Nigeria",
    "Pan-Atlantic University",
    "Adeleke University",
    "Bells University of Technology",
    "Caleb University",
    "Crawford University",
    "Elizade University",
    "Fountain University",
    "Igbinedion University",
    "Joseph Ayo Babalola University",
    "Lead City University",
    "Madonna University",
    "Novena University",
    "Oduduwa University",
    "Renaissance University",
    "Salem University",
    "Veritas University",
    "Wesley University",
    "Achievers University",
    "Al-Hikmah University",
    "Al-Qalam University",
    "Atiba University",
    "Augustine University",
    "Baze University",
    "Bingham University",
    "Caritas University",
    "Chrisland University",
    "Christopher University",
    "Coal City University",
    "Crescent University",
    "Edwin Clark University",
    "Evangel University",
    "Federal University Gashua",
    "Federal University Lafia",
    "Federal University Lokoja",
    "Federal University Otuoke",
    "Federal University Oye-Ekiti",
    "Federal University Wukari",
    "Federal University Birnin Kebbi",
    "Federal University Dutse",
    "Federal University Dutsin-Ma",
    "Federal University Gusau",
    "Federal University Kashere",
    "Federal University Ndufu-Alike",
    "Godfrey Okoye University",
    "Hallmark University",
    "Hezekiah University",
    "Kings University",
    "Kwararafa University",
    "McPherson University",
    "Michael Okpara University of Agriculture",
    "Mountain Top University",
    "Nigerian Defence Academy",
    "Paul University",
    "Rhema University",
    "Ritman University",
    "Samuel Adegboyega University",
    "Southwestern University",
    "Summit University",
    "Tansian University",
    "University of Mkar",
    "Wellspring University",
    "Western Delta University",
    "Admiralty University of Nigeria",
    "Arthur Jarvis University",
    "Clifford University",
    "Dominican University",
    "Federal University of Agriculture, Abeokuta",
    "Federal University of Petroleum Resources",
    "Federal University of Agriculture, Makurdi",
    "Federal University Alex Ekwueme",
    "Gregory University",
    "Greenfield University",
    "Katsina University",
    "Legacy University",
    "Micheal and Cecilia Ibru University",
    "Nigerian Army University",
    "Nigerian Maritime University",
    "Nigerian Police Academy",
    "Northwest University",
    "Precious Cornerstone University",
    "Prince Abubakar Audu University",
    "Skyline University",
    "Thomas Adewumi University",
    "Trinity University",
    "University of Africa",
    "Westland University",
  ];

  for (const university of nigerianUniversities) {
    const existingInstitution = await db
      .select()
      .from(institutionsTable)
      .where(eq(institutionsTable.name, university))
      .execute();

    if (existingInstitution[0]) {
      console.log(`Skipping existing institution: ${university}`);
      continue;
    }

    console.log(`Inserting new institution: ${university}`);
    await db
      .insert(institutionsTable)
      .values({ name: university })
      .returning()
      .execute();
  }

  console.log("Institutions table seeding complete!");
};

(async () => {
  await seedKeywords();
  await seedFieldsAndCategoriesTable();
  await seedInstitutions();

  console.log('Database seeding complete!')
  process.exit(0);
})();