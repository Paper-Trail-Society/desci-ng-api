import "dotenv/config";
import request from "supertest";
import { beforeEach, describe, it, vi } from "vitest";
import app from "../../src/app";
import { DatabaseSeeder } from "../setup/database-seeder";
import { PaperFactory } from "../factories/paper-factory";
import { UserFactory } from "../factories/user-factory";
import { CategoryFactory } from "../factories/field-factory";
import { ipfsService } from "../../src/utils/ipfs";
import { PaperCommentFactory } from "../factories/paper-comment-factory";

const TEST_CID = "mock-cid";
const TEST_PDF_BUFFER = Buffer.from("%PDF-1.4 Test PDF content");

vi.mock("../../src/utils/ipfs", () => ({
  ipfsService: {
    uploadFile: vi.fn().mockResolvedValue({ cid: "mock-cid" }),
    deleteFilesByCid: vi.fn().mockResolvedValue({}),
    getFileByCid: vi.fn().mockResolvedValue({ id: "mock-ipfs-id" }),
  },
}));

vi.mock("../../src/utils/mail-service", () => ({
  MailService: vi.fn().mockImplementation(() => ({
    send: vi.fn(),
  })),
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

  it("allows searching papers by author name using general search", async ({
    expect,
  }) => {
    const author = await UserFactory.create({ name: "John Doe" });
    const paper = await PaperFactory.create({
      title: "Some Paper",
      userId: author.id,
      status: "published",
    });

    // Create another paper by different author
    const otherAuthor = await UserFactory.create({ name: "Jane Smith" });
    await PaperFactory.create({
      title: "Another Paper",
      userId: otherAuthor.id,
      status: "published",
    });

    // Test general search param including author name
    const res = await api.get("/papers").query({ search: "Doe" }).expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(paper.id);
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

  it("allows authenticated users to filter their papers by status", async ({
    expect,
  }) => {
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

  it("supports pagination with page and size parameters", async ({
    expect,
  }) => {
    for (let i = 0; i < 15; i++) {
      await PaperFactory.create({ status: "published" });
    }

    const firstPageRes = await api
      .get("/papers")
      .query({ page: 1, size: 10 })
      .expect("Content-Type", /json/)
      .expect(200);

    expect(firstPageRes.body).toHaveProperty("total", 15);
    expect(firstPageRes.body).toHaveProperty("size", 10);
    expect(Array.isArray(firstPageRes.body.data)).toBe(true);
    expect(firstPageRes.body.data).toHaveLength(10);
    expect(firstPageRes.body.prev_page).toBeNull();
    expect(firstPageRes.body.next_page).toEqual("/papers?page=2&size=10");

    const secondPageRes = await api
      .get("/papers")
      .query({ page: 2, size: 10 })
      .expect("Content-Type", /json/)
      .expect(200);

    expect(secondPageRes.body).toHaveProperty("total", 15);
    expect(secondPageRes.body).toHaveProperty("size", 10);
    expect(Array.isArray(secondPageRes.body.data)).toBe(true);
    expect(secondPageRes.body.data).toHaveLength(5);
    expect(secondPageRes.body.prev_page).toEqual("/papers?page=1&size=10");
    expect(secondPageRes.body.next_page).toBeNull();
  });

  it("returns papers ordered by newest first", async ({ expect }) => {
    const olderPaper = await PaperFactory.create({
      title: "Older Paper",
      status: "published",
      createdAt: new Date("2023-01-01T00:00:00Z"),
    });
    const middlePaper = await PaperFactory.create({
      title: "Middle Paper",
      status: "published",
      createdAt: new Date("2023-01-02T00:00:00Z"),
    });
    const newestPaper = await PaperFactory.create({
      title: "Newest Paper",
      status: "published",
      createdAt: new Date("2023-01-03T00:00:00Z"),
    });

    const res = await api
      .get("/papers")
      .query({ size: 10 })
      .expect("Content-Type", /json/)
      .expect(200);

    expect(res.body.data[0]).toHaveProperty("id", newestPaper.id);
    expect(res.body.data[2]).toHaveProperty("id", olderPaper.id);
    expect(res.body.data[1]).toHaveProperty("id", middlePaper.id);
  });

  it("allows filtering papers by category", async ({ expect }) => {
    const user = await UserFactory.create({
      email: "category-user@example.com",
    });
    const categoryA = await CategoryFactory.create({ name: "Category A" });
    const categoryB = await CategoryFactory.create({ name: "Category B" });

    const paperInCategoryA1 = await PaperFactory.create({
      status: "published",
      userId: user.id,
      categoryId: categoryA.id,
    });
    const paperInCategoryA2 = await PaperFactory.create({
      status: "published",
      userId: user.id,
      categoryId: categoryA.id,
    });

    await PaperFactory.create({
      status: "published",
      userId: user.id,
      categoryId: categoryB.id,
    });

    const res = await api
      .get("/papers")
      .query({ categoryId: categoryA.id })
      .expect("Content-Type", /json/)
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(2);
    const returnedIds = res.body.data.map((paper: any) => paper.id);
    expect(returnedIds).toEqual(
      expect.arrayContaining([paperInCategoryA1.id, paperInCategoryA2.id]),
    );
  });

  it("ignores status filter for anonymous users and only returns published papers", async ({
    expect,
  }) => {
    const pendingPaper = await PaperFactory.create({ status: "pending" });
    const publishedPaper = await PaperFactory.create({ status: "published" });

    const res = await api
      .get("/papers")
      .query({ status: "pending" })
      .expect("Content-Type", /json/)
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0]).toHaveProperty("status", "published");
    expect(res.body.data[0]).toHaveProperty("id", publishedPaper.id);
    expect(res.body.data[0].id).not.toBe(pendingPaper.id);
  });

  it("only returns published papers when authenticated users request another user's papers", async ({
    expect,
  }) => {
    const owner = await UserFactory.create({
      email: "owner-no-status@example.com",
    });
    const otherUser = await UserFactory.create({
      email: "other-no-status@example.com",
    });

    const ownerPendingPaper = await PaperFactory.create({
      status: "pending",
      userId: owner.id,
    });
    const ownerPublishedPaper1 = await PaperFactory.create({
      status: "published",
      userId: owner.id,
    });
    const ownerPublishedPaper2 = await PaperFactory.create({
      status: "published",
      userId: owner.id,
    });

    await PaperFactory.create({
      status: "published",
      userId: otherUser.id,
    });

    const res = await api
      .get("/papers")
      .query({ userId: owner.id })
      .set("Authorization", `Bearer ${otherUser.authToken}`)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    const returnedIds = res.body.data.map((paper: any) => paper.id);
    expect(returnedIds).toEqual(
      expect.arrayContaining([
        ownerPublishedPaper1.id,
        ownerPublishedPaper2.id,
      ]),
    );
    expect(returnedIds).not.toContain(ownerPendingPaper.id);
    for (const paper of res.body.data) {
      expect(paper.userId).toBe(owner.id);
      expect(paper.status).toBe("published");
    }
  });

  it("only returns published papers when authenticated users request another user's papers with a status filter", async ({
    expect,
  }) => {
    const owner = await UserFactory.create({
      email: "owner@example.com",
    });
    const otherUser = await UserFactory.create({
      email: "other@example.com",
    });

    await PaperFactory.create({
      status: "pending",
      userId: owner.id,
    });
    const ownerPublishedPaper = await PaperFactory.create({
      status: "published",
      userId: owner.id,
    });
    await PaperFactory.create({
      status: "published",
      userId: otherUser.id,
    });

    const res = await api
      .get("/papers")
      .query({ userId: owner.id, status: "pending" })
      .set("Authorization", `Bearer ${otherUser.authToken}`)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0]).toHaveProperty("userId", owner.id);
    expect(res.body.data[0]).toHaveProperty("status", "published");
    expect(res.body.data[0]).toHaveProperty("id", ownerPublishedPaper.id);
  });

  it("returns empty results and no pagination links when no papers match the filters", async ({
    expect,
  }) => {
    await PaperFactory.create({
      title: "Some other paper",
      abstract: "A different abstract",
      status: "published",
    });

    const res = await api
      .get("/papers")
      .query({ search: "no-matching-query-term" })
      .expect("Content-Type", /json/)
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(0);
    expect(res.body.total).toBe(0);
    expect(res.body.next_page).toBeNull();
    expect(res.body.prev_page).toBeNull();
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

  it("returns 400 when required fields are missing in request payload", async ({
    expect,
  }) => {
    const testUser = await UserFactory.create({
      email: "test@example.com",
    });

    const res = await api
      .post("/papers")
      .set("Authorization", `Bearer ${testUser.authToken}`)
      .expect("Content-Type", /json/)
      .expect(400);

    expect(res.body).toHaveProperty("errors");
  });

  it("returns 400 when the PDF file is not of the correct mime type (PDF)", async ({
    expect,
  }) => {
    const testUser = await UserFactory.create({
      email: "test@example.com",
    });

    const res = await api
      .post("/papers")
      .set("Authorization", `Bearer ${testUser.authToken}`)
      .attach("file", TEST_PDF_BUFFER, {
        filename: "test1.html",
        contentType: "application/html",
      })
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

  it("creates paper successfully", async ({ expect }) => {
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

    expect(ipfsService.uploadFile).toHaveBeenCalled();

    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("title", "Test Paper with PDF");
    expect(res.body).toHaveProperty("abstract", "Test abstract");
    expect(res.body).toHaveProperty("status", "pending");
    expect(res.body).toHaveProperty("ipfsCid", TEST_CID);
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
    expect(ipfsService.uploadFile).toHaveBeenCalled();

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
    expect(ipfsService.uploadFile).toHaveBeenCalled();
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

  it("allow authenticated users to fetch any published paper by ID", async ({
    expect,
  }) => {
    const testUser = await UserFactory.create({
      email: "test@example.com",
    });
    const paper = await PaperFactory.create({
      status: "published",
      userId: testUser.id,
    });

    const testUser2 = await UserFactory.create({
      email: "test2@example.com",
    });

    const res = await api
      .get(`/papers/${paper.id}`)
      .set("Authorization", `Bearer ${testUser2.authToken}`)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(res.body).toHaveProperty("id", paper.id);
    expect(res.body).toHaveProperty("status", "published");
  });

  it("allow authenticated users to fetch any published paper by slug", async ({
    expect,
  }) => {
    const testUser = await UserFactory.create({
      email: "test@example.com",
    });
    const paper = await PaperFactory.create({
      status: "published",
      userId: testUser.id,
    });

    const testUser2 = await UserFactory.create({
      email: "test2@example.com",
    });

    const res = await api
      .get(`/papers/${paper.slug}`)
      .set("Authorization", `Bearer ${testUser2.authToken}`)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(res.body).toHaveProperty("id", paper.id);
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

  it("does not allow users to update papers that aren't theirs", async ({
    expect,
  }) => {
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

    expect(ipfsService.deleteFilesByCid).toHaveBeenCalled();
    expect(res.body).toHaveProperty(
      "message",
      `'${paper.title}' paper deleted successfully`,
    );
  });

  it("does not allow users to delete papers that aren't theirs", async ({
    expect,
  }) => {
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

describe("POST /papers/{paperId}/comments", () => {
  it("should return 404 when creating a comment on a non-existing paper", async ({
    expect,
  }) => {
    const testUser = await UserFactory.create({
      email: "test@example.com",
    });
    const res = await api
      .post("/papers/23429/comments")
      .set("Authorization", `Bearer ${testUser.authToken}`)
      .field("body", "This is a comment")
      .expect("Content-Type", /json/)
      .expect(400);
  });

  it("should return 403 when an author is tries to comment on their unpublished paper", async ({
    expect,
  }) => {
    const testUser = await UserFactory.create({
      email: "test@example.com",
    });
    const testPaper = await PaperFactory.create({
      status: "pending",
      userId: testUser.id,
    });

    const commentBody = "This is a comment";

    const res = await api
      .post(`/papers/${testPaper.id}/comments`)
      .set("Authorization", `Bearer ${testUser.authToken}`)
      .send({ body: commentBody })
      .expect("Content-Type", /json/)
      .expect(403);
  });

  it("should return 404 when a user tries to comment on an unpublished paper by another author", async ({
    expect,
  }) => {
    const testUser = await UserFactory.create({
      email: "test@example.com",
    });
    const testPaper = await PaperFactory.create({ status: "pending" });

    const commentBody = "This is a comment";

    const res = await api
      .post(`/papers/${testPaper.id}/comments`)
      .set("Authorization", `Bearer ${testUser.authToken}`)
      .send({ body: commentBody })
      .expect("Content-Type", /json/)
      .expect(404);
  });

  it("should return 400 when creating a comment on an empty request body", async ({
    expect,
  }) => {
    const testUser = await UserFactory.create({
      email: "test@example.com",
    });
    const testPaper = await PaperFactory.create({ status: "published" });

    const res = await api
      .post(`/papers/${testPaper.id}/comments`)
      .set("Authorization", `Bearer ${testUser.authToken}`)
      .expect("Content-Type", /json/)
      .expect(400);
  });

  it("should return 400 when creating a comment on an empty `body` field", async ({
    expect,
  }) => {
    const testUser = await UserFactory.create({
      email: "test@example.com",
    });
    const testPaper = await PaperFactory.create({ status: "published" });

    const res = await api
      .post(`/papers/${testPaper.id}/comments`)
      .set("Authorization", `Bearer ${testUser.authToken}`)
      .field("body", "       ")
      .expect("Content-Type", /json/)
      .expect(400);
  });

  it("should comment on a paper successfully", async ({ expect }) => {
    const testUser = await UserFactory.create({
      email: "test@example.com",
    });
    const testPaper = await PaperFactory.create({ status: "published" });

    const commentBody =
      "One of the best works I have read on multiplanetary and space research is this one. I appreciate it especially because it emphasizes the humanitarian dimension of space exploration. As you explained, who governs is not necessarily the most important factor; rather, what truly matters is the system and the laws that are established. Governance becomes meaningful only when it creates structures that promote fairness, cooperation, and long-term progress. We must also recognize that we now live in a world increasingly characterized by abundance (even in space; because of knowledge created). Unlike the past, when knowledge and resources were scarce and competition often resembled a zero-sum game, modern technological and scientific development suggests that collaboration can create expanding opportunities for everyone. For this reason, the real competition today should not merely be about dominance, but about creating knowledge and developing technologies that address seemingly inevitable challenges. In the context of space exploration, such challenges include radiation exposure, adaptation to different gravitational environments, and the biological limits of human life beyond Earth. Ultimately, what can be said is that humans are remarkable in their ability to continuously invent ways to make life easier, safer, and better. Our drive to solve problems and expand the frontiers of knowledge is what makes our species unique.";

    const res = await api
      .post(`/papers/${testPaper.id}/comments`)
      .set("Authorization", `Bearer ${testUser.authToken}`)
      .send({ body: commentBody })
      .expect("Content-Type", /json/)
      .expect(201);

    // Never return the markdown content to the client, the client doesn't use it.
    expect("bodyMarkdown" in res.body).toBe(false);
    expect(res.body).toHaveProperty("bodyHtml", `<p>${commentBody}</p>\n`);
    expect(res.body).toHaveProperty("authorId", testUser.id);
    expect(res.body).toHaveProperty("paperId", testPaper.id);
  });

  it("should return 400 when a comment is replying to a non-existing comment", async ({
    expect,
  }) => {
    const testUser = await UserFactory.create({
      email: "test@example.com",
    });
    const testPaper = await PaperFactory.create({ status: "published" });

    const commentBody = "This is a comment";

    const res = await api
      .post(`/papers/${testPaper.id}/comments`)
      .set("Authorization", `Bearer ${testUser.authToken}`)
      .send({ body: commentBody, parentCommentId: 400 })
      .expect("Content-Type", /json/)
      .expect(400);

    expect(res.body).toHaveProperty("error");
  });

  it("should reply a comment successfully", async ({ expect }) => {
    const testUser = await UserFactory.create({
      email: "test@example.com",
    });
    const testPaper = await PaperFactory.create({ status: "published" });
    const paperCommentFactory = new PaperCommentFactory();
    const parentCommentBody =
      "One of the best works I have read on multiplanetary and space research is this one. I appreciate it especially because it emphasizes the humanitarian dimension of space exploration. As you explained, who governs is not necessarily the most important factor; rather, what truly matters is the system and the laws that are established. Governance becomes meaningful only when it creates structures that promote fairness, cooperation, and long-term progress. We must also recognize that we now live in a world increasingly characterized by abundance (even in space; because of knowledge created). Unlike the past, when knowledge and resources were scarce and competition often resembled a zero-sum game, modern technological and scientific development suggests that collaboration can create expanding opportunities for everyone. For this reason, the real competition today should not merely be about dominance, but about creating knowledge and developing technologies that address seemingly inevitable challenges. In the context of space exploration, such challenges include radiation exposure, adaptation to different gravitational environments, and the biological limits of human life beyond Earth. Ultimately, what can be said is that humans are remarkable in their ability to continuously invent ways to make life easier, safer, and better. Our drive to solve problems and expand the frontiers of knowledge is what makes our species unique.";

    const testComment = await paperCommentFactory.create({
      body: parentCommentBody,
      paperId: testPaper.id,
      authorId: testUser.id,
      parentCommentId: null,
    });

    const commentBody = "This is a comment";

    const res = await api
      .post(`/papers/${testPaper.id}/comments`)
      .set("Authorization", `Bearer ${testUser.authToken}`)
      .send({ body: commentBody, parentCommentId: testComment.id })
      .expect("Content-Type", /json/)
      .expect(201);

    expect(res.body).toHaveProperty("parentCommentId", testComment.id);

    // Never return the markdown content to the client, the client doesn't use it.
    expect("bodyMarkdown" in res.body).toBe(false);
    expect(res.body).toHaveProperty("bodyHtml", `<p>${commentBody}</p>\n`);
    expect(res.body).toHaveProperty("authorId", testUser.id);
    expect(res.body).toHaveProperty("paperId", testPaper.id);
  });
});

describe("GET /papers/{paperId}/comments", () => {
  it("should return 404 when listing comments for a non-existing paper", async () => {
    const res = await api
      .get("/papers/23429/comments")
      .expect("Content-Type", /json/)
      .expect(404);
  });

  it("should return paginated comments", async ({ expect }) => {
    const testUser = await UserFactory.create({
      email: "test@example.com",
    });
    const testPaper = await PaperFactory.create({
      status: "pending",
      userId: testUser.id,
    });

    const paperCommentFactory = new PaperCommentFactory();
    for (let i = 0; i < 11; i++) {
      await paperCommentFactory.create({
        paperId: testPaper.id,
        authorId: testUser.id,
        body: `This is comment ${i}`,
        parentCommentId: null,
      });
    }

    const res = await api
      .get(`/papers/${testPaper.id}/comments`)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(res.body).toHaveProperty("data");
    expect(res.body.data).toHaveLength(10); // default comments limit
    expect(res.body).toHaveProperty("meta");
    expect(res.body.meta).toHaveProperty("hasMore");
    expect(res.body.meta).toHaveProperty("nextCursor");
    expect(res.body.meta).toHaveProperty("limit");

    const secondRes = await api
      .get(`/papers/${testPaper.id}/comments?limit=5`)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(secondRes.body).toHaveProperty("data");
    expect(secondRes.body.data).toHaveLength(5);
    expect(secondRes.body).toHaveProperty("meta");
    expect(secondRes.body.meta).toHaveProperty("hasMore");
    expect(secondRes.body.meta.hasMore).toBe(true);
    expect(secondRes.body.meta).toHaveProperty("nextCursor");
    expect(secondRes.body.meta).toHaveProperty("limit");
  });

  it("should paginate comment by cursor", async ({ expect }) => {
    const testUser = await UserFactory.create({
      email: "test@example.com",
    });
    const testPaper = await PaperFactory.create({
      status: "pending",
      userId: testUser.id,
    });

    const paperCommentFactory = new PaperCommentFactory();
    for (let i = 0; i < 20; i++) {
      await paperCommentFactory.create({
        paperId: testPaper.id,
        authorId: testUser.id,
        body: `This is comment ${i}`,
        parentCommentId: null,
      });
    }

    const LIMIT = 10;

    const res = await api
      .get(`/papers/${testPaper.id}/comments?limit=${LIMIT}`)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(res.body).toHaveProperty("data");
    expect(res.body.data).toHaveLength(10);
    expect(res.body).toHaveProperty("meta");
    expect(res.body.meta).toHaveProperty("hasMore");
    expect(res.body.meta.hasMore).toBe(true);
    expect(res.body.meta).toHaveProperty("nextCursor");
    expect(res.body.meta.nextCursor).toBeTypeOf("number");
    expect(res.body.meta).toHaveProperty("limit");

    const nextPageRes = await api
      .get(
        `/papers/${testPaper.id}/comments?limit=${LIMIT}&cursor=${res.body.meta.nextCursor}`,
      )
      .expect("Content-Type", /json/)
      .expect(200);

    expect(nextPageRes.body).toHaveProperty("data");
    expect(nextPageRes.body.data).toHaveLength(10);
    expect(nextPageRes.body).toHaveProperty("meta");
    expect(nextPageRes.body.meta).toHaveProperty("hasMore");
    expect(nextPageRes.body.meta.hasMore).toBe(false);
    expect(nextPageRes.body.meta).toHaveProperty("nextCursor");
    expect(nextPageRes.body.meta.nextCursor).toBe(null);
    expect(nextPageRes.body.meta).toHaveProperty("limit");
  });

  it("should sort comments by earliest", async ({ expect }) => {
    const testUser = await UserFactory.create({
      email: "test@example.com",
    });
    const testPaper = await PaperFactory.create({
      status: "pending",
      userId: testUser.id,
    });

    const paperCommentFactory = new PaperCommentFactory();
    for (let i = 0; i < 11; i++) {
      await paperCommentFactory.create({
        paperId: testPaper.id,
        authorId: testUser.id,
        body: `This is comment ${i}`,
        parentCommentId: null,
      });
    }

    const sortDirection = "asc";

    const res = await api
      .get(`/papers/${testPaper.id}/comments?sortDir=${sortDirection}`)
      .expect("Content-Type", /json/)
      .expect(200);

    const firstCommentCreatedAt = new Date(res.body.data[0].createdAt);
    const secondCommentCreatedAt = new Date(res.body.data[1].createdAt);

    expect(res.body).toHaveProperty("data");
    expect(res.body.data).toHaveLength(10);

    expect(firstCommentCreatedAt < secondCommentCreatedAt).toBe(true);
  });

  it("should only return top-level comments by default", async ({ expect }) => {
    const testUser = await UserFactory.create({
      email: "test@example.com",
    });
    const testPaper = await PaperFactory.create({
      status: "published",
    });

    const paperCommentFactory = new PaperCommentFactory();
    const parentComment = await paperCommentFactory.create({
      paperId: testPaper.id,
      authorId: testUser.id,
      body: `Parent comment`,
      parentCommentId: null,
    });

    // Create a reply to the parent comment
    await paperCommentFactory.create({
      paperId: testPaper.id,
      authorId: testUser.id,
      body: `Reply comment`,
      parentCommentId: parentComment.id,
    });

    const res = await api
      .get(`/papers/${testPaper.id}/comments`)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(res.body).toHaveProperty("data");
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(parentComment.id);
  });

  it("should return replies when parentCommentId is provided", async ({
    expect,
  }) => {
    const testUser = await UserFactory.create({
      email: "test@example.com",
    });
    const testPaper = await PaperFactory.create({
      status: "published",
    });

    const paperCommentFactory = new PaperCommentFactory();
    const parentComment = await paperCommentFactory.create({
      paperId: testPaper.id,
      authorId: testUser.id,
      body: `Parent comment`,
      parentCommentId: null,
    });

    const reply1 = await paperCommentFactory.create({
      paperId: testPaper.id,
      authorId: testUser.id,
      body: `Reply comment 1`,
      parentCommentId: parentComment.id,
    });

    const reply2 = await paperCommentFactory.create({
      paperId: testPaper.id,
      authorId: testUser.id,
      body: `Reply comment 2`,
      parentCommentId: parentComment.id,
    });

    const res = await api
      .get(
        `/papers/${testPaper.id}/comments?parentCommentId=${parentComment.id}`,
      )
      .expect("Content-Type", /json/)
      .expect(200);

    expect(res.body).toHaveProperty("data");
    expect(res.body.data).toHaveLength(2);
    const returnedIds = res.body.data.map((c: any) => c.id);
    expect(returnedIds).toContain(reply1.id);
    expect(returnedIds).toContain(reply2.id);
  });
});
