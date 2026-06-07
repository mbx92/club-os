const request = require('supertest');
const app = require('../../src/app');
const { User, Role, Tenant } = require('../../src/models');

describe('User Controller', () => {
  let superAdminToken, adminToken, userToken, tenant, adminUser, normalUser, anotherTenant;

  beforeEach(async () => {
    // Create tenants for testing
    tenant = await Tenant.create({
      name: 'Test Gym',
      domain: 'testgym',
      address: '123 Test St',
      phone: '1234567890',
      email: 'test@gym.com'
    });

    anotherTenant = await Tenant.create({
      name: 'Another Gym',
      domain: 'anothergym',
      address: '456 Another St',
      phone: '0987654321',
      email: 'another@gym.com'
    });

    // Create roles
    const adminRole = await Role.create({
      name: 'admin',
      description: 'Administrator role'
    });

    const userRole = await Role.create({
      name: 'user',
      description: 'Regular user role'
    });

    // Create superadmin
    const superAdmin = await User.create({
      name: 'Super Admin',
      email: 'superadmin@example.com',
      password: 'password123',
      isSuperAdmin: true
    });

    // Create admin user
    adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'password123',
      roleId: adminRole.id,
      tenantId: tenant.id
    });

    // Create normal user
    normalUser = await User.create({
      name: 'Normal User',
      email: 'user@example.com',
      password: 'password123',
      roleId: userRole.id,
      tenantId: tenant.id
    });

    // Generate tokens
    superAdminToken = superAdmin.generateJWT();
    adminToken = adminUser.generateJWT();
    userToken = normalUser.generateJWT();
  });

  describe('POST /api/users', () => {
    it('should create a new user with superadmin token', async () => {
      const userData = {
        name: 'New User',
        email: 'newuser@example.com',
        password: 'password123',
        roleId: adminUser.roleId,
        tenantId: tenant.id
      };

      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(userData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('User created successfully');
      expect(response.body.data.name).toBe(userData.name);
      expect(response.body.data.email).toBe(userData.email);
      expect(response.body.data.roleId).toBe(userData.roleId);
      expect(response.body.data.tenantId).toBe(userData.tenantId);
    });

    it('should create a new user with admin token in the same tenant', async () => {
      const userData = {
        name: 'New User',
        email: 'newuser@example.com',
        password: 'password123',
        roleId: normalUser.roleId,
        tenantId: tenant.id
      };

      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('User created successfully');
      expect(response.body.data.name).toBe(userData.name);
      expect(response.body.data.email).toBe(userData.email);
      expect(response.body.data.roleId).toBe(userData.roleId);
      expect(response.body.data.tenantId).toBe(userData.tenantId);
    });

    it('should not create a user with user token', async () => {
      const userData = {
        name: 'New User',
        email: 'newuser@example.com',
        password: 'password123',
        roleId: normalUser.roleId,
        tenantId: tenant.id
      };

      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${userToken}`)
        .send(userData)
        .expect(403);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Forbidden: insufficient permissions');
    });

    it('should not create a user with admin token in another tenant', async () => {
      const userData = {
        name: 'New User',
        email: 'newuser@example.com',
        password: 'password123',
        roleId: normalUser.roleId,
        tenantId: anotherTenant.id // Different tenant
      };

      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(403);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Forbidden: you can only create users for your own tenant');
    });

    it('should not create a user without authentication', async () => {
      const userData = {
        name: 'New User',
        email: 'newuser@example.com',
        password: 'password123',
        roleId: normalUser.roleId,
        tenantId: tenant.id
      };

      const response = await request(app)
        .post('/api/v1/users')
        .send(userData)
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Access denied. No token provided.');
    });

    it('should not create a user with invalid data', async () => {
      const userData = {
        name: 'New User',
        // Missing email, password, roleId, tenantId
      };

      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(userData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('required');
    });

    it('should not create a user with duplicate email in the same tenant', async () => {
      const userData = {
        name: 'New User',
        email: 'admin@example.com', // Same email as adminUser
        password: 'password123',
        roleId: adminUser.roleId,
        tenantId: tenant.id
      };

      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(userData)
        .expect(409);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Email already in use');
    });
  });

  describe('GET /api/users', () => {
    it('should get all users with superadmin token', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveLength(2); // adminUser and normalUser
    });

    it('should get all users from the same tenant with admin token', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveLength(2); // adminUser and normalUser
    });

    it('should get all users from the same tenant with user token', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveLength(2); // adminUser and normalUser
    });

    it('should not get users from another tenant with admin token', async () => {
      // Create a user in another tenant
      await User.create({
        name: 'Another User',
        email: 'another@example.com',
        password: 'password123',
        roleId: adminUser.roleId,
        tenantId: anotherTenant.id
      });

      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveLength(2); // Only users from admin's tenant
    });
  });

  describe('GET /api/users/:id', () => {
    it('should get user by id with superadmin token', async () => {
      const response = await request(app)
        .get(`/api/users/${normalUser.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.id).toBe(normalUser.id);
      expect(response.body.data.name).toBe(normalUser.name);
      expect(response.body.data.email).toBe(normalUser.email);
    });

    it('should get user by id from the same tenant with admin token', async () => {
      const response = await request(app)
        .get(`/api/users/${normalUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.id).toBe(normalUser.id);
      expect(response.body.data.name).toBe(normalUser.name);
      expect(response.body.data.email).toBe(normalUser.email);
    });

    it('should get user by id from the same tenant with user token', async () => {
      const response = await request(app)
        .get(`/api/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.id).toBe(adminUser.id);
      expect(response.body.data.name).toBe(adminUser.name);
      expect(response.body.data.email).toBe(adminUser.email);
    });

    it('should not get user by id from another tenant with admin token', async () => {
      // Create a user in another tenant
      const anotherUser = await User.create({
        name: 'Another User',
        email: 'another@example.com',
        password: 'password123',
        roleId: adminUser.roleId,
        tenantId: anotherTenant.id
      });

      const response = await request(app)
        .get(`/api/v1/users/${anotherUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Forbidden: you can only access users from your own tenant');
    });

    it('should not get user by id from another tenant with user token', async () => {
      // Create a user in another tenant
      const anotherUser = await User.create({
        name: 'Another User',
        email: 'another@example.com',
        password: 'password123',
        roleId: adminUser.roleId,
        tenantId: anotherTenant.id
      });

      const response = await request(app)
        .get(`/api/users/${anotherUser.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Forbidden: you can only access users from your own tenant');
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/v1/users/999999')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(404);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('User not found');
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update user with superadmin token', async () => {
      const updateData = {
        name: 'Updated User',
        email: 'updated@example.com',
        roleId: adminUser.roleId,
        tenantId: tenant.id
      };

      const response = await request(app)
        .put(`/api/users/${normalUser.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('User updated successfully');
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.email).toBe(updateData.email);
    });

    it('should update own profile with user token', async () => {
      const updateData = {
        name: 'Updated User',
        email: 'updated@example.com'
      };

      const response = await request(app)
        .put(`/api/users/${normalUser.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('User updated successfully');
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.email).toBe(updateData.email);
    });

    it('should update user from the same tenant with admin token', async () => {
      const updateData = {
        name: 'Updated User',
        email: 'updated@example.com'
      };

      const response = await request(app)
        .put(`/api/users/${normalUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('User updated successfully');
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.email).toBe(updateData.email);
    });

    it('should not update user from another tenant with admin token', async () => {
      // Create a user in another tenant
      const anotherUser = await User.create({
        name: 'Another User',
        email: 'another@example.com',
        password: 'password123',
        roleId: adminUser.roleId,
        tenantId: anotherTenant.id
      });

      const updateData = {
        name: 'Updated User',
        email: 'updated@example.com'
      };

      const response = await request(app)
        .put(`/api/users/${anotherUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Forbidden: you can only update users from your own tenant');
    });

    it('should not update another user with user token', async () => {
      const updateData = {
        name: 'Updated User',
        email: 'updated@example.com'
      };

      const response = await request(app)
        .put(`/api/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Forbidden: you can only update your own profile');
    });

    it('should not update user with invalid data', async () => {
      const updateData = {
        name: '' // Invalid name
      };

      const response = await request(app)
        .put(`/api/users/${normalUser.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('notNull');
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete user with superadmin token', async () => {
      const response = await request(app)
        .delete(`/api/users/${normalUser.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('User deleted successfully');

      // Verify user is deleted
      const deletedUser = await User.findByPk(normalUser.id);
      expect(deletedUser).toBeNull();
    });

    it('should delete user from the same tenant with admin token', async () => {
      const response = await request(app)
        .delete(`/api/users/${normalUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('User deleted successfully');

      // Verify user is deleted
      const deletedUser = await User.findByPk(normalUser.id);
      expect(deletedUser).toBeNull();
    });

    it('should delete own profile with user token', async () => {
      const response = await request(app)
        .delete(`/api/users/${normalUser.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('User deleted successfully');

      // Verify user is deleted
      const deletedUser = await User.findByPk(normalUser.id);
      expect(deletedUser).toBeNull();
    });

    it('should not delete user from another tenant with admin token', async () => {
      // Create a user in another tenant
      const anotherUser = await User.create({
        name: 'Another User',
        email: 'another@example.com',
        password: 'password123',
        roleId: adminUser.roleId,
        tenantId: anotherTenant.id
      });

      const response = await request(app)
        .delete(`/api/v1/users/${anotherUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Forbidden: you can only delete users from your own tenant');
    });

    it('should not delete another user with user token', async () => {
      const response = await request(app)
        .delete(`/api/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Forbidden: you can only delete your own profile');
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .delete('/api/users/999999')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(404);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('User not found');
    });
  });
});