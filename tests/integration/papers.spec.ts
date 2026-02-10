import "dotenv/config";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import app from "../../src/app";
import { DatabaseSeeder } from "../setup/database-seeder";
import { PaperFactory } from "../factories/paper-factory";
import { UserFactory } from "../factories/user-factory";
import { CategoryFactory } from "../factories/field-factory";

const TEST_CID = "mock-cid";
const TEST_PDF_BUFFER = Buffer.from("%PDF-1.4 Test PDF content");

vi.mock("../../src/utils/ipfs", () => ({
  ipfsService: {
    uploadFile: vi.fn().mockResolvedValue({ cid: "mock-cid" }),
    deleteFilesByCid: vi.fn().mockResolvedValue({}),
    getFileByCid: vi.fn().mockResolvedValue({ id: "mock-ipfs-id" }),
  },
}));

const api = request(app);

beforeEach(async () => {
  vi.clearAllMocks();
  await DatabaseSeeder.reset();
});

describe("GET /papers", () => {
  it("returns paginated response for anonymous request", async ({ expect }) => {
    const res = await api
      .get("/papers")
      .expect("Content-Type", /json/)
      .expect(200);

    expect(res.body).toHaveProperty("data");
    expect(res.body).toHaveProperty("total");
    expect(res.body).toHaveProperty("size");
    expect(res.body).toHaveProperty("prev_page");
    expect(res.body).toHaveProperty("next_page");
  });

  it("only returns published papers for anonymous users", async ({
    expect,
  }) => {
    await PaperFactory.create({ status: "pending" });
    const publishedPaper = await PaperFactory.create({ status: "published" });

    // create another pending paper to confirm that only the published paper is returned
    await PaperFactory.create({ status: "pending" });

    const res = await api
      .get("/papers")
      .expect("Content-Type", /json/)
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0]).toHaveProperty("status", "published");
    expect(res.body.data[0]).toHaveProperty("id", publishedPaper.id);
  });

  it("allows searching papers by title or abstract", async ({ expect }) => {
    const paper1 = await PaperFactory.create({
      title: "Deep Learning for Natural Language Processing",
      abstract: "This paper explores deep learning techniques for NLP tasks.",
      status: "published",
    });
    const paper2 = await PaperFactory.create({
      title: "Advances in Computer Vision",
      abstract: "A comprehensive review of recent advances in computer vision.",
      status: "published",
    });

    const res = await api
      .get("/papers")
      .query({ search: "deep learning" })
      .expect("Content-Type", /json/)
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0]).toHaveProperty("id", paper1.id);
  });


  it("allows authenticated users to see their own pending papers", async ({
    expect,
  }) => {
    const testUser = await UserFactory.create({
      email: "test@example.com",
    });
    const pendingPaper = await PaperFactory.create({
      status: "pending",
      userId: testUser.id,
    });

    // create another pending paper for another user to confirm that only the requester's pending paper is returned
    await PaperFactory.create({ status: "pending" });

    const res = await api
      .get("/papers")
      .query({ userId: testUser.id })
      .set("Authorization", `Bearer ${testUser.authToken}`)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0]).toHaveProperty("status", "pending");
    expect(res.body.data[0]).toHaveProperty("id", pendingPaper.id);
});

  it ("allows authenticated users to filter their papers by status", async ({ expect }) => {
    const testUser = await UserFactory.create({
      email: "test@example.com",
    });
    const pendingPaper = await PaperFactory.create({
      status: "pending",
      userId: testUser.id,
    });
    const publishedPaper = await PaperFactory.create({
      status: "published",
      userId: testUser.id,
    });

    const res = await api
      .get("/papers")
      .query({ userId: testUser.id })
      .query({ status: "pending" })
      .set("Authorization", `Bearer ${testUser.authToken}`)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0]).toHaveProperty("status", "pending");
    expect(res.body.data[0]).toHaveProperty("id", pendingPaper.id);

    const publishedRes = await api
      .get("/papers")
      .query({ userId: testUser.id })
      .query({ status: "published" })
      .set("Authorization", `Bearer ${testUser.authToken}`)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(Array.isArray(publishedRes.body.data)).toBe(true);
    expect(publishedRes.body.data.length).toBe(1);
    expect(publishedRes.body.data[0]).toHaveProperty("status", "published");
    expect(publishedRes.body.data[0]).toHaveProperty("id", publishedPaper.id);
  });
});

