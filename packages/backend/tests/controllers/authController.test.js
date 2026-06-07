const request = require('supertest');
const app = require('../../src/app');
const { User, Role, Tenant } = require('../../src/models');
const jwt = require('jsonwebtoken');

describe('Auth Controller', () => {
  let role, tenant;

  beforeEach(async () => {
    // Create a role for testing
    role = await Role.create({
      name: 'admin',
      description: 'Administrator role'
    });

    // Create a tenant for testing
    tenant = await Tenant.create({
      name: 'Test Gym',
      domain: 'testgym',
      address: '123 Test St',
      phone: '1234567890',
      email: 'test@gym.com'
    });
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user with valid data', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123',
        roleId: role.id,
        tenantId: tenant.id
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(`${userData.firstName} ${userData.lastName}`);
      expect(response.body.data.email).toBe(userData.email);
      expect(response.body.data.roleId).toBe(role.id);
      expect(response.body.data.tenantId).toBe(tenant.id);
      expect(response.body.data).not.toHaveProperty('password');
    });

    it('should not register a user with invalid data', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        // Missing email, password, roleId, tenantId
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('required');
    });

    it('should not register a user with duplicate email', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'same@example.com',
        password: 'password123',
        roleId: role.id,
        tenantId: tenant.id
      };

      // Create first user
      await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      // Try to create second user with same email
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Email already in use');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a user for testing login
      await User.create({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123',
        roleId: role.id,
        tenantId: tenant.id
      });
    });

    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'john@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Login successful');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.email).toBe(loginData.email);
      expect(response.body.data.user).not.toHaveProperty('password');

      // Verify token
      const decodedToken = jwt.verify(response.body.data.token, process.env.JWT_SECRET);
      expect(decodedToken.id).toBe(response.body.data.user.id);
    });

    it('should not login with invalid email', async () => {
      const loginData = {
        email: 'invalid@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should not login with invalid password', async () => {
      const loginData = {
        email: 'john@example.com',
        password: 'invalidpassword'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should not login without credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({})
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('required');
    });
  });

  describe('POST /api/auth/login - Superadmin', () => {
    let superAdminRole;

    beforeEach(async () => {
      // Create a superadmin role for testing
      superAdminRole = await Role.create({
        name: 'admin',
        description: 'Super Administrator role'
      });

      // Create a superadmin user for testing
      await User.create({
        firstName: 'Super',
        lastName: 'Admin',
        email: 'superadmin@gym-system.com',
        password: 'superadmin123',
        roleId: superAdminRole.id,
        tenantId: null, // Superadmin has no tenant
        isSuperAdmin: true
      });
    });

    it('should login superadmin with valid credentials', async () => {
      const loginData = {
        email: 'superadmin@gym-system.com',
        password: 'superadmin123'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(loginData.email);
      expect(response.body.user.role).toBe('admin');
      expect(response.body.user.isSuperAdmin).toBe(true);
      expect(response.body.user.tenant).toBeNull(); // Superadmin should have null tenant
    });
  });

  describe('GET /api/auth/profile', () => {
    let token, user;

    beforeEach(async () => {
      // Create a user for testing
      user = await User.create({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123',
        roleId: role.id,
        tenantId: tenant.id
      });

      // Generate token
      token = user.generateJWT();
    });

    it('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.id).toBe(user.id);
      expect(response.body.data.name).toBe(user.name);
      expect(response.body.data.email).toBe(user.email);
      expect(response.body.data).not.toHaveProperty('password');
    });

    it('should not get user profile without token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Access denied. No token provided.');
    });

    it('should not get user profile with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer invalidtoken')
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Invalid token');
    });
  });
});