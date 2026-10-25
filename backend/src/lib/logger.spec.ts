import { requestId } from './logger';

describe('requestId', () => {
  function fake() {
    const headers: Record<string, unknown> = {};
    const res = { setHeader: jest.fn() };
    return { headers, res };
  }

  it('keeps a caller-supplied id and echoes it back', () => {
    const { headers, res } = fake();
    headers['x-request-id'] = 'abc-123';
    expect(requestId({ headers }, res)).toBe('abc-123');
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', 'abc-123');
  });

  it('mints an id when the header is missing', () => {
    const { headers, res } = fake();
    const id = requestId({ headers }, res);
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', id);
  });
});
