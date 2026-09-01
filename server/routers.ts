import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createNoteForUser, deleteNoteForUser, getNoteByUser, listNotesByUser, updateNoteForUser } from "./db";
import { logger } from "./_core/logger";

const noteInput = z.object({
  title: z.string().trim().min(1, "A title is required").max(180),
  content: z.string().max(100000, "Note content is too long"),
});
const noteId = z.object({ id: z.number().int().positive() });

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  notes: router({
    list: protectedProcedure.query(async ({ ctx }) => listNotesByUser(ctx.user.id)),
    get: protectedProcedure.input(noteId).query(async ({ ctx, input }) => {
      const note = await getNoteByUser(input.id, ctx.user.id);
      if (!note) throw new TRPCError({ code: "NOT_FOUND", message: "Note not found" });
      return note;
    }),
    create: protectedProcedure.input(noteInput).mutation(async ({ ctx, input }) => {
      logger.info({ event: "note.create", userId: ctx.user.id }, "Note created");
      return createNoteForUser({ ...input, userId: ctx.user.id });
    }),
    update: protectedProcedure.input(noteId.merge(noteInput)).mutation(async ({ ctx, input }) => {
      const existing = await getNoteByUser(input.id, ctx.user.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Note not found" });
      logger.info({ event: "note.update", userId: ctx.user.id, noteId: input.id }, "Note updated");
      return updateNoteForUser(input.id, ctx.user.id, { title: input.title, content: input.content });
    }),
    delete: protectedProcedure.input(noteId).mutation(async ({ ctx, input }) => {
      const deleted = await deleteNoteForUser(input.id, ctx.user.id);
      if (!deleted) throw new TRPCError({ code: "NOT_FOUND", message: "Note not found" });
      logger.info({ event: "note.delete", userId: ctx.user.id, noteId: input.id }, "Note deleted");
      return { success: true } as const;
    }),
  }),
});

export type AppRouter = typeof appRouter;
