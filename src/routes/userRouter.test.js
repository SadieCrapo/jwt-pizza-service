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

test('update self', async () => {
    const expectedUser = { ...testUser, name: Math.random().toString(36).substring(2, 12) + '@test.com', password: 'd' };
    const updateRes = await request(app).put(`/api/user/${testUserId}`).set('Authorization', `Bearer ${testUserAuthToken}`).send(expectedUser);
    expect(updateRes.status).toBe(200);
    delete expectedUser.password;
    expect(updateRes.body.user).toMatchObject(expectedUser);
    expect(updateRes.body.token).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
});

test('update exception', async () => {
    newUser.name = Math.random().toString(36).substring(2, 12) + '@test.com';
    const registerRes = await request(app).post('/api/auth').send(newUser);
    const newUserId = registerRes.body.user.id;
    const updateRes = await request(app).put(`/api/user/${newUserId}`).set('Authorization', `Bearer ${testUserAuthToken}`).send(newUser);
    expect(updateRes.status).toBe(403);
    expect(updateRes.body.message).toBe('unauthorized');
});