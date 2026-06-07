const request = require('supertest');
const app = require('../../src/app');
const { User, Role, Tenant } = require('../../src/models');

describe('Tenant Controller', () => {
  let superAdminToken, adminToken, userToken, tenant, adminUser, normalUser;

  beforeEach(async () => {
    // Create a tenant for testing
    tenant = await Tenant.create({
      name: 'Test Gym',
      domain: 'testgym',
      address: '123 Test St',
      phone: '1234567890',
      email: 'test@gym.com'
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
      firstName: 'Super',
      lastName: 'Admin',
      email: 'superadmin@example.com',
      password: 'password123',
      isSuperAdmin: true,
      roleId: adminRole.id
    });

    // Create admin user
    adminUser = await User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
      password: 'password123',
      roleId: adminRole.id,
      tenantId: tenant.id
    });

    // Create normal user
    normalUser = await User.create({
      firstName: 'Normal',
      lastName: 'User',
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

  describe('POST /api/tenants', () => {
    it('should create a new tenant with superadmin token', async () => {
      const tenantData = {
        name: 'New Gym',
        domain: 'newgym',
        address: '456 New St',
        phone: '0987654321',
        email: 'new@gym.com'
      };

      const response = await request(app)
        .post('/api/v1/tenants')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(tenantData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Tenant created successfully');
      expect(response.body.data.name).toBe(tenantData.name);
      expect(response.body.data.address).toBe(tenantData.address);
      expect(response.body.data.phone).toBe(tenantData.phone);
      expect(response.body.data.email).toBe(tenantData.email);
    });

    it('should not create a tenant with admin token', async () => {
      const tenantData = {
        name: 'New Gym',
        domain: 'newgym',
        address: '456 New St',
        phone: '0987654321',
        email: 'new@gym.com'
      };

      const response = await request(app)
        .post('/api/v1/tenants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(tenantData)
        .expect(403);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Forbidden: insufficient permissions');
    });

    it('should not create a tenant with user token', async () => {
      const tenantData = {
        name: 'New Gym',
        domain: 'newgym',
        address: '456 New St',
        phone: '0987654321',
        email: 'new@gym.com'
      };

      const response = await request(app)
        .post('/api/v1/tenants')
        .set('Authorization', `Bearer ${userToken}`)
        .send(tenantData)
        .expect(403);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Forbidden: insufficient permissions');
    });

    it('should not create a tenant without authentication', async () => {
      const tenantData = {
        name: 'New Gym',
        domain: 'newgym',
        address: '456 New St',
        phone: '0987654321',
        email: 'new@gym.com'
      };

      const response = await request(app)
        .post('/api/v1/tenants')
        .send(tenantData)
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Access denied. No token provided.');
    });

    it('should not create a tenant with invalid data', async () => {
      const tenantData = {
        address: '456 New St',
        phone: '0987654321'
        // Missing name and email
      };

      const response = await request(app)
        .post('/api/v1/tenants')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(tenantData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('required');
    });
  });

  describe('GET /api/tenants', () => {
    it('should get all tenants with superadmin token', async () => {
      const response = await request(app)
        .get('/api/v1/tenants')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe(tenant.name);
    });

    it('should not get tenants with admin token', async () => {
      const response = await request(app)
        .get('/api/v1/tenants')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Forbidden: insufficient permissions');
    });

    it('should not get tenants with user token', async () => {
      const response = await request(app)
        .get('/api/v1/tenants')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Forbidden: insufficient permissions');
    });
  });

  describe('GET /api/tenants/:id', () => {
    it('should get tenant by id with superadmin token', async () => {
      const response = await request(app)
        .get(`/api/v1/tenants/${tenant.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.id).toBe(tenant.id);
      expect(response.body.data.name).toBe(tenant.name);
    });

    it('should get own tenant by id with admin token', async () => {
      const response = await request(app)
        .get(`/api/v1/tenants/${tenant.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.id).toBe(tenant.id);
      expect(response.body.data.name).toBe(tenant.name);
    });

    it('should get own tenant by id with user token', async () => {
      const response = await request(app)
        .get(`/api/v1/tenants/${tenant.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.id).toBe(tenant.id);
      expect(response.body.data.name).toBe(tenant.name);
    });

    it('should not get tenant by id from another tenant with admin token', async () => {
      // Create another tenant
      const anotherTenant = await Tenant.create({
        name: 'Another Gym',
        domain: 'anothergym',
        address: '789 Another St',
        phone: '5555555555',
        email: 'another@gym.com'
      });

      const response = await request(app)
        .get(`/api/v1/tenants/${anotherTenant.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Forbidden: you can only access your own tenant data');
    });

    it('should not get tenant by id from another tenant with user token', async () => {
      // Create another tenant
      const anotherTenant = await Tenant.create({
        name: 'Another Gym',
        domain: 'anothergym',
        address: '789 Another St',
        phone: '5555555555',
        email: 'another@gym.com'
      });

      const response = await request(app)
        .get(`/api/v1/tenants/${anotherTenant.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Forbidden: you can only access your own tenant data');
    });

    it('should return 404 for non-existent tenant', async () => {
      const response = await request(app)
        .get('/api/v1/tenants/999999')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(404);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Tenant not found');
    });
  });

  describe('PUT /api/tenants/:id', () => {
    it('should update tenant with superadmin token', async () => {
      const updateData = {
        name: 'Updated Gym',
        address: 'Updated Address',
        phone: '9999999999',
        email: 'updated@gym.com'
      };

      const response = await request(app)
        .put(`/api/v1/tenants/${tenant.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Tenant updated successfully');
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.address).toBe(updateData.address);
      expect(response.body.data.phone).toBe(updateData.phone);
      expect(response.body.data.email).toBe(updateData.email);
    });

    it('should update own tenant with admin token', async () => {
      const updateData = {
        name: 'Updated Gym',
        address: 'Updated Address',
        phone: '9999999999',
        email: 'updated@gym.com'
      };

      const response = await request(app)
        .put(`/api/v1/tenants/${tenant.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Tenant updated successfully');
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.address).toBe(updateData.address);
      expect(response.body.data.phone).toBe(updateData.phone);
      expect(response.body.data.email).toBe(updateData.email);
    });

    it('should not update tenant with user token', async () => {
      const updateData = {
        name: 'Updated Gym',
        address: 'Updated Address',
        phone: '9999999999',
        email: 'updated@gym.com'
      };

      const response = await request(app)
        .put(`/api/v1/tenants/${tenant.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Forbidden: only admins can access tenant data');
    });

    it('should not update another tenant with admin token', async () => {
      // Create another tenant
      const anotherTenant = await Tenant.create({
        name: 'Another Gym',
        domain: 'anothergym',
        address: '789 Another St',
        phone: '5555555555',
        email: 'another@gym.com'
      });

      const updateData = {
        name: 'Updated Gym',
        address: 'Updated Address',
        phone: '9999999999',
        email: 'updated@gym.com'
      };

      const response = await request(app)
        .put(`/api/v1/tenants/${anotherTenant.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Forbidden: you can only access your own tenant data');
    });

    it('should not update tenant with invalid data', async () => {
      const updateData = {
        name: '' // Invalid name
      };

      const response = await request(app)
        .put(`/api/v1/tenants/${tenant.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('notNull');
    });
  });

  describe('DELETE /api/tenants/:id', () => {
    it('should delete tenant with superadmin token', async () => {
      const response = await request(app)
        .delete(`/api/v1/tenants/${tenant.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Tenant deleted successfully');

      // Verify tenant is deleted
      const deletedTenant = await Tenant.findByPk(tenant.id);
      expect(deletedTenant).toBeNull();
    });

    it('should not delete tenant with admin token', async () => {
      const response = await request(app)
        .delete(`/api/v1/tenants/${tenant.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Forbidden: insufficient permissions');
    });

    it('should not delete tenant with user token', async () => {
      const response = await request(app)
        .delete(`/api/v1/tenants/${tenant.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Forbidden: insufficient permissions');
    });

    it('should return 404 for non-existent tenant', async () => {
      const response = await request(app)
        .delete('/api/v1/tenants/999999')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(404);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Tenant not found');
    });
  });
});