# Managed Users and Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir a ADMIN GLOBAL crear y editar usuarios con acceso Zoho o local, rol/alcance inicial y auditoría, y modernizar el login con el icono oficial incluido en el repositorio.

**Architecture:** Las nuevas mutaciones vivirán junto a las Server Actions de autorización para reutilizar la política transaccional, anti-escalación y códigos de error existentes. La UI de alta/edición se aislará en un componente de formulario gestionado consumido por `TeamWorkspace`; el read model de `/team` derivará el tipo de cuenta desde `UserCredential` y `Account`. El login conservará NextAuth y solo cambiará presentación, estados y accesibilidad.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma/PostgreSQL, NextAuth, Zod, ShadCN/Base UI, Tailwind CSS, Vitest + Testing Library.

## Global Constraints

- Trabajar directamente en `master`; no crear worktrees ni ramas auxiliares.
- No implementar invitaciones, email transaccional, magic links ni eliminación física de usuarios.
- Solo ADMIN GLOBAL puede crear o editar identidades.
- Ningún secreto puede persistirse en texto plano ni incluirse en `AuditLog`.
- Mantener roles, overrides, activación/suspensión y reseteo de contraseña como acciones explícitas existentes.
- Toda producción nueva debe seguir ciclo TDD rojo-verde-refactor.
- Mantener responsive explícito en `<640px`, `640–1024px` y `>1024px`, claro y oscuro.

---

### Task 1: Contratos Zod para usuarios gestionados

**Files:**
- Modify: `src/lib/validations/administration.ts`
- Test: `src/lib/validations/administration.test.ts`

**Interfaces:**
- Produces: `ManagedUserCreateInput`, `ManagedUserUpdateInput`, `managedUserCreateInputSchema`, `managedUserUpdateInputSchema`.
- `ManagedUserCreateInput` discrimina `scopeType` y contiene `name`, `email`, `authMethod: "ZOHO" | "LOCAL"`, `accessStatus: "PENDING" | "ACTIVE"`, `roleId`, y `countryId` o `teamId` cuando aplique.
- `ManagedUserUpdateInput` contiene `userId`, `name`, `email`.

- [ ] **Step 1: Escribir pruebas fallidas de normalización y discriminación**

```ts
expect(managedUserCreateInputSchema.parse({
  name: " Ana Torres ", email: "ANA@EXAMPLE.COM ", authMethod: "LOCAL",
  accessStatus: "ACTIVE", roleId, scopeType: "GLOBAL",
})).toMatchObject({ name: "Ana Torres", email: "ana@example.com" });
expect(managedUserCreateInputSchema.safeParse({
  name: "Ana", email: "ana@example.com", authMethod: "ZOHO",
  accessStatus: "ACTIVE", roleId, scopeType: "TEAM",
}).success).toBe(false);
```

- [ ] **Step 2: Ejecutar la prueba y confirmar fallo por exports inexistentes**

Run: `npm test -- src/lib/validations/administration.test.ts`

- [ ] **Step 3: Implementar los esquemas y tipos con email normalizado y alcance discriminado**
- [ ] **Step 4: Ejecutar la prueba y confirmar verde**

---

### Task 2: Creación y edición transaccional en Server Actions

**Files:**
- Modify: `src/app/actions/authorization.ts`
- Test: `src/app/actions/authorization.test.ts`

**Interfaces:**
- Produces: `createManagedUser(input: ManagedUserCreateInput): Promise<AuthorizationActionResult>`.
- Produces: `updateManagedUser(input: ManagedUserUpdateInput): Promise<AuthorizationActionResult>`.
- Reuses: `requireAdministrationAccess`, `assertCanAssignRole`, `scopeKeyFor`, `hashPassword`, `mutationMetadata`, `actionError`.

- [ ] **Step 1: Extender el harness con `user.create/update`, `userCredential.create`, roles, equipos y cuentas OAuth**
- [ ] **Step 2: Escribir pruebas fallidas para creación local y Zoho**

```ts
const local = await createManagedUser(localInput);
expect(local).toMatchObject({ success: true, temporaryPassword: expect.any(String) });
expect(tx.userCredential.create).toHaveBeenCalledWith(expect.objectContaining({
  data: expect.objectContaining({ mustChangePassword: true }),
}));
expect(JSON.stringify(tx.auditLog.create.mock.calls)).not.toContain(local.temporaryPassword);

const zoho = await createManagedUser({ ...zohoInput, authMethod: "ZOHO" });
expect(zoho).toMatchObject({ success: true });
expect(tx.userCredential.create).not.toHaveBeenCalled();
```

- [ ] **Step 3: Escribir pruebas fallidas para conflicto, prioridad, rollback lógico y auditoría**
- [ ] **Step 4: Escribir pruebas fallidas para edición, autoedición y bloqueo de correo Zoho vinculado**
- [ ] **Step 5: Ejecutar pruebas y confirmar los fallos esperados**

Run: `npm test -- src/app/actions/authorization.test.ts`

- [ ] **Step 6: Implementar `createManagedUser`**