describe("POST /papers", () => {
  it("requires authentication", async ({ expect }) => {
    const res = await api
      .post("/papers")
      .field("title", "Test Paper")
      .field("abstract", "Test abstract")
      .field("categoryId", "1")
      .expect("Content-Type", /json/)
      .expect(401);

    expect(res.body).toHaveProperty(
      "message",
      "Authentication required. Please sign in to continue.",
    );
  });

  it("returns 400 when no PDF file is passed", async ({ expect }) => {
    const testUser = await UserFactory.create({
      email: "test@example.com",
    });
    await api
      .post("/papers")
      .set("Authorization", `Bearer ${testUser.authToken}`)
      .field("title", "Test Paper")
      .field("abstract", "Test abstract")
      .field("categoryId", "1")
      .expect("Content-Type", /json/)
      .expect(400);
  });

  it("returns 400 when an invalid category ID is passed", async ({
    expect,
  }) => {
    const testUser = await UserFactory.create({
      email: "test@example.com",
    });
    const invalidCategoryId = 999; // Assuming this category ID does not exist in the test database
    const res = await api
      .post("/papers")
      .set("Authorization", `Bearer ${testUser.authToken}`)
      .field("title", "Test Paper")
      .field("abstract", "Test abstract")
      .field("notes", "Test notes")
      .field("categoryId", invalidCategoryId) // Invalid category ID
      .attach("file", TEST_PDF_BUFFER, {
        filename: "test1.pdf",
        contentType: "application/pdf",
      })
      .expect("Content-Type", /json/)
      .expect(400);

    expect(res.body).toHaveProperty(
      "error",
      `Invalid category ID: ${invalidCategoryId}`,
    );
  });

  it("returns unique paper slug when a paper with the same title exists", async ({
    expect,
  }) => {
    const title = "Unique Title Paper";
    const testUser = await UserFactory.create({
      email: "test@example.com",
    });

    const testCategory = await CategoryFactory.create({
      name: "Test Category",
    });

    // Create the first paper
    const firstPaper = await api
      .post("/papers")
      .set("Authorization", `Bearer ${testUser.authToken}`)
      .field("title", title)
      .field("abstract", "First abstract")
      .field("notes", "Test notes")
      .field("categoryId", testCategory.id.toString())
      .attach("file", TEST_PDF_BUFFER, {
        filename: "test1.pdf",
        contentType: "application/pdf",
      })
      .expect("Content-Type", /json/)
      .expect(201);

    expect(firstPaper.body).toHaveProperty("slug", firstPaper.body.slug);

    // Create the second paper with the same title
    const secondPaper = await api
      .post("/papers")
      .set("Authorization", `Bearer ${testUser.authToken}`)
      .field("title", title)
      .field("abstract", "Second abstract")
      .field("categoryId", testCategory.id.toString())
      .field("notes", "Test notes")
      .attach("file", Buffer.from("%PDF-1.4 Test PDF content"), {
        filename: "test2.pdf",
        contentType: "application/pdf",
      })
      .expect("Content-Type", /json/)
      .expect(201);

    const firstPaperSlug = firstPaper.body.slug;
    const secondPaperSlug = secondPaper.body.slug;

    expect(secondPaperSlug).not.toBe(firstPaperSlug);
  });

  it("uploads PDF and creates paper successfully", async ({ expect }) => {
    const testUser = await UserFactory.create({
      email: "test@example.com",
    });
    const testCategory = await CategoryFactory.create({
      name: "Test Category",
    });
    const res = await api
      .post("/papers")
      .set("Authorization", `Bearer ${testUser.authToken}`)
      .field("title", "Test Paper with PDF")
      .field("abstract", "Test abstract")
      .field("categoryId", testCategory.id.toString())
      .field("notes", "Test notes")
      .attach("file", TEST_PDF_BUFFER, {
        filename: "test.pdf",
        contentType: "application/pdf",
      })
      .expect("Content-Type", /json/)
      .expect(201);

    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("title", "Test Paper with PDF");
    expect(res.body).toHaveProperty("abstract", "Test abstract");
    expect(res.body).toHaveProperty("status", "pending");
    expect(res.body).toHaveProperty("ipfsCid", TEST_CID);
  });
});

describe("GET /papers/:id", () => {
  it("returns 404 when paper is not found", async ({ expect }) => {
    const res = await api
      .get("/papers/non-existent-slug-or-id")
      .expect("Content-Type", /json/)
      .expect(404);

    expect(res.body).toHaveProperty("error", "Paper not found");
  });

  it("allows anonymous users to fetch published papers by id", async ({
    expect,
  }) => {
    const paper = await PaperFactory.create({ status: "published" });

    const res = await api
      .get(`/papers/${paper.id}`)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(res.body).toHaveProperty("id", paper.id);
    expect(res.body).toHaveProperty("status", "published");
  });

  it("allows anonymous users to fetch published papers by slug", async ({
    expect,
  }) => {
    const paper = await PaperFactory.create({ status: "published" });

    const res = await api
      .get(`/papers/${paper.slug}`)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(res.body).toHaveProperty("id", paper.id);
    expect(res.body).toHaveProperty("slug", paper.slug);
    expect(res.body).toHaveProperty("status", "published");
  });

  it("does not allow anonymous users to fetch non-published papers", async ({
    expect,
  }) => {
    const paper = await PaperFactory.create({ status: "pending" });

    const res = await api
      .get(`/papers/${paper.id}`)
      .expect("Content-Type", /json/)
      .expect(404);

    expect(res.body).toHaveProperty("error", "Paper not found");
  });

  it("allow authenticated users to view their own non-published papers", async ({
    expect,
  }) => {
    const testUser = await UserFactory.create({
      email: "test@example.com",
    });
    const paper = await PaperFactory.create({
      status: "pending",
      userId: testUser.id,
    });

    const res = await api
      .get(`/papers/${paper.id}`)
      .set("Authorization", `Bearer ${testUser.authToken}`)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(res.body).toHaveProperty("id", paper.id);
    expect(res.body).toHaveProperty("status", "pending");
  });

  it("allow authenticated users to fetch their own non-published papers", async ({
    expect,
  }) => {
    const testUser = await UserFactory.create({
      email: "test@example.com",
    });
    const paper = await PaperFactory.create({
      status: "pending",
      userId: testUser.id,
    });

    const res = await api
      .get(`/papers?userId=${testUser.id}`)
      .set("Authorization", `Bearer ${testUser.authToken}`)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(res.body).toHaveProperty("data");
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toHaveProperty("id", paper.id);
    expect(res.body.data[0]).toHaveProperty("status", "pending");
  });
});


