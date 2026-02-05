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
    const institution = await InstitutionFactory.create({
      name: "Test Institution",
    });

    const user = await UserFactory.create({
      institutionId: institution.id,
    });

    const admin = await AdminFactory.create({
      name: "Core Admin",
    });

    const field = await FieldFactory.create({
      name: "Core Field",
    });

    const category = await CategoryFactory.create({
      name: "Core Category",
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
        status: i === 0 ? "published" : "pending",
      });
      papers.push(paper);
    }

    return papers;
  }
}
