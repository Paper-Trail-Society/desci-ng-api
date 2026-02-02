import "dotenv/config";
import request from "supertest";
import { beforeEach, describe, it, vi } from "vitest";
import app from "../../src/app";
import { DatabaseSeeder } from "../setup/database-seeder";
import { PaperFactory } from "../factories/paper-factory";
import { UserFactory } from "../factories/user-factory";

const TEST_CID = "mock-cid";
const TEST_IPFS_ID = "mock-ipfs-id";
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

  it("only returns published papers for anonymous users", async ({ expect }) => {
    await PaperFactory.create({ status: "pending" });
    const publishedPaper = await PaperFactory.create({ status: "published" });

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
    const res = await api
      .post("/papers")
      .field("title", "Test Paper")
      .field("abstract", "Test abstract")
      .field("categoryId", "1")
      .expect("Content-Type", /json/)
      .expect(400);
  });

  it("returns 400 when an invalid category ID is passed", async ({ expect }) => {
    const res = await api
      .post("/papers")
      .field("title", "Test Paper")
      .field("abstract", "Test abstract")
      .field("categoryId", "999") // Invalid category ID
      .expect("Content-Type", /json/)
      .expect(400);

    expect(res.body).toHaveProperty("error", "Invalid category ID");
  });

  it("returns unique paper slug when a paper with the same title exists", async ({ expect }) => {
    const title = "Unique Title Paper";

    // Create the first paper
    const firstPaper = await api
      .post("/papers")
      .field("title", title)
      .field("abstract", "First abstract")
      .field("categoryId", "1")
      .attach("pdfFile", TEST_PDF_BUFFER, {
        filename: "test1.pdf",
        contentType: "application/pdf",
      })
      .expect("Content-Type", /json/)
      .expect(201);

    expect(firstPaper.body).toHaveProperty("slug", "unique-title-paper");

    // Create the second paper with the same title
    const secondPaper = await api
      .post("/papers")
      .field("title", title)
      .field("abstract", "Second abstract")
      .field("categoryId", "1")
      .attach("pdfFile", Buffer.from("%PDF-1.4 Test PDF content"), {
        filename: "test2.pdf",
        contentType: "application/pdf",
      })
      .expect("Content-Type", /json/)
      .expect(201);
    
    const firstPaperSlug = firstPaper.body.slug;
    const secondPaperSlug = secondPaper.body.slug;

    expect(secondPaperSlug).not.toBe(firstPaperSlug);

    expect(secondPaperSlug.substring(0, 75)).toBe(firstPaperSlug.substring(0, 75));
  });

  it("uploads PDF and creates paper successfully", async ({ expect }) => {
    const res = await api
      .post("/papers")
      .field("title", "Test Paper with PDF")
      .field("abstract", "Test abstract")
      .field("categoryId", "1")
      .attach("pdfFile", TEST_PDF_BUFFER, {
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

  it("allows anonymous users to fetch published papers by id", async ({ expect }) => {
    const paper = await PaperFactory.create({ status: "published" });

    const res = await api
      .get(`/papers/${paper.id}`)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(res.body).toHaveProperty("id", paper.id);
    expect(res.body).toHaveProperty("status", "published");
  });

  it("allows anonymous users to fetch published papers by slug", async ({ expect }) => {
    const paper = await PaperFactory.create({ status: "published" });

    const res = await api
      .get(`/papers/${paper.slug}`)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(res.body).toHaveProperty("id", paper.id);
    expect(res.body).toHaveProperty("slug", paper.slug);
    expect(res.body).toHaveProperty("status", "published");
  });

  it("does not allow anonymous users to fetch non-published papers", async ({ expect }) => {
    const paper = await PaperFactory.create({ status: "pending" });

    const res = await api
      .get(`/papers/${paper.id}`)
      .expect("Content-Type", /json/)
      .expect(404);

    expect(res.body).toHaveProperty("error", "Paper not found");
  });

  it("allow authenticated users to fetch their own non-published papers", async ({ expect }) => {
    // This test requires authentication setup which is not implemented here.
    // Placeholder for future implementation.
  });
});

describe("PUT /papers/:id", () => {
  it("requires authentication", async ({ expect }) => {
    const testUser = await UserFactory.create({
      email: "test@example.com",
      password: "password123",
    });
    const loginResponse = await api
        .post("/auth/login")
        .send({ email: "test@example.com", password: "password123" });

    const res = await api
      .put("/papers/1")
      .field("title", "Updated title")
      .expect("Content-Type", /multipart\/form-data/)
      .expect(401);

    expect(res.body).toHaveProperty(
      "message",
      "Authentication required. Please sign in to continue.",
    );
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
});
