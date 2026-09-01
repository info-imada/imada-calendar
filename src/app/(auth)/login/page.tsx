import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { LoginForm } from "@/features/authentication/login-form";
import { authenticationMessages } from "@/messages/common";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-8 sm:px-8 sm:py-12">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,rgb(var(--brand-rgb)/0.10),transparent_68%)] dark:bg-[radial-gradient(circle_at_top,rgb(var(--brand-rgb)/0.08),transparent_68%)]" />
      <Card className="card-enterprise relative w-full max-w-108 border-border-strong shadow-card">
        <CardHeader className="space-y-4 px-5 pt-6 sm:px-7 sm:pt-7">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-primary font-display text-sm font-semibold text-primary-foreground shadow-sm">C</span>
            <div>
              <p className="text-sm font-semibold">Calendar</p>
            </div>
          </div>
          <div className="space-y-1.5 border-t border-border-subtle pt-4">
            <p className="label-overline">{authenticationMessages.login.eyebrow}</p>
            <h1 className="font-display text-xl font-medium leading-snug sm:text-2xl">{authenticationMessages.login.title}</h1>
            <CardDescription className="leading-5">{authenticationMessages.login.description}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-6 sm:px-7 sm:pb-7">
          <LoginForm
            authenticationError={typeof error === "string"}
            zohoEnabled={Boolean(process.env.ZOHO_CLIENT_ID && process.env.ZOHO_CLIENT_SECRET)}
          />
        </CardContent>
      </Card>
    </main>
  );
}
