const { Member, Tenant, Membership, MembershipType } = require('../../src/models');

describe('Member Model', () => {
  let tenant, membershipType, membership;

  beforeEach(async () => {
    // Create a tenant for testing
    tenant = await Tenant.create({
      name: 'Test Gym',
      domain: 'testgym',
      address: '123 Test St',
      phone: '1234567890',
      email: 'test@gym.com'
    });

    // Create a membership type for testing
    membershipType = await MembershipType.create({
      name: 'Monthly',
      description: 'Monthly membership',
      price: 50000,
      duration: 30,
      tenantId: tenant.id
    });

    // Create a member first for the membership
    const member = await Member.create({
      firstName: 'Test',
      lastName: 'Member',
      email: 'testmember@example.com',
      phone: '1234567890',
      address: '123 Member St',
      dateOfBirth: new Date('1990-01-01'),
      gender: 'male',
      tenantId: tenant.id
    });

    // Create a membership for testing
    membership = await Membership.create({
      memberId: member.id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      price: 50000,
      status: 'active',
      membershipTypeId: membershipType.id,
      tenantId: tenant.id
    });
  });

  describe('Member Creation', () => {
    it('should create a new member with valid data', async () => {
      const memberData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '1234567890',
        address: '123 Member St',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male',
        membershipId: membership.id,
        tenantId: tenant.id
      };

      const member = await Member.create(memberData);

      expect(member.name).toBe(`${memberData.firstName} ${memberData.lastName}`);
      expect(member.email).toBe(memberData.email);
      expect(member.phone).toBe(memberData.phone);
      expect(member.address).toBe(memberData.address);
      expect(member.dateOfBirth).toEqual(memberData.dateOfBirth);
      expect(member.gender).toBe(memberData.gender);
      expect(member.membershipId).toBe(membership.id);
      expect(member.tenantId).toBe(tenant.id);
    });

    it('should not create a member without required fields', async () => {
      const memberData = {
        email: 'john@example.com',
        phone: '1234567890'
        // Missing firstName, lastName, membershipId, tenantId
      };

      await expect(Member.create(memberData)).rejects.toThrow();
    });

    it('should not create a member with duplicate email in the same tenant', async () => {
      const memberData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'same@example.com',
        phone: '1234567890',
        address: '123 Member St',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male',
        membershipId: membership.id,
        tenantId: tenant.id
      };

      await Member.create(memberData);

      const memberData2 = {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'same@example.com', // Same email
        phone: '0987654321',
        address: '456 Member St',
        dateOfBirth: new Date('1995-01-01'),
        gender: 'female',
        membershipId: membership.id,
        tenantId: tenant.id
      };

      await expect(Member.create(memberData2)).rejects.toThrow();
    });

    it('should allow members with the same email in different tenants', async () => {
      // Create another tenant
      const tenant2 = await Tenant.create({
        name: 'Another Gym',
        domain: 'anothergym',
        address: '456 Another St',
        phone: '0987654321',
        email: 'another@gym.com'
      });

      // Create membership type for tenant2
      const membershipType2 = await MembershipType.create({
        name: 'Monthly',
        description: 'Monthly membership',
        price: 50000,
        duration: 30,
        tenantId: tenant2.id
      });

      // Create a member first for the membership in tenant2
      const tenant2Member = await Member.create({
        firstName: 'Test',
        lastName: 'Member 2',
        email: 'testmember2@example.com',
        phone: '1234567890',
        address: '123 Member St',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male',
        tenantId: tenant2.id
      });

      // Create membership for tenant2
      const membership2 = await Membership.create({
        memberId: tenant2Member.id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        price: 50000,
        status: 'active',
        membershipTypeId: membershipType2.id,
        tenantId: tenant2.id
      });

      // Create member in first tenant
      const memberData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'same@example.com',
        phone: '1234567890',
        address: '123 Member St',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male',
        membershipId: membership.id,
        tenantId: tenant.id
      };

      await Member.create(memberData);

      // Create member with same email but in different tenant
      const tenant2MemberData = {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'same@example.com', // Same email
        phone: '0987654321',
        address: '456 Member St',
        dateOfBirth: new Date('1995-01-01'),
        gender: 'female',
        membershipId: membership2.id,
        tenantId: tenant2.id
      };

      // This should not throw an error
      const tenant2MemberResult = await Member.create(tenant2MemberData);
      expect(tenant2MemberResult.email).toBe('same@example.com');
    });
  });

  describe('Member Associations', () => {
    it('should belong to a tenant', async () => {
      const memberData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '1234567890',
        address: '123 Member St',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male',
        membershipId: membership.id,
        tenantId: tenant.id
      };

      const member = await Member.create(memberData);
      const memberWithTenant = await Member.findByPk(member.id, {
        include: [{ model: Tenant, as: 'tenant' }]
      });

      expect(memberWithTenant.tenant.name).toBe(tenant.name);
    });

    it('should belong to a membership', async () => {
      const memberData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '1234567890',
        address: '123 Member St',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male',
        membershipId: membership.id,
        tenantId: tenant.id
      };

      const member = await Member.create(memberData);
      const memberWithMembership = await Member.findByPk(member.id, {
        include: [{ model: Membership, as: 'membership' }]
      });

      expect(memberWithMembership.membership.id).toBe(membership.id);
    });
  });
});