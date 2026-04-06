import "dotenv/config";
import request from "supertest";
import { beforeEach, describe, it } from "vitest";
import app from "../../src/app";
import { InstitutionFactory } from "../factories/institution-factory";
import { UserFactory } from "../factories/user-factory";
import { DatabaseSeeder } from "../setup/database-seeder";

const api = request(app);

beforeEach(async () => {
  await DatabaseSeeder.reset();
});

describe("GET /profile/:userId", () => {
  it("returns public user profile fields for an existing user", async ({
    expect,
  }) => {
    const institution = await InstitutionFactory.create({
      name: "University of Lagos",
    });
    const user = await UserFactory.create({
      name: "Ada Lovelace",
      image: "https://example.com/avatar.png",
      areasOfInterest: "AI, Computational Biology",
      institutionId: institution.id,
      email: "ada@example.test",
      emailVerified: true,
    });

    const res = await api
      .get(`/profile/${user.id}`)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(res.body).toMatchObject({
      id: user.id,
      name: "Ada Lovelace",
      image: "https://example.com/avatar.png",
      areasOfInterest: "AI, Computational Biology",
      institution: {
        id: institution.id,
        name: institution.name,
      },
    });
    expect(res.body).toHaveProperty("createdAt");
    expect(res.body).not.toHaveProperty("email");
    expect(res.body).not.toHaveProperty("emailVerified");
  });

  it("returns profile with null institution when user has no institution", async ({
    expect,
  }) => {
    const user = await UserFactory.create({
      name: "No Institution User",
      institutionId: null,
    });

    const res = await api
      .get(`/profile/${user.id}`)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(res.body).toHaveProperty("id", user.id);
    expect(res.body).toHaveProperty("institution", null);
  });

  it("returns 404 when user profile does not exist", async ({ expect }) => {
    const res = await api
      .get("/profile/non-existent-user-id")
      .expect("Content-Type", /json/)
      .expect(404);

    expect(res.body).toEqual({
      status: "error",
      message: "Profile not found",
    });
  });

  it("returns 400 for invalid userId in params", async ({ expect }) => {
    const res = await api
      .get("/profile/%20")
      .expect("Content-Type", /json/)
      .expect(400);

    expect(res.body).toHaveProperty("properties");
    expect(res.body.properties).toHaveProperty("userId");
  });
});
