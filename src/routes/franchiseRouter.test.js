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
    testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
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

  let user = await DB.addUser(adminUser);
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

test('get franchises', async () => {
    const franchiseId = await createFranchise();
    const franchiseName = newFranchise.name;

    const getRes = await request(app).get('/api/franchise');

    expect(getRes.status).toBe(200);
    expect(Array.isArray(getRes.body.franchises)).toBe(true);
    expect(getRes.body.more).toBeDefined();

    const found = getRes.body.franchises.find((f) => f.id === franchiseId);
    expect(found).toBeDefined();
    expect(found.name).toBe(franchiseName);
    expect(found.stores).toBeDefined();
    // Non-admin/unauthenticated callers should not get admin info back
    expect(found.admins).toBeUndefined();
});

test('get franchises as admin', async () => {
    const franchiseId = await createFranchise();
    const franchiseName = newFranchise.name;

    const getRes = await request(app).get('/api/franchise').set('Authorization', `Bearer ${adminUserAuthToken}`);

    expect(getRes.status).toBe(200);
    expect(Array.isArray(getRes.body.franchises)).toBe(true);

    const found = getRes.body.franchises.find((f) => f.id === franchiseId);
    expect(found).toBeDefined();
    expect(found.name).toBe(franchiseName);
    expect(found.stores).toBeDefined();
    // Admin callers should get the full franchise detail, including admins
    expect(found.admins).toBeDefined();
    expect(Array.isArray(found.admins)).toBe(true);
});

test('get user franchises', async () => {
    const dbTestUser = await DB.getUser(testUser.email, testUser.password);
    const userId = dbTestUser.id;

    // A user with no franchises should get an empty array back
    const emptyRes = await request(app).get(`/api/franchise/${userId}`).set('Authorization', `Bearer ${testUserAuthToken}`);
    expect(emptyRes.status).toBe(200);
    expect(emptyRes.body).toEqual([]);

    // Create a franchise with testUser as a franchisee admin
    const franchiseWithAdmin = { admins: [{ email: testUser.email }], name: Math.random().toString(36).substring(2, 12), stores: [] };
    const createRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${adminUserAuthToken}`).send(franchiseWithAdmin);
    expect(createRes.status).toBe(200);
    const franchiseId = createRes.body.id;

    const getRes = await request(app).get(`/api/franchise/${userId}`).set('Authorization', `Bearer ${testUserAuthToken}`);

    expect(getRes.status).toBe(200);
    expect(Array.isArray(getRes.body)).toBe(true);

    const found = getRes.body.find((f) => f.id === franchiseId);
    expect(found).toBeDefined();
    expect(found.name).toBe(franchiseWithAdmin.name);
    expect(found.admins).toBeDefined();
    expect(found.admins.some((a) => a.email === testUser.email)).toBe(true);

    // An admin should also be able to look up another user's franchises
    const adminGetRes = await request(app).get(`/api/franchise/${userId}`).set('Authorization', `Bearer ${adminUserAuthToken}`);
    expect(adminGetRes.status).toBe(200);
    expect(adminGetRes.body.some((f) => f.id === franchiseId)).toBe(true);
});