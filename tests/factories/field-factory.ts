import {
  db,
  fieldsTable,
  categoriesTable,
  FieldInsert,
  Field,
  CategoryInsert,
  Category,
} from "./db";

export class FieldFactory {
  private static fieldCounter = 1;

  static async create(overrides: Partial<FieldInsert> = {}): Promise<Field> {
    const n = this.fieldCounter++;

    const [field] = await db
      .insert(fieldsTable)
      .values({
        name: overrides.name ?? `Field ${n}`,
        ...overrides,
      })
      .returning();

    return field;
  }
}

export class CategoryFactory {
  private static categoryCounter = 1;

  static async create(
    overrides: Partial<CategoryInsert> = {},
  ): Promise<Category> {
    const n = this.categoryCounter++;

    const field =
      overrides.fieldId != null ? null : await FieldFactory.create();

    const [category] = await db
      .insert(categoriesTable)
      .values({
        name: overrides.name ?? `Category ${n}`,
        fieldId: overrides.fieldId ?? field!.id,
        ...overrides,
      })
      .returning();

    return category;
  }
}

