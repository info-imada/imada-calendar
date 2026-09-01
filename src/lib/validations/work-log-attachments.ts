import { z } from "zod";

export const WORK_LOG_ATTACHMENT_MAX_BYTES = 100 * 1024 * 1024;
export const WORK_LOG_ATTACHMENT_MAX_COUNT = 5;

export const workLogAttachmentMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "video/mp4",
  "video/quicktime",
  "video/webm",
] as const;

export const workLogAttachmentInputSchema = z.object({
  name: z.string().trim().min(1).max(255),
  type: z.enum(workLogAttachmentMimeTypes),
  size: z.number().int().positive().max(WORK_LOG_ATTACHMENT_MAX_BYTES),
}).superRefine((value, context) => {
  const extension = value.name.toLowerCase().split(".").pop();
  const extensionsByMime: Record<(typeof workLogAttachmentMimeTypes)[number], string[]> = {
    "image/jpeg": ["jpg", "jpeg"],
    "image/png": ["png"],
    "image/webp": ["webp"],
    "image/heic": ["heic"],
    "video/mp4": ["mp4"],
    "video/quicktime": ["mov"],
    "video/webm": ["webm"],
  };
  if (!extension || !extensionsByMime[value.type].includes(extension)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["name"], message: "La extensión no corresponde al tipo de archivo." });
  }
});

export const workLogAttachmentIdsSchema = z
  .array(z.string().cuid())
  .max(WORK_LOG_ATTACHMENT_MAX_COUNT)
  .default([]);

export type WorkLogAttachmentInput = z.infer<typeof workLogAttachmentInputSchema>;