La acción obtiene el actor, genera/hashéa la contraseña fuera de la transacción solo para `LOCAL`, y dentro de `$transaction`: revalida acceso administrativo, carga prioridad/asignaciones, valida rol y alcance, crea `User`, llama `assertCanAssignRole`, crea asignación con `scopeKey`, crea credencial opcional y escribe logs sin secretos.

- [ ] **Step 7: Implementar `updateManagedUser`**

Dentro de `$transaction`: revalida ADMIN GLOBAL, bloquea self-targeting, carga cuentas y prioridad objetivo, bloquea objetivos de prioridad igual/superior, impide cambiar correo con `provider === "zoho"`, actualiza perfil y registra before/after.

- [ ] **Step 8: Ejecutar pruebas de actions y confirmar verde**

---

### Task 3: Read model y formulario Crear/Editar usuario

**Files:**
- Create: `src/features/team/managed-user-sheet.tsx`
- Create: `src/features/team/managed-user-sheet.test.tsx`
- Modify: `src/app/(app)/team/page.tsx`
- Modify: `src/features/team/team-workspace.tsx`
- Modify: `src/features/team/team-workspace.test.tsx`

**Interfaces:**
- `TeamMember` incorpora `hasZohoAccount: boolean`.
- `ManagedUserSheet` recibe `mode`, `member?`, `model`, `open`, `onOpenChange`, `onSaved`.
- `onSaved` refresca el read model; la contraseña temporal permanece dentro del Sheet hasta cerrarlo.

- [ ] **Step 1: Escribir prueba fallida del read model contractual `hasZohoAccount`**
- [ ] **Step 2: Escribir pruebas fallidas del formulario**

```tsx
expect(screen.getByRole("button", { name: "Nuevo usuario" })).toBeVisible();
fireEvent.click(screen.getByRole("button", { name: "Nuevo usuario" }));
expect(screen.getByRole("dialog", { name: "Nuevo usuario" })).toBeVisible();
expect(screen.getByRole("combobox", { name: "Método de acceso" })).toBeVisible();
```

Cubrir selector local/Zoho, alcance condicional, submit, error `CONFLICT`, secreto temporal, copia y bloqueo del correo Zoho en edición.

- [ ] **Step 3: Ejecutar pruebas UI y confirmar fallo por componente ausente**

Run: `npm test -- src/features/team/managed-user-sheet.test.tsx src/features/team/team-workspace.test.tsx`

- [ ] **Step 4: Ampliar query de `/team` con `accounts.provider` y mapear `hasZohoAccount`**
- [ ] **Step 5: Implementar `ManagedUserSheet` con `ResponsiveSheet`, `FormSection`, ShadCN Select/Input/Alert y Sonner**
- [ ] **Step 6: Integrar Nuevo usuario en `PageHeader.actions` y Editar usuario en el detalle sin botones anidados**
- [ ] **Step 7: Ejecutar pruebas UI y confirmar verde**

---

### Task 4: Login moderno con icono Zoho

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/features/authentication/login-form.tsx`
- Modify: `src/features/authentication/login-form.test.tsx`

**Interfaces:**
- Mantiene `signIn("zoho", { callbackUrl: "/" })` y `signIn("credentials", ...)`.
- Consume `/zoho-svgrepo-com.svg` mediante `next/image`.

- [ ] **Step 1: Escribir pruebas fallidas para icono, placeholders, Alert y estados independientes**

```tsx
expect(screen.getByRole("img", { name: "" })).toHaveAttribute("src", expect.stringContaining("zoho-svgrepo-com.svg"));
expect(screen.getByPlaceholderText("nombre@empresa.com")).toBeVisible();
```

El icono puede ser decorativo (`alt=""`); verificar el `img` por selector y conservar el nombre accesible del botón en su texto.

- [ ] **Step 2: Ejecutar prueba y confirmar fallo esperado**

Run: `npm test -- src/features/authentication/login-form.test.tsx`

- [ ] **Step 3: Refactorizar `LoginForm` con icono, Alerts, placeholders y carga Zoho/credenciales**
- [ ] **Step 4: Compactar `LoginPage` con encabezado de marca, superficies neutrales y breakpoints explícitos**
- [ ] **Step 5: Ejecutar prueba y confirmar verde**

---

### Task 5: Verificación integral y QA visual

**Files:**
- Verify only unless a regression requires a focused fix.

- [ ] **Step 1: Ejecutar tests focalizados de usuarios y autenticación**

Run: `npm test -- src/lib/validations/administration.test.ts src/app/actions/authorization.test.ts src/features/team/managed-user-sheet.test.tsx src/features/team/team-workspace.test.tsx src/features/authentication/login-form.test.tsx`

- [ ] **Step 2: Ejecutar suite completa**

Run: `npm test`

- [ ] **Step 3: Ejecutar lint**

Run: `npm run lint`

- [ ] **Step 4: Ejecutar build de producción**

Run: `npm run build`

- [ ] **Step 5: Verificar en navegador `/login` y `/team` en 390px, 768px y 1440px, claro/oscuro**

Comprobar: ausencia de overflow horizontal, icono Zoho visible, controles táctiles, foco, Drawer/Sheet, campos condicionales, errores, secreto temporal y edición con correo Zoho bloqueado.

- [ ] **Step 6: Revisar `git diff --check` y confirmar que no se incluyeron secretos ni cambios ajenos**
