'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('TrainerCommissions', {
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
      trainerId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Trainers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      transactionId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Transactions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      classId: {
        type: Sequelize.UUID,
        allowNull: true
        // Note: Foreign key to Classes will be added when Class module is implemented
      },
      baseAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      commissionType: {
        type: Sequelize.ENUM('percentage', 'fixed'),
        allowNull: false
      },
      commissionRate: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      commissionAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('pending', 'paid', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending'
      },
      paidAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      paymentMethod: {
        type: Sequelize.STRING,
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Indexes
    await queryInterface.addIndex('TrainerCommissions', ['tenantId']);
    await queryInterface.addIndex('TrainerCommissions', ['trainerId']);
    await queryInterface.addIndex('TrainerCommissions', ['transactionId']);
    await queryInterface.addIndex('TrainerCommissions', ['classId']);
    await queryInterface.addIndex('TrainerCommissions', ['status']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('TrainerCommissions');
  }
};
