const { User, Role, Tenant } = require('../../src/models');

describe('User Model', () => {
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

  describe('User Creation', () => {
    it('should create a new user with valid data', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123',
        roleId: role.id,
        tenantId: tenant.id
      };

      const user = await User.create(userData);

      expect(user.name).toBe(`${userData.firstName} ${userData.lastName}`);
      expect(user.email).toBe(userData.email);
      expect(user.roleId).toBe(role.id);
      expect(user.tenantId).toBe(tenant.id);
      expect(user.isSuperAdmin).toBe(false);
    });

    it('should create a superadmin user', async () => {
      const userData = {
        firstName: 'Super',
        lastName: 'Admin',
        email: 'superadmin@example.com',
        password: 'password123',
        isSuperAdmin: true,
        roleId: role.id
      };

      const user = await User.create(userData);

      expect(user.name).toBe(`${userData.firstName} ${userData.lastName}`);
      expect(user.email).toBe(userData.email);
      expect(user.isSuperAdmin).toBe(true);
    });

    it('should not create a user without required fields', async () => {
      const userData = {
        firstName: 'Incomplete',
        lastName: 'User'
        // Missing email, password, roleId, tenantId
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should not create a user with duplicate email', async () => {
      const userData = {
        firstName: 'User',
        lastName: '1',
        email: 'same@example.com',
        password: 'password123',
        roleId: role.id,
        tenantId: tenant.id
      };

      await User.create(userData);

      const userData2 = {
        firstName: 'User',
        lastName: '2',
        email: 'same@example.com', // Same email
        password: 'password123',
        roleId: role.id,
        tenantId: tenant.id
      };

      await expect(User.create(userData2)).rejects.toThrow();
    });
  });

  describe('User Associations', () => {
    it('should belong to a role', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123',
        roleId: role.id,
        tenantId: tenant.id
      };

      const user = await User.create(userData);
      const userWithRole = await User.findByPk(user.id, {
        include: [{ model: Role, as: 'role' }]
      });

      expect(userWithRole.role.name).toBe(role.name);
    });

    it('should belong to a tenant', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123',
        roleId: role.id,
        tenantId: tenant.id
      };

      const user = await User.create(userData);
      const userWithTenant = await User.findByPk(user.id, {
        include: [{ model: Tenant, as: 'tenant' }]
      });

      expect(userWithTenant.tenant.name).toBe(tenant.name);
    });
  });

  describe('User Instance Methods', () => {
    it('should validate password correctly', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123',
        roleId: role.id,
        tenantId: tenant.id
      };

      const user = await User.create(userData);
      
      // Test correct password
      const isValid = await user.validatePassword('password123');
      expect(isValid).toBe(true);
      
      // Test incorrect password
      const isInvalid = await user.validatePassword('wrongpassword');
      expect(isInvalid).toBe(false);
    });

    it('should generate JWT token', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123',
        roleId: role.id,
        tenantId: tenant.id
      };

      const user = await User.create(userData);
      const token = user.generateJWT();
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });
  });
});