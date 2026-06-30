import "dotenv/config";
import request from "supertest";
import { beforeEach, describe, it } from "vitest";
import app from "../../src/app";
import {
  db,
  projectShowcaseSubmissionsTable,
  projectShowcaseWaitlistTable,
} from "../factories/db";
import { DatabaseSeeder } from "../setup/database-seeder";
import { AdminFactory, UserFactory } from "../factories/user-factory";

const api = request(app);

beforeEach(async () => {
  await DatabaseSeeder.reset();
});

describe("POST /project-showcase-submissions", () => {
  it("requires authentication", async ({ expect }) => {
    const { institution } = await DatabaseSeeder.seedCore();

    const res = await api
      .post("/project-showcase-submissions")
      .send({
        fullName: "Ada Lovelace",
        email: "ada@example.test",
        phoneNumber: "+2348012345678",
        institutionId: institution.id,
        department: "Computer Science",
        degreeProgram: "BSc",
        projectTitle: "Distributed Knowledge Graph for Campus Research",
        projectSummary:
          "This project explores how decentralized storage and linked research metadata can help final year students preserve and discover academic work across Nigerian universities.",
        problemStatement:
          "Many strong final year projects are difficult to discover, verify, or build on after graduation. That limits visibility, reuse, and the broader contribution of student work.",
        currentProgress:
          "The literature review and initial prototype are complete, and I have already started user interviews with students and supervisors.",
        expectedImpact:
          "The project could improve discoverability of student research and make it easier for future cohorts to build on prior work instead of starting from scratch.",
        expectedStartDate: "2026-01-15",
        expectedEndDate: "2026-09-30",
        willProvideUpdates: true,
        consentToFeature: true,
      })
      .expect(401);

    expect(res.body).toEqual({
      status: "error",
      message: "Authentication required. Please sign in to continue.",
    });
  });

  it("creates a project showcase submission", async ({ expect }) => {
    const { institution } = await DatabaseSeeder.seedCore();
    const user = await UserFactory.create({
      email: "submitter@example.test",
      institutionId: institution.id,
    });

    const payload = {
      fullName: "Ada Lovelace",
      email: "ada@example.test",
      phoneNumber: "+2348012345678",
      institutionId: institution.id,
      department: "Computer Science",
      degreeProgram: "BSc",
      projectTitle: "Distributed Knowledge Graph for Campus Research",
      projectSummary:
        "This project explores how decentralized storage and linked research metadata can help final year students preserve and discover academic work across Nigerian universities.",
      inspiration:
        "I wanted to build a system that treats student research as public knowledge infrastructure rather than forgotten shelf work.",
      problemStatement:
        "Many strong final year projects are difficult to discover, verify, or build on after graduation. That limits visibility, reuse, and the broader contribution of student work.",
      supportUse:
        "Catalytic support would help me refine the prototype, validate it with real users, and prepare a stronger public-facing showcase of the work.",
      beneficiaries:
        "Students, supervisors, researchers, and institutions that want better visibility into emerging campus research outputs.",
      currentProgress:
        "The literature review and initial prototype are complete, and I have already started user interviews with students and supervisors.",
      expectedImpact:
        "The project could improve discoverability of student research and make it easier for future cohorts to build on prior work instead of starting from scratch.",
      expectedStartDate: "2026-01-15",
      expectedEndDate: "2026-09-30",
      projectUrl: "https://example.test/project",
      repositoryUrl: "https://github.com/example/final-year-project",
      demoUrl: "https://example.test/demo",
      willProvideUpdates: true,
      consentToFeature: true,
    };

    const res = await api
      .post("/project-showcase-submissions")
      .set("Authorization", `Bearer ${user.authToken}`)
      .send(payload)
      .expect("Content-Type", /json/)
      .expect(201);

    expect(res.body).toMatchObject({
      status: "success",
      message: "Project showcase submission received",
      data: {
        fullName: payload.fullName,
        email: payload.email,
        phoneNumber: payload.phoneNumber,
        department: payload.department,
        degreeProgram: payload.degreeProgram,
        projectTitle: payload.projectTitle,
        projectSummary: payload.projectSummary,
        problemStatement: payload.problemStatement,
        currentProgress: payload.currentProgress,
        expectedImpact: payload.expectedImpact,
        projectUrl: payload.projectUrl,
        willProvideUpdates: true,
        consentToFeature: true,
        status: "pending",
        institution: {
          id: institution.id,
          name: institution.name,
        },
      },
    });

    const submissions = await db.select().from(projectShowcaseSubmissionsTable);
    expect(submissions).toHaveLength(1);
    expect(submissions[0].projectTitle).toBe(payload.projectTitle);
  });

  it("returns 400 when institution does not exist", async ({ expect }) => {
    const user = await UserFactory.create({
      email: "invalid-institution@example.test",
    });

    const res = await api
      .post("/project-showcase-submissions")
      .set("Authorization", `Bearer ${user.authToken}`)
      .send({
        fullName: "Ada Lovelace",
        email: "ada@example.test",
        phoneNumber: "+2348012345678",
        institutionId: 999999,
        department: "Computer Science",
        degreeProgram: "BSc",
        projectTitle: "Distributed Knowledge Graph for Campus Research",
        projectSummary:
          "This project explores how decentralized storage and linked research metadata can help final year students preserve and discover academic work across Nigerian universities.",
        problemStatement:
          "Many strong final year projects are difficult to discover, verify, or build on after graduation. That limits visibility, reuse, and the broader contribution of student work.",
        currentProgress:
          "The literature review and initial prototype are complete, and I have already started user interviews with students and supervisors.",
        expectedImpact:
          "The project could improve discoverability of student research and make it easier for future cohorts to build on prior work instead of starting from scratch.",
        expectedStartDate: "2026-01-15",
        expectedEndDate: "2026-09-30",
        willProvideUpdates: true,
        consentToFeature: true,
      })
      .expect(400);

    expect(res.body.error).toContain("Institution does not exist");
  });
});

