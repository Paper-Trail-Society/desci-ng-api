import "dotenv/config";
import request from "supertest";
import { describe, it } from "vitest";
import app from "../../src/app";

const api = request(app);

describe("GET /", () => {
  it.concurrent("should return a 200 status and a message", async ({ expect }) => {
    const res = await api
      .get('/')
      .expect('Content-Type', "text/html; charset=utf-8")
      .expect(200);

    expect(res.text).toBe('Nubian Research API - Decentralized Science Platform');
  });

  it.concurrent("should return a 200 status with health check", async ({ expect}) => {
    const res = await api
      .get('/health')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(res.body).toHaveProperty('status', 'healthy');
    expect(res.body).toHaveProperty('database', 'connected');
    expect(res.body).toHaveProperty('authenticated', false);
  });
});
