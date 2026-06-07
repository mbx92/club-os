'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('PsychologyPackageItems', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      packageId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'PsychologyPackages',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      testTypeId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'PsychologyTestTypes',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      sortOrder: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Order of test execution in bundle'
      },
      isRequired: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        comment: 'Whether this test is required in the package'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Indexes
    await queryInterface.addIndex('PsychologyPackageItems', ['packageId', 'testTypeId'], {
      unique: true,
      name: 'psychology_package_items_unique'
    });

    await queryInterface.addIndex('PsychologyPackageItems', ['packageId', 'sortOrder'], {
      name: 'psychology_package_items_sort'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('PsychologyPackageItems');
  }
};
