const request = require('supertest');
const app = require('../service');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
const newUser = { name: 'new user', email: 'new@test.com', password: 'b' };
const fakeUser = { name: 'fake user', email: 'fake@test.com', password: 'c' };
let testUserAuthToken;
let testUserId;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  testUserId = registerRes.body.user.id;
});

test('get user', async () => {
    const getRes = await request(app).get('/api/user/me').set('Authorization', `Bearer ${testUserAuthToken}`).send(testUser);
    expect(getRes.status).toBe(200);

    const expectedUser = { ...testUser, roles: [{ role: 'diner' }] };
    delete expectedUser.password;
    expect(getRes.body).toMatchObject(expectedUser);
});