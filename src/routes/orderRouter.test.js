const request = require('supertest');
const app = require('../service');

const adminUser = { name: "admin user", email: "user@admin.com", password: "toomanysecrets" };
const normalUser = { name: "normal user", email: "user@test.com", password: "a" };
let adminUserAuthToken;
let normalUserAuthToken;
const newItem = { title: "new item", description: "the newest item", image: "some image url", price: 12.46 };
const newStore = { name: "store number one" }
const { Role, DB } = require('../database/database.js');

beforeAll(async () => {
    await createAdminUser();

    const adminLoginRes = await request(app).put('/api/auth').send(adminUser);
    const normalRegisterRes = await request(app).post('/api/auth').send(normalUser);

    expect(adminLoginRes.status).toBe(200);
    expect(normalRegisterRes.status).toBe(200);
    adminUserAuthToken = adminLoginRes.body.token;
    normalUserAuthToken = normalRegisterRes.body.token;
});

async function createAdminUser() {
  adminUser.name = Math.random().toString(36).substring(2, 12);
  adminUser.email = adminUser.name + '@admin.com';
  adminUser.roles = [{ role: Role.Admin }];

  user = await DB.addUser(adminUser);
  return { ...user, password: 'toomanysecrets' };
}

async function addMenuItem() {
    newItem.title = Math.random().toString(36).substring(2, 12);
    newItem.description = Math.random().toString(36).substring(2, 12);
    const addRes = await request(app).put('/api/order/menu').set('Authorization', `Bearer ${adminUserAuthToken}`).send(newItem);
    expect(addRes.status).toBe(200);
    expect(addRes.body).toEqual(expect.arrayContaining([expect.objectContaining(newItem)]));
    return newItem;
}

test('add menu item', addMenuItem);

test('add item exception', async () => {
    const addRes = await request(app).put('/api/order/menu').set('Authorization', `Bearer ${normalUserAuthToken}`).send(newItem);
    expect(addRes.status).toBe(403);
    expect(addRes.body.message).toEqual('unable to add menu item');
});