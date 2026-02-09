const request = require('supertest');
const app = require('../service');

const adminUser = { name: "admin user", email: "user@admin.com", password: "toomanysecrets" };
const testUser = { name: "test user", email: "user@test.com", password: "a" };
let adminUserAuthToken;
let testUserAuthToken;
const newFranchise = { admins: [], name: "newest franchise", stores: [] };
const newStore = { name: "store number one" }
const { Role, DB } = require('../database/database.js');

beforeAll(async () => {
    await createAdminUser();

    const loginRes = await request(app).put('/api/auth').send(adminUser);

    testUser.name = Math.random().toString(36).substring(2, 12);
    const registerRes = await request(app).post('/api/auth').send(testUser);

    expect(loginRes.status).toBe(200);
    expect(registerRes.status).toBe(200);
    adminUserAuthToken = loginRes.body.token;
    testUserAuthToken = registerRes.body.token;
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

async function createStore(franchiseId) {
    newStore.name = Math.random().toString(36).substring(2, 12);

    const createRes = await request(app).post(`/api/franchise/${franchiseId}/store`).set('Authorization', `Bearer ${adminUserAuthToken}`).send(newStore);

    expect(createRes.status).toBe(200);
    expect(createRes.body).toMatchObject(newStore);
    return createRes.body.id;
}

test('create store', async () => {
    const franchiseId = await createFranchise();
    createStore(franchiseId);
});

test('create franchise', createFranchise);

test('delete franchise', async () => {
    const id = await createFranchise();

    const deleteRes = await request(app).delete(`/api/franchise/${id}`).set('Authorization', `Bearer ${adminUserAuthToken}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.message).toBe('franchise deleted');
});

test('delete store', async () => {
    const franchiseId = await createFranchise();
    const storeId = await createStore(franchiseId);

    const deleteRes = await request(app).delete(`/api/franchise/${franchiseId}/store/${storeId}`).set('Authorization', `Bearer ${adminUserAuthToken}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.message).toBe('store deleted');
});

test('create franchise exception', async () => {
    const createRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${testUserAuthToken}`).send(newFranchise);

    expect(createRes.status).toBe(403);
    expect(createRes.body.message).toBe('unable to create a franchise');
});

test('create store exception', async () => {
    const franchiseId = await createFranchise();
    
    const createRes = await request(app).post(`/api/franchise/${franchiseId}/store`).set('Authorization', `Bearer ${testUserAuthToken}`).send(newStore);

    expect(createRes.status).toBe(403);
    expect(createRes.body.message).toBe('unable to create a store');
});

test('delete franchise exception', async () => {
    const id = await createFranchise();

    const deleteRes = await request(app).delete(`/api/franchise/${id}`).set('Authorization', `Bearer ${testUserAuthToken}`);

    expect(deleteRes.status).toBe(403);
    expect(deleteRes.body.message).toBe('unable to delete a franchise');
});

test('create store exception', async () => {
    const franchiseId = await createFranchise();
    const storeId = await createStore(franchiseId);

    const deleteRes = await request(app).delete(`/api/franchise/${franchiseId}/store/${storeId}`).set('Authorization', `Bearer ${testUserAuthToken}`);

    expect(deleteRes.status).toBe(403);
    expect(deleteRes.body.message).toBe('unable to delete a store');
});