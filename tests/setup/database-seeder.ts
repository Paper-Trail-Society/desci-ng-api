import "dotenv/config"
import { sql } from "drizzle-orm";
import { db } from "../../src/config/db";
import { InstitutionFactory } from "../factories/institution-factory";
import { UserFactory, AdminFactory } from "../factories/user-factory";
import { FieldFactory, CategoryFactory } from "../factories/field-factory";
import { PaperFactory } from "../factories/paper-factory";

export class DatabaseSeeder {
  static async reset() {
    await db.execute(sql`
      TRUNCATE TABLE
        desci.paper_comments,
        desci.paper_keywords,
        desci.papers,
        desci.keywords,
        desci.categories,
        desci.fields,
        desci.users,
        desci.admins,
        desci.institutions
      RESTART IDENTITY CASCADE;
    `);
  }

  static async seedCore() {
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const institution = await InstitutionFactory.create({
      name: `Test Institution ${randomSuffix}`,
    });

    const user = await UserFactory.create({
      email: `testuser${randomSuffix}@example.com`,
      institutionId: institution.id,
      areasOfInterest: `Area of Interest ${randomSuffix}, AI, Machine Learning`,
    });

    const admin = await AdminFactory.create({
      email: `testadmin${randomSuffix}@example.com`,
      name: `Core Admin ${randomSuffix}`,
    });

    const field = await FieldFactory.create({
      name: `Core Field ${randomSuffix}`,
    });

    const category = await CategoryFactory.create({
      name: `Core Category ${randomSuffix}`,
      fieldId: field.id,
    });

    return { institution, user, admin, field, category };
  }

  static async seedSamplePapers(count = 3) {
    const { user, category } = await this.seedCore();

    const papers = [];

    for (let i = 0; i < count; i++) {
      const paper = await PaperFactory.create({
        userId: user.id,
        categoryId: category.id,
        status: "published",
      });
      papers.push(paper);
    }

    return papers;
  }
}

// DatabaseSeeder.seedSamplePapers(20).then(() => {
//   console.log("Database seeding completed.");
//   process.exit(0);
// }).catch((error) => {
//   console.error("Error during database seeding:", error);
//   process.exit(1);
// });