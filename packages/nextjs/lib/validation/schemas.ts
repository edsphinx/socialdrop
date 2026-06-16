import { z } from "zod";

export const claimSchema = z.object({ campaignId: z.number().int().positive() });
export const gamificationUpdateSchema = z.object({ campaignId: z.number().int().positive() });
export const gamificationRegisterSchema = z.object({
  campaignId: z.number().int().positive(),
  castHash: z.string().min(1),
});