describe("GET /project-showcase-submissions", () => {
  it("requires admin authentication", async ({ expect }) => {
    const res = await api.get("/project-showcase-submissions").expect(401);

    expect(res.body).toEqual({
      status: "error",
      message: "Admin authentication required. Please sign in to continue.",
    });
  });

  it("lists submissions for authenticated admins", async ({ expect }) => {
    const { institution } = await DatabaseSeeder.seedCore();
    const admin = await AdminFactory.create();
    const firstUser = await UserFactory.create({
      email: "first-submitter@example.test",
      institutionId: institution.id,
    });
    const secondUser = await UserFactory.create({
      email: "second-submitter@example.test",
      institutionId: institution.id,
    });

    await api
      .post("/project-showcase-submissions")
      .set("Authorization", `Bearer ${firstUser.authToken}`)
      .send({
        fullName: "First Student",
        email: "first@example.test",
        phoneNumber: "+2348011111111",
        institutionId: institution.id,
        department: "Computer Science",
        degreeProgram: "BSc",
        projectTitle: "Project One",
        projectSummary:
          "This project explores how decentralized storage and linked research metadata can help final year students preserve and discover academic work across Nigerian universities.",
        problemStatement:
          "Many strong final year projects are difficult to discover, verify, or build on after graduation. That limits visibility, reuse, and the broader contribution of student work.",
        currentProgress:
          "The literature review and initial prototype are complete, and I have already started user interviews with students and supervisors.",
        expectedImpact:
          "The project could improve discoverability of student research and make it easier for future cohorts to build on prior work instead of starting from scratch.",
        expectedStartDate: "2025-01-15",
        expectedEndDate: "2025-09-30",
        willProvideUpdates: true,
        consentToFeature: true,
      });

    await api
      .post("/project-showcase-submissions")
      .set("Authorization", `Bearer ${secondUser.authToken}`)
      .send({
        fullName: "Second Student",
        email: "second@example.test",
        phoneNumber: "+2348022222222",
        institutionId: institution.id,
        department: "Computer Science",
        degreeProgram: "BSc",
        projectTitle: "Project Two",
        projectSummary:
          "This second project explores how decentralized storage and linked research metadata can help final year students preserve and discover academic work across Nigerian universities.",
        problemStatement:
          "Student projects often remain invisible after assessment, making it hard for useful work to inform future research or real-world adoption.",
        currentProgress:
          "The prototype has been built and tested in a small pilot setting, with early feedback already incorporated into the next revision.",
        expectedImpact:
          "If developed further, the project could serve as a practical model for how institutions surface and extend student-led research outputs.",
        expectedStartDate: "2026-01-15",
        expectedEndDate: "2026-09-30",
        willProvideUpdates: true,
        consentToFeature: true,
      });

    const res = await api
      .get("/project-showcase-submissions")
      .set("Authorization", `Bearer ${admin.authToken}`)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(res.body.data.total).toBe(2);
    expect(res.body.data.size).toBe(20);
    expect(res.body.data.prev_page).toBeNull();
    expect(res.body.data.data).toHaveLength(2);
    expect(res.body.data.data[0].projectTitle).toBe("Project Two");
    expect(res.body.data.data[1].projectTitle).toBe("Project One");
  });
});

describe("POST /project-showcase-waitlist", () => {
  it("creates a waitlist entry", async ({ expect }) => {
    const res = await api
      .post("/project-showcase-waitlist")
      .send({ email: "notify@example.test" })
      .expect("Content-Type", /json/)
      .expect(201);

    expect(res.body).toMatchObject({
      status: "success",
      message: "You will be notified when submissions reopen",
      data: {
        email: "notify@example.test",
      },
    });

    const entries = await db.select().from(projectShowcaseWaitlistTable);
    expect(entries).toHaveLength(1);
    expect(entries[0].email).toBe("notify@example.test");
  });

  it("returns the existing waitlist entry for duplicate email", async ({ expect }) => {
    await api.post("/project-showcase-waitlist").send({
      email: "notify@example.test",
    });

    const res = await api
      .post("/project-showcase-waitlist")
      .send({ email: "notify@example.test" })
      .expect("Content-Type", /json/)
      .expect(200);

    expect(res.body).toMatchObject({
      status: "success",
      message: "You are already on the notify list",
      data: {
        email: "notify@example.test",
      },
    });

    const entries = await db.select().from(projectShowcaseWaitlistTable);
    expect(entries).toHaveLength(1);
  });
});
