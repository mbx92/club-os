'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if column already exists
    const columnExists = await queryInterface.sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'PsychologyOrders'
        AND column_name = 'invitationId'
      );
    `);
    
    if (columnExists[0][0].exists) {
      console.log('⏭️  Column invitationId already exists in PsychologyOrders, skipping...');
    } else {
      // Add invitationId column to PsychologyOrders
      await queryInterface.addColumn('PsychologyOrders', 'invitationId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'PsychologyInvitations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Reference to invitation if order was created via invitation link'
      });
    }

    // Add index for faster lookup of orders by invitation (IF NOT EXISTS)
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS psychology_orders_invitation_id 
      ON "PsychologyOrders" ("invitationId");
    `);
  },

  async down(queryInterface, Sequelize) {
    // Remove index first
    await queryInterface.removeIndex('PsychologyOrders', 'psychology_orders_invitation_id');
    
    // Remove column
    await queryInterface.removeColumn('PsychologyOrders', 'invitationId');
  }
};
