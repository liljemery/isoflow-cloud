import { modelPayloadSchema } from '../../../src/schemas/modelPayload';

export function validateModelPayload(data: unknown) {
  return modelPayloadSchema.safeParse(data);
}
