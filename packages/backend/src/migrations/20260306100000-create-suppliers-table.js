'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Suppliers', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      code: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Unique supplier code per tenant (e.g. SUP-001)'
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Supplier/vendor company or person name'
      },
      contactPerson: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Primary contact person name'
      },
      email: {
        type: Sequelize.STRING,
        allowNull: true
      },
      phone: {
        type: Sequelize.STRING(30),
        allowNull: true
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      city: {
        type: Sequelize.STRING,
        allowNull: true
      },
      province: {
        type: Sequelize.STRING,
        allowNull: true
      },
      postalCode: {
        type: Sequelize.STRING(10),
        allowNull: true
      },
      taxId: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'NPWP or tax identification number'
      },
      bankName: {
        type: Sequelize.STRING,
        allowNull: true
      },
      bankAccountNumber: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      bankAccountHolder: {
        type: Sequelize.STRING,
        allowNull: true
      },
      category: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Supplier category (e.g. food, equipment, cleaning, supplement)'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Indexes
    await queryInterface.addIndex('Suppliers', ['tenantId']);
    await queryInterface.addIndex('Suppliers', ['tenantId', 'name']);
    await queryInterface.addIndex('Suppliers', ['tenantId', 'code'], {
      unique: true,
      name: 'suppliers_tenant_code_unique',
      where: { code: { [Sequelize.Op.ne]: null } }
    });
    await queryInterface.addIndex('Suppliers', ['isActive']);
    await queryInterface.addIndex('Suppliers', ['category']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Suppliers');
  }
};
