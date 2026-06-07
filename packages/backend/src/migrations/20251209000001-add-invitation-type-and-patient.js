'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add invitationType column
    await queryInterface.addColumn('PsychologyInvitations', 'invitationType', {
      type: Sequelize.ENUM('open_registration', 'single_patient'),
      allowNull: false,
      defaultValue: 'open_registration'
    });

    // Add patientId column (nullable, only for single_patient type)
    await queryInterface.addColumn('PsychologyInvitations', 'patientId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'Patients',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // Add index for patientId
    await queryInterface.addIndex('PsychologyInvitations', ['patientId'], {
      name: 'psychology_invitations_patient_id'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove index
    await queryInterface.removeIndex('PsychologyInvitations', 'psychology_invitations_patient_id');
    
    // Remove columns
    await queryInterface.removeColumn('PsychologyInvitations', 'patientId');
    await queryInterface.removeColumn('PsychologyInvitations', 'invitationType');
    
    // Drop enum type
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_PsychologyInvitations_invitationType";');
  }
};
