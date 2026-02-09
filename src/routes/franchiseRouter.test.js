const request = require('supertest');
const app = require('../service');

const adminUser = { name: "admin user", email: "user@admin.com", password: "toomanysecrets" };
let adminUserAuthToken;
const newFranchise = { admins: [], name: "newest franchise", stores: [] };
const { Role, DB } = require('../database/database.js');

beforeAll(async () => {
    await createAdminUser();

    const loginRes = await request(app).put('/api/auth').send(adminUser);

    expect(loginRes.status).toBe(200);
    adminUserAuthToken = loginRes.body.token;
});

async function createAdminUser() {
  adminUser.name = Math.random().toString(36).substring(2, 12);
  adminUser.email = adminUser.name + '@admin.com';
  adminUser.roles = [{ role: Role.Admin }];

  user = await DB.addUser(adminUser);
  return { ...user, password: 'toomanysecrets' };
}

async function createFranchise() {
    newFranchise.name = Math.random().toString(36).substring(2, 12);
    const createRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${adminUserAuthToken}`).send(newFranchise);

    expect(createRes.status).toBe(200);
    expect(createRes.body).toMatchObject(newFranchise);
    return createRes.body.id;
}

test('create franchise', createFranchise);

test('delete franchise', async () => {
    const id = await createFranchise();

    const deleteRes = await request(app).delete(`/api/franchise/${id}`).set('Authorization', `Bearer ${adminUserAuthToken}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.message).toBe('franchise deleted');
});