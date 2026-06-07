'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Trainers', {
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
        onDelete: 'CASCADE'
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      firstName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      lastName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      email: {
        type: Sequelize.STRING,
        allowNull: true,
        validate: {
          isEmail: true
        }
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: true
      },
      dateOfBirth: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      gender: {
        type: Sequelize.ENUM('male', 'female', 'other'),
        allowNull: true
      },
      specializations: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: []
      },
      certifications: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: []
      },
      bio: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      photoUrl: {
        type: Sequelize.STRING,
        allowNull: true
      },
      commissionType: {
        type: Sequelize.ENUM('percentage', 'fixed'),
        allowNull: false,
        defaultValue: 'percentage'
      },
      commissionValue: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      commissionNotes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      availability: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {}
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      hireDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Indexes
    await queryInterface.addIndex('Trainers', ['tenantId']);
    await queryInterface.addIndex('Trainers', ['userId']);
    await queryInterface.addIndex('Trainers', ['email']);
    await queryInterface.addIndex('Trainers', ['phone']);
    await queryInterface.addIndex('Trainers', ['tenantId', 'email'], {
      unique: true,
      where: { deletedAt: null },
      name: 'trainers_tenant_email_unique'
    });
    await queryInterface.addIndex('Trainers', ['tenantId', 'phone'], {
      unique: true,
      where: { deletedAt: null },
      name: 'trainers_tenant_phone_unique'
    });
    await queryInterface.addIndex('Trainers', ['isActive']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Trainers');
  }
};
