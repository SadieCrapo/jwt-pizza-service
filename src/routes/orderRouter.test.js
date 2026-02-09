const request = require('supertest');
const app = require('../service');

const adminUser = { name: "admin user", email: "user@admin.com", password: "toomanysecrets" };
const normalUser = { name: "normal user", email: "user@test.com", password: "a" };
let adminUserAuthToken;
let normalUserAuthToken;
const newItem = { title: "new item", description: "the newest item", image: "some image url", price: 12.46 };
const newFranchise = { admins: [], name: "newest franchise", stores: [] };
const newStore = { name: "store number one" }
const newOrder = { franchiseId: "franchise number one", storeId: "store number one", date: "today", items: [] };

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

function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}

test('add menu item', addMenuItem);

test('add item exception', async () => {
    const addRes = await request(app).put('/api/order/menu').set('Authorization', `Bearer ${normalUserAuthToken}`).send(newItem);
    expect(addRes.status).toBe(403);
    expect(addRes.body.message).toEqual('unable to add menu item');
});

test('get menu', async () => {
    let expectedMenu = [];
    expectedMenu.push(await addMenuItem());
    expectedMenu.push(await addMenuItem());
    expectedMenu.push(await addMenuItem());

    const getRes = await request(app).get('/api/order/menu');
    expect(getRes.status).toBe(200);
    expect(getRes.body).toEqual(expect.arrayContaining([expect.objectContaining(expectedMenu[0]), expect.objectContaining(expectedMenu[1]), expect.objectContaining(expectedMenu[2])]));
});

test('create order', async () => {
    const franchiseId = await createFranchise();
    const storeId = await createStore(franchiseId);

    await addMenuItem();
    let menu = await request(app).get('/api/order/menu');

    let newOrderItem = { menuId: menu.body[0].id, description: menu.body[0].description, price: menu.body[0].price };

    newOrder.franchiseId = franchiseId;
    newOrder.storeId = storeId;
    newOrder.items = [newOrderItem];
    const createRes = await request(app).post('/api/order').set('Authorization', `Bearer ${normalUserAuthToken}`).send(newOrder);

    expect(createRes.status).toBe(200);
    expect(createRes.body.order).toMatchObject(newOrder);
    expectValidJwt(createRes.body.jwt);
});