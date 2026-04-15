import { z } from 'zod';

/** Short labels: node/view/icon names, collections (aligned with API project title cap). */
const MAX_LABEL_LEN = 200;
/** Long text: descriptions, notes, text box bodies (documentation-friendly). */
const MAX_LONG_TEXT_LEN = 100_000;

export const coords = z.object({
  x: z.number(),
  y: z.number()
});

export const id = z.string();
export const color = z.string();

export const constrainedStrings = {
  name: z.string().max(MAX_LABEL_LEN),
  title: z.string().min(1).max(MAX_LABEL_LEN),
  longText: z.string().max(MAX_LONG_TEXT_LEN),
  description: z.string().max(MAX_LONG_TEXT_LEN)
};
