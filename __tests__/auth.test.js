const request = require('supertest');
const bcrypt = require('bcrypt');

let app;

beforeAll(() => {
  process.env.ADMIN_PASSWORD = bcrypt.hashSync('secret', 10);
  process.env.JWT_SECRET = 'testsecret';
  app = require('../server');
});

describe('Authentication', () => {
  test('successful login returns 204 and sets cookie', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ password: 'secret' });
    expect(res.statusCode).toBe(204);
    expect(res.headers['set-cookie']).toBeDefined();
  });

  test('wrong password returns 401', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ password: 'wrong' });
    expect(res.statusCode).toBe(401);
  });
});

describe('Protected route', () => {
  test('unauthorized access to /api/knowledge', async () => {
    const res = await request(app).get('/api/knowledge');
    expect(res.statusCode).toBe(401);
  });
});
