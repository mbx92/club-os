'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Operators', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Nama operator yang tampil di layar kasir'
      },
      pin: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Bcrypt-hashed PIN 4-6 digit'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      permissions: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
        comment: 'Permission map: { discount, void, refund, openShift, closeShift, settings, financialReport }'
      },
      notes: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Catatan opsional (jabatan, dll)'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    await queryInterface.addIndex('Operators', ['tenantId']);
    await queryInterface.addIndex('Operators', ['tenantId', 'isActive']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Operators');
  }
};
