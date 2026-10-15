const request = require('supertest');
const app = require('../service');

const { Role, DB } = require('../database/database.js');

const adminUser = { name: "admin user", email: "user@admin.com", password: "toomanysecrets" };
const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
const newUser = { name: 'new user', email: 'new@test.com', password: 'b' };
let adminUserAuthToken;
let testUserAuthToken;
let testUserId;

beforeAll(async () => {
  await createAdminUser();

  const loginRes = await request(app).put('/api/auth').send(adminUser);

  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  expect(loginRes.status).toBe(200);
  expect(registerRes.status).toBe(200);
  adminUserAuthToken = loginRes.body.token;
  testUserAuthToken = registerRes.body.token;
  testUserId = registerRes.body.user.id;
});

async function createAdminUser() {
  adminUser.name = Math.random().toString(36).substring(2, 12);
  adminUser.email = adminUser.name + '@admin.com';
  adminUser.roles = [{ role: Role.Admin }];

  let user = await DB.addUser(adminUser);
  return { ...user, password: 'toomanysecrets' };
}

test('list users unauthorized', async () => {
  const listUsersRes = await request(app).get('/api/user');
  expect(listUsersRes.status).toBe(401);
});

test('list users', async () => {
  const { password, ...cleanedTestUser } = testUser;
  const listUsersRes = await request(app)
    .get('/api/user')
    .set('Authorization', 'Bearer ' + adminUserAuthToken);
  expect(listUsersRes.status).toBe(200);
  console.log({ ...cleanedTestUser, roles: [ { role: 'diner' } ] });
  console.log(listUsersRes.body);
  expect(listUsersRes.body.users).toEqual(expect.arrayContaining([expect.objectContaining({ ...cleanedTestUser, roles: [ { role: 'diner' } ] })]));
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

test('delete user', async () => {
    newUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
    const registerRes = await request(app).post('/api/auth').send(newUser);
    const newUserAuthToken = registerRes.body.token;
    const newUserId = registerRes.body.user.id;

    const deleteRes = await request(app).delete(`/api/user/${newUserId}`).set('Authorization', `Bearer ${newUserAuthToken}`).send();
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.message).toBe('user deleted');
});

test('update exception', async () => {
    newUser.name = Math.random().toString(36).substring(2, 12) + '@test.com';
    const registerRes = await request(app).post('/api/auth').send(newUser);
    const newUserId = registerRes.body.user.id;
    const updateRes = await request(app).put(`/api/user/${newUserId}`).set('Authorization', `Bearer ${testUserAuthToken}`).send(newUser);
    expect(updateRes.status).toBe(403);
    expect(updateRes.body.message).toBe('unauthorized');
});

async function registerUser(service) {
  const testUser = {
    name: 'pizza diner',
    email: `${randomName()}@test.com`,
    password: 'a',
  };
  const registerRes = await service.post('/api/auth').send(testUser);
  registerRes.body.user.password = testUser.password;

  return [registerRes.body.user, registerRes.body.token];
}

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}