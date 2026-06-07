'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Expenses', 'supplierId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'Suppliers',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Optional link to a supplier/vendor record',
    });

    await queryInterface.addIndex('Expenses', ['supplierId'], {
      name: 'expenses_supplier_id_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('Expenses', 'expenses_supplier_id_idx');
    await queryInterface.removeColumn('Expenses', 'supplierId');
  },
};
