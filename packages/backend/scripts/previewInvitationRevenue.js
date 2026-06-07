/**
 * Preview Invitation Order Revenue Impact
 * 
 * Shows what would happen if we recalculate invitation order revenue
 * WITHOUT actually updating the database.
 * 
 * Run: node scripts/previewInvitationRevenue.js
 */

const db = require('../src/models');
const { Op } = require('sequelize');

async function previewInvitationRevenue() {
  console.log('Preview: Invitation Order Revenue Recalculation\n');
  console.log('This is a DRY RUN - no database changes will be made.\n');

  try {
    await db.sequelize.authenticate();
    console.log('✓ Database connected\n');

    // Current revenue (existing calculation)
    const currentRevenue = await db.PsychologyOrder.sum('finalAmount', {
      where: {
        status: { [Op.in]: ['paid', 'in_progress', 'completed', 'verified'] }
      }
    }) || 0;

    // Find invitation orders with finalAmount = 0
    const invitationOrders = await db.PsychologyOrder.findAll({
      where: {
        finalAmount: 0,
        baseAmount: { [Op.gt]: 0 },
        invitationId: { [Op.ne]: null }
      },
      attributes: ['id', 'orderNumber', 'status', 'baseAmount', 'discountAmount', 'finalAmount', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });

    // Separate completed orders (will be counted) from outstanding orders
    const completedOrders = invitationOrders.filter(o => o.status === 'completed');
    const outstandingOrders = invitationOrders.filter(o => ['paid', 'in_progress', 'verified'].includes(o.status));
    
    // Calculate potential new revenue (only from completed orders)
    const potentialRevenue = completedOrders.reduce((sum, order) => {
      return sum + parseFloat(order.baseAmount);
    }, 0);
    
    // Calculate outstanding value (not counted yet)
    const outstandingValue = outstandingOrders.reduce((sum, order) => {
      return sum + parseFloat(order.baseAmount);
    }, 0);

    const newTotalRevenue = parseFloat(currentRevenue) + potentialRevenue;

    console.log('═'.repeat(80));
    console.log('CURRENT STATE');
    console.log('═'.repeat(80));
    console.log(`Current Revenue: Rp ${parseFloat(currentRevenue).toLocaleString('id-ID')}`);
    console.log(`Invitation Orders (finalAmount=0): ${invitationOrders.length}`);
    console.log(`  - Completed: ${completedOrders.length} orders`);
    console.log(`  - Outstanding: ${outstandingOrders.length} orders`);
    console.log();

    console.log('═'.repeat(80));
    console.log('AFTER RECALCULATION');
    console.log('═'.repeat(80));
    console.log(`New Revenue (completed only): Rp ${newTotalRevenue.toLocaleString('id-ID')}`);
    console.log(`Revenue Increase: Rp ${potentialRevenue.toLocaleString('id-ID')} (+${potentialRevenue > 0 ? ((potentialRevenue / (currentRevenue || 1)) * 100).toFixed(1) : 0}%)`);
    console.log();
    console.log(`Outstanding Value (not counted): Rp ${outstandingValue.toLocaleString('id-ID')}`);
    console.log(`  Note: Outstanding orders (paid/in_progress) will count when status changes to completed`);
    console.log();

    // Breakdown by status
    const byStatus = invitationOrders.reduce((acc, order) => {
      const status = order.status;
      if (!acc[status]) {
        acc[status] = { count: 0, amount: 0 };
      }
      acc[status].count++;
      acc[status].amount += parseFloat(order.baseAmount);
      return acc;
    }, {});

    console.log('Breakdown by Order Status:');
    console.log('─'.repeat(80));
    console.log('Status'.padEnd(20), '| Count'.padEnd(10), '| Total Value'.padEnd(20), '| Revenue Impact');
    console.log('─'.repeat(80));
    
    Object.entries(byStatus).forEach(([status, data]) => {
      const isCompleted = status === 'completed';
      const isOutstanding = ['paid', 'in_progress', 'verified'].includes(status);
      let impact = '';
      if (isCompleted) impact = '✓ Counted';
      else if (isOutstanding) impact = '○ Outstanding';
      else impact = '✗ Not counted';
      
      console.log(
        status.padEnd(20),
        '|', data.count.toString().padStart(5),
        '|', `Rp ${data.amount.toLocaleString('id-ID')}`.padEnd(18),
        '|', impact
      );
    });
    console.log('─'.repeat(80));
    console.log('✓ = Will be counted in revenue');
    console.log('○ = Outstanding (will count when completed)');
    console.log('✗ = Will not be counted');
    console.log();

    // Show sample orders - completed first, then outstanding
    const ordersToShow = [...completedOrders.slice(0, 10), ...outstandingOrders.slice(0, 5)];
    
    console.log('Sample Orders:');
    console.log('─'.repeat(90));
    console.log('Order Number'.padEnd(20), '| Status'.padEnd(15), '| Current'.padEnd(15), '| After Update'.padEnd(15), '| Type');
    console.log('─'.repeat(90));
    
    ordersToShow.forEach(order => {
      const isCompleted = order.status === 'completed';
      const type = isCompleted ? '✓ Revenue' : '○ Outstanding';
      console.log(
        order.orderNumber.padEnd(20),
        '|', order.status.padEnd(13),
        '|', order.finalAmount.toString().padStart(12),
        '|', order.baseAmount.toString().padStart(12),
        '|', type
      );
    });
    
    if (invitationOrders.length > 15) {
      console.log(`... and ${invitationOrders.length - 15} more orders`);
    }
    console.log('─'.repeat(80));
    console.log();

    console.log('To apply these changes, run:');
    console.log('  node scripts/recalculateInvitationRevenue.js');
    console.log();

  } catch (error) {
    console.error('✗ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await db.sequelize.close();
    process.exit(0);
  }
}

// Run the preview
previewInvitationRevenue();
