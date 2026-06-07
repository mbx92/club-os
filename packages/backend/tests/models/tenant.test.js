const { Tenant, User, Role } = require('../../src/models');

describe('Tenant Model', () => {
  let role;

  beforeEach(async () => {
    // Create a role for testing
    role = await Role.create({
      name: 'admin',
      description: 'Administrator role'
    });
  });

  describe('Tenant Creation', () => {
    it('should create a new tenant with valid data', async () => {
      const tenantData = {
        name: 'Test Gym',
        domain: 'testgym',
        address: '123 Test St',
        phone: '1234567890',
        email: 'test@gym.com'
      };

      const tenant = await Tenant.create(tenantData);

      expect(tenant.name).toBe(tenantData.name);
      expect(tenant.address).toBe(tenantData.address);
      expect(tenant.phone).toBe(tenantData.phone);
      expect(tenant.email).toBe(tenantData.email);
    });

    it('should not create a tenant without required fields', async () => {
      const tenantData = {
        address: '123 Test St',
        phone: '1234567890'
        // Missing name and email
      };

      await expect(Tenant.create(tenantData)).rejects.toThrow();
    });

    it('should not create a tenant with duplicate name', async () => {
      const tenantData = {
        name: 'Same Gym',
        domain: 'samegym',
        address: '123 Test St',
        phone: '1234567890',
        email: 'test@gym.com'
      };

      await Tenant.create(tenantData);

      const tenantData2 = {
        name: 'Same Gym', // Same name
        domain: 'samegym2',
        address: '456 Different St',
        phone: '0987654321',
        email: 'test2@gym.com'
      };

      await expect(Tenant.create(tenantData2)).rejects.toThrow();
    });
  });

  describe('Tenant Associations', () => {
    it('should have many users', async () => {
      const tenant = await Tenant.create({
        name: 'Test Gym',
        domain: 'testgym',
        address: '123 Test St',
        phone: '1234567890',
        email: 'test@gym.com'
      });

      // Create users for this tenant
      await User.create({
        firstName: 'User',
        lastName: '1',
        email: 'user1@example.com',
        password: 'password123',
        roleId: role.id,
        tenantId: tenant.id
      });

      await User.create({
        firstName: 'User',
        lastName: '2',
        email: 'user2@example.com',
        password: 'password123',
        roleId: role.id,
        tenantId: tenant.id
      });

      const tenantWithUsers = await Tenant.findByPk(tenant.id, {
        include: [{ model: User, as: 'users' }]
      });

      expect(tenantWithUsers.users).toHaveLength(2);
      expect(tenantWithUsers.users[0].name).toBe('User 1');
      expect(tenantWithUsers.users[1].name).toBe('User 2');
    });
  });
});