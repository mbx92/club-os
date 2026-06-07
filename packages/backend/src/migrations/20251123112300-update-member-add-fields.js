'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add missing fields
    await queryInterface.addColumn('Members', 'photoUrl', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('Members', 'joinDate', {
      type: Sequelize.DATEONLY,
      allowNull: false,
      defaultValue: Sequelize.fn('NOW')
    });

    await queryInterface.addColumn('Members', 'deletedAt', {
      type: Sequelize.DATE,
      allowNull: true
    });

    // Add indexes for better query performance
    await queryInterface.addIndex('Members', ['tenantId'], {
      name: 'members_tenant_id_index'
    });

    await queryInterface.addIndex('Members', ['userId'], {
      name: 'members_user_id_index'
    });

    await queryInterface.addIndex('Members', ['email'], {
      name: 'members_email_index'
    });

    await queryInterface.addIndex('Members', ['phone'], {
      name: 'members_phone_index'
    });

    await queryInterface.addIndex('Members', ['membershipStatus'], {
      name: 'members_membership_status_index'
    });

    await queryInterface.addIndex('Members', ['isActive'], {
      name: 'members_is_active_index'
    });

    // Remove old unique constraint
    await queryInterface.removeConstraint('Members', 'members_email_tenant_unique');

    // Add new unique constraints that respect soft delete
    await queryInterface.addIndex('Members', ['tenantId', 'email'], {
      unique: true,
      name: 'members_tenant_email_unique',
      where: {
        deletedAt: null,
        email: {
          [Sequelize.Op.ne]: null
        }
      }
    });

    await queryInterface.addIndex('Members', ['tenantId', 'phone'], {
      unique: true,
      name: 'members_tenant_phone_unique',
      where: {
        deletedAt: null,
        phone: {
          [Sequelize.Op.ne]: null
        }
      }
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes
    await queryInterface.removeIndex('Members', 'members_tenant_phone_unique');
    await queryInterface.removeIndex('Members', 'members_tenant_email_unique');
    await queryInterface.removeIndex('Members', 'members_is_active_index');
    await queryInterface.removeIndex('Members', 'members_membership_status_index');
    await queryInterface.removeIndex('Members', 'members_phone_index');
    await queryInterface.removeIndex('Members', 'members_email_index');
    await queryInterface.removeIndex('Members', 'members_user_id_index');
    await queryInterface.removeIndex('Members', 'members_tenant_id_index');

    // Re-add old constraint
    await queryInterface.addConstraint('Members', {
      fields: ['email', 'tenantId'],
      type: 'unique',
      name: 'members_email_tenant_unique'
    });

    // Remove columns
    await queryInterface.removeColumn('Members', 'deletedAt');
    await queryInterface.removeColumn('Members', 'joinDate');
    await queryInterface.removeColumn('Members', 'photoUrl');
  }
};
