import { beforeEach, describe, expect, it } from "vitest";

import {
  buildWorkLogObjectKey,
  getR2Config,
  resetR2ClientForTests,
  sanitizeObjectFilename,
} from "@/lib/storage/r2";

describe("R2 work log storage", () => {
  beforeEach(() => {
    process.env.R2_ENDPOINT = "https://account.r2.cloudflarestorage.com";
    process.env.R2_BUCKET = "calendar-attachments";
    process.env.R2_REGION = "auto";
    process.env.R2_ACCESS_KEY_ID = "access-key";
    process.env.R2_SECRET_ACCESS_KEY = "secret-key";
    delete process.env.R2_PRESIGN_EXPIRES_SECONDS;
    delete process.env.R2_UPLOAD_EXPIRATION;
    resetR2ClientForTests();
  });

  it("requires complete configuration and applies the bounded default expiry", () => {
    expect(getR2Config()).toMatchObject({ bucket: "calendar-attachments", region: "auto", presignExpiresSeconds: 900 });
    delete process.env.R2_SECRET_ACCESS_KEY;
    expect(() => getR2Config()).toThrow("R2_MISSING_R2_SECRET_ACCESS_KEY");
  });

  it("supports the existing expiration alias in minutes", () => {
    process.env.R2_UPLOAD_EXPIRATION = "10";
    expect(getR2Config().presignExpiresSeconds).toBe(600);
  });

  it("keeps uploaded object keys inside the work log namespace", () => {
    expect(sanitizeObjectFilename("../foto de campo!!.jpg")).toBe("foto-de-campo-.jpg");
    expect(buildWorkLogObjectKey("work-1", "upload-1", "foto.jpg")).toBe("work-logs/work-1/upload-1/foto.jpg");
  });
});
