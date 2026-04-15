import { modelPayloadSchema } from '../modelPayload';

describe('modelPayloadSchema', () => {
  it('accepts minimal valid model', () => {
    const r = modelPayloadSchema.safeParse({
      title: 'Untitled',
      version: '',
      icons: [],
      colors: [{ id: '__DEFAULT__', value: '#a5b8f3' }],
      items: [],
      views: []
    });
    expect(r.success).toBe(true);
  });

  it('rejects invalid title type', () => {
    const r = modelPayloadSchema.safeParse({
      title: 1,
      icons: [],
      colors: [],
      items: [],
      views: []
    });
    expect(r.success).toBe(false);
  });
});
