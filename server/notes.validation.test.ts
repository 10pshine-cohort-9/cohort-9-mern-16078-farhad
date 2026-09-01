import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const baseContext = { req: {} as TrpcContext["req"], res: {} as TrpcContext["res"], user: undefined } satisfies TrpcContext;

describe("notes security contract", () => {
  it("rejects unauthenticated note access", async () => {
    const caller = appRouter.createCaller(baseContext);
    await expect(caller.notes.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects invalid note identifiers before database access", async () => {
    const context = { ...baseContext, user: { id: 7, openId: "test", name: "Test", email: "test@example.com", loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() } } as TrpcContext;
    const caller = appRouter.createCaller(context);
    await expect(caller.notes.get({ id: 0 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
