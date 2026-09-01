import "server-only";

import { CopyObjectCommand, DeleteObjectsCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export type R2Config = {
  endpoint: string;
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  presignExpiresSeconds: number;
};

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`R2_MISSING_${name}`);
  return value;
}

export function getR2Config(): R2Config {
  const endpoint = requiredEnv("R2_ENDPOINT");
  try {
    new URL(endpoint);
  } catch {
    throw new Error("R2_INVALID_ENDPOINT");
  }
  const explicitExpiry = process.env.R2_PRESIGN_EXPIRES_SECONDS?.trim();
  const legacyExpiryMinutes = process.env.R2_UPLOAD_EXPIRATION?.trim();
  const expires = explicitExpiry
    ? Number.parseInt(explicitExpiry, 10)
    : legacyExpiryMinutes
      ? Number.parseInt(legacyExpiryMinutes, 10) * 60
      : 900;
  if (!Number.isInteger(expires) || expires < 60 || expires > 3600) throw new Error("R2_INVALID_EXPIRATION");
  return {
    endpoint,
    bucket: requiredEnv("R2_BUCKET"),
    region: process.env.R2_REGION?.trim() || "auto",
    accessKeyId: requiredEnv("R2_ACCESS_KEY_ID"),
    secretAccessKey: requiredEnv("R2_SECRET_ACCESS_KEY"),
    presignExpiresSeconds: expires,
  };
}

let cachedClient: { key: string; client: S3Client } | null = null;

function getR2Client(config: R2Config) {
  const key = `${config.endpoint}:${config.bucket}:${config.region}:${config.accessKeyId}`;
  if (!cachedClient || cachedClient.key !== key) {
    cachedClient = {
      key,
      client: new S3Client({
        endpoint: config.endpoint,
        region: config.region,
        credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
      }),
    };
  }
  return cachedClient.client;
}

export function sanitizeObjectFilename(name: string) {
  const sanitized = name
    .normalize("NFKC")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+/, "")
    .slice(0, 120);
  return sanitized || "archivo";
}

export function buildWorkLogObjectKey(workLogId: string, uploadUuid: string, name: string) {
  return `work-logs/${workLogId}/${uploadUuid}/${sanitizeObjectFilename(name)}`;
}

export async function presignWorkLogUpload(input: {
  objectKey: string;
  contentType: string;
  contentLength: number;
}) {
  const config = getR2Config();
  const url = await getSignedUrl(getR2Client(config), new PutObjectCommand({
    Bucket: config.bucket,
    Key: input.objectKey,
    ContentType: input.contentType,
  }), { expiresIn: config.presignExpiresSeconds });
  return { url, expiresIn: config.presignExpiresSeconds };
}

export async function getWorkLogAttachmentDownloadUrl(objectKey: string) {
  const config = getR2Config();
  return getSignedUrl(getR2Client(config), new GetObjectCommand({
    Bucket: config.bucket,
    Key: objectKey,
    ResponseContentDisposition: "inline",
  }), { expiresIn: config.presignExpiresSeconds });
}

export async function headR2Object(objectKey: string) {
  const config = getR2Config();
  return getR2Client(config).send(new HeadObjectCommand({ Bucket: config.bucket, Key: objectKey }));
}

export async function deleteR2Objects(objectKeys: string[]) {
  if (!objectKeys.length) return;
  const config = getR2Config();
  await getR2Client(config).send(new DeleteObjectsCommand({
    Bucket: config.bucket,
    Delete: { Objects: objectKeys.map((Key) => ({ Key })), Quiet: true },
  }));
}

export async function copyR2Object(sourceKey: string, destinationKey: string) {
  const config = getR2Config();
  await getR2Client(config).send(new CopyObjectCommand({
    Bucket: config.bucket,
    CopySource: `${config.bucket}/${sourceKey}`,
    Key: destinationKey,
  }));
}

export function resetR2ClientForTests() {
  cachedClient = null;
}
