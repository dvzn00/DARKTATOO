import { z } from "zod";

import { ARTIST_COUNT } from "@/lib/domain/constants";
import { uuidSchema } from "./common";

export const tattooArtistSchema = z.object({
  id: uuidSchema,
  name: z.string().trim().min(2).max(80),
  specialty: z.string().trim().min(2).max(80),
  bio: z.string().trim().min(2).max(600),
  profile_picture_url: z.string().min(1),
  instagram_url: z.string().nullable(),
  /** O estúdio tem duas cadeiras: 1 ou 2. O banco impõe o mesmo CHECK. */
  display_order: z
    .number()
    .int()
    .min(1)
    .max(ARTIST_COUNT, `O estúdio tem apenas ${ARTIST_COUNT} tatuadores.`),
  is_active: z.boolean(),
  created_at: z.string(),
});

export type TattooArtist = z.infer<typeof tattooArtistSchema>;

/**
 * A lista de artistas do estúdio.
 *
 * O limite de dois não é enfeite: é a regra do negócio, checada aqui, no
 * CHECK da tabela e no índice único de `display_order`.
 */
export const artistRosterSchema = z
  .array(tattooArtistSchema)
  .max(ARTIST_COUNT, `O estúdio tem apenas ${ARTIST_COUNT} tatuadores.`);