describe("PUT /papers/:id", () => {
  it("requires authentication", async ({ expect }) => {
    const res = await api
      .put("/papers/1")
      .field("title", "Updated title")
      .expect("Content-Type", /json/)
      .expect(401);

    expect(res.body).toHaveProperty(
      "message",
      "Authentication required. Please sign in to continue.",
    );
  });

  it("returns 404 when paper is not found", async ({ expect }) => {
    const testUser = await UserFactory.create({
      email: "test@example.com",
    });

    const res = await api
      .put(`/papers/999999`)
      .set("Authorization", `Bearer ${testUser.authToken}`)
      .field("title", "Updated title")
      .expect("Content-Type", /json/)
      .expect(404);

    expect(res.body).toHaveProperty("error", "Paper not found");
  });

  it("allows users to update their own papers", async ({ expect }) => {
    const testUser = await UserFactory.create({
      email: "test@example.com",
    });
    const paper = await PaperFactory.create({
      status: "pending",
      userId: testUser.id,
    });

    const res = await api
      .put(`/papers/${paper.id}`)
      .set("Authorization", `Bearer ${testUser.authToken}`)
      .field("title", "Updated title")
      .expect("Content-Type", /json/)
      .expect(200);

    expect(res.body).toHaveProperty("title", "Updated title");
    expect(res.body).toHaveProperty("id", paper.id);
  });

  it("does not allow users to update papers that aren't theirs", async ({ expect }) => {
    const testUser1 = await UserFactory.create({
      email: "test1@example.com",
    });
    const testUser2 = await UserFactory.create({
      email: "test2@example.com",
    });
    const paper = await PaperFactory.create({
      status: "pending",
      userId: testUser1.id,
    });

    const res = await api
      .put(`/papers/${paper.id}`)
      .set("Authorization", `Bearer ${testUser2.authToken}`)
      .field("title", "Updated title")
      .attach("file", TEST_PDF_BUFFER, {
        filename: "test.pdf",
        contentType: "application/pdf",
      })
      .expect("Content-Type", /json/)
      .expect(403);

    expect(res.body).toHaveProperty("error", "Forbidden request");
  });
});    

describe("DELETE /papers/:id", () => {
  it("requires authentication", async ({ expect }) => {
    const res = await api
      .delete("/papers/1")
      .expect("Content-Type", /json/)
      .expect(401);

    expect(res.body).toHaveProperty(
      "message",
      "Authentication required. Please sign in to continue.",
    );
  });

  it("returns 404 when paper is not found", async ({ expect }) => {
    const testUser = await UserFactory.create({
      email: "test@example.com",
    });
    const res = await api
      .delete(`/papers/999999`)
      .set("Authorization", `Bearer ${testUser.authToken}`)
      .expect("Content-Type", /json/)
      .expect(404);

    expect(res.body).toHaveProperty("error", "Paper not found");
  });

  it("allows users to delete their own papers", async ({ expect }) => {
    const testUser = await UserFactory.create({
      email: "test@example.com",
    });
    const paper = await PaperFactory.create({
      status: "pending",
      userId: testUser.id,
    });

    const res = await api
      .delete(`/papers/${paper.id}`)
      .set("Authorization", `Bearer ${testUser.authToken}`)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(res.body).toHaveProperty("message", `'${paper.title}' paper deleted successfully`);
  });

  it("does not allow users to delete papers that aren't theirs", async ({ expect }) => {
    const testUser1 = await UserFactory.create({
      email: "test1@example.com",
    });
    const testUser2 = await UserFactory.create({
      email: "test2@example.com",
    });
    const paper = await PaperFactory.create({
      status: "pending",
      userId: testUser1.id,
    });

    const res = await api
      .delete(`/papers/${paper.id}`)
      .set("Authorization", `Bearer ${testUser2.authToken}`)
      .expect("Content-Type", /json/)
      .expect(403);

    expect(res.body).toHaveProperty("error", "Forbidden request");
  });
});