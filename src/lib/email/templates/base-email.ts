import { escapeHtml } from "@/lib/email/escape-html";

export type EmailContent = { subject: string; html: string; text: string };

const LOGO_URL =
  "https://res.cloudinary.com/dwjxcpfrf/image/upload/v1768957949/Untitled_design__1_-removebg-preview_t8oji9.png";

// Keep transactional emails aligned with CombiSales. Email clients do not
// load the application's CSS, so these tokens are intentionally inlined.
const DESIGN = {
  colors: {
    primary: "#679436",
    white: "#FFFFFF",
    gray50: "#FAFAFA",
    gray100: "#F5F5F5",
    gray200: "#EEEEEE",
    gray300: "#E0E0E0",
    gray600: "#757575",
    gray700: "#616161",
    gray800: "#424242",
    gray900: "#212121",
  },
  fontFamily: "'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,'Helvetica Neue',Arial,sans-serif",
} as const;

export function buildBaseEmail(input: {
  title: string;
  intro: string;
  details: Array<{ label: string; value: string | null | undefined }>;
  actionLabel?: string;
  actionUrl?: string;
  note?: string;
}): { html: string; text: string } {
  const details = input.details.filter((item) => item.value);
  const detailRows = details
    .map(
      ({ label, value }) => `<tr><td style="padding:12px 20px;border-bottom:1px solid ${DESIGN.colors.gray200};font-family:${DESIGN.fontFamily};font-size:12px;font-weight:400;color:${DESIGN.colors.gray600};width:38%;vertical-align:top;background-color:${DESIGN.colors.gray50}">${escapeHtml(label)}</td><td style="padding:12px 20px;border-bottom:1px solid ${DESIGN.colors.gray200};font-family:${DESIGN.fontFamily};font-size:14px;color:${DESIGN.colors.gray900};font-weight:400;line-height:1.5;word-break:break-word;background-color:${DESIGN.colors.white}">${escapeHtml(value ?? "")}</td></tr>`,
    )
    .join("");
  const action = input.actionUrl
    ? `<table role="presentation" width="100%"><tr><td align="center" style="padding-top:22px"><a href="${escapeHtml(input.actionUrl)}" style="display:inline-block;min-height:44px;box-sizing:border-box;padding:13px 24px;border-radius:8px;background-color:${DESIGN.colors.primary};font-family:${DESIGN.fontFamily};color:${DESIGN.colors.white};text-decoration:none;font-size:14px;font-weight:700">${escapeHtml(input.actionLabel ?? "Abrir Calendar")}</a></td></tr></table>`
    : "";
  const note = input.note
    ? `<p style="margin:20px 0 0;font-family:${DESIGN.fontFamily};color:${DESIGN.colors.gray600};font-size:13px;line-height:1.6">${escapeHtml(input.note)}</p>`
    : "";

  return {
    html: `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"></head><body style="margin:0;padding:0;background-color:${DESIGN.colors.gray100};font-family:${DESIGN.fontFamily};color:${DESIGN.colors.gray800};-webkit-font-smoothing:antialiased"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background-color:${DESIGN.colors.gray100}"><tr><td align="center" style="padding:24px 16px"><table role="presentation" width="680" cellspacing="0" cellpadding="0" style="width:680px;max-width:100%;margin:0 auto;background-color:${DESIGN.colors.white};border:1px solid ${DESIGN.colors.gray300};border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.08);overflow:hidden"><tr><td align="center" style="background-color:${DESIGN.colors.primary};padding:28px 24px;border-radius:12px 12px 0 0"><img src="${LOGO_URL}" alt="Combilift" width="160" style="max-width:160px;height:auto;display:block;margin-bottom:12px"><h1 style="margin:0 0 6px;font-family:${DESIGN.fontFamily};font-size:18px;font-weight:400;letter-spacing:.5px;line-height:1.3;color:${DESIGN.colors.white};text-transform:uppercase">${escapeHtml(input.title)}</h1></td></tr><tr><td style="padding:24px"><p style="margin:0 0 18px;font-family:${DESIGN.fontFamily};font-size:15px;line-height:1.65;color:${DESIGN.colors.gray700}">${escapeHtml(input.intro)}</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border:1px solid ${DESIGN.colors.gray300};border-radius:8px;overflow:hidden;border-collapse:separate">${detailRows}</table>${action}${note}</td></tr><tr><td align="center" style="padding:20px 24px;background-color:${DESIGN.colors.gray100};border-top:1px solid ${DESIGN.colors.gray200};border-radius:0 0 12px 12px"><p style="margin:0 0 4px;font-family:${DESIGN.fontFamily};font-size:11px;line-height:1.5;color:${DESIGN.colors.gray600}">Mensaje automático de <strong style="color:${DESIGN.colors.gray700}">Calendar</strong></p><p style="margin:0;font-family:${DESIGN.fontFamily};font-size:10px;color:${DESIGN.colors.gray600}">© ${new Date().getFullYear()} Combilift. Todos los derechos reservados.</p></td></tr></table></td></tr></table></body></html>`,
    text: [
      input.title,
      "=".repeat(input.title.length),
      "",
      input.intro,
      "",
      ...details.map(({ label, value }) => `${label}: ${value}`),
      ...(input.actionUrl
        ? ["", `${input.actionLabel ?? "Abrir Calendar"}: ${input.actionUrl}`]
        : []),
      ...(input.note ? ["", input.note] : []),
    ].join("\n"),
  };
}
