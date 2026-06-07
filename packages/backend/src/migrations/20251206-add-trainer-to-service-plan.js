'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('ServicePlans', 'trainerId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'Trainers',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Optional default trainer for this service plan (mainly for PT packages)'
    });

    // Add index for better query performance
    await queryInterface.addIndex('ServicePlans', ['trainerId'], {
      name: 'serviceplans_trainerid_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('ServicePlans', 'serviceplans_trainerid_idx');
    await queryInterface.removeColumn('ServicePlans', 'trainerId');
  }
};
