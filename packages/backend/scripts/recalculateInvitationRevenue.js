/**
 * Recalculate Invitation Order Revenue
 * 
 * This script updates existing invitation-based orders to count their value in revenue.
 * Previously, invitation orders had finalAmount = 0 (100% discount).
 * Now we set finalAmount = baseAmount so they count in revenue tracking.
 * 
 * Run: node scripts/recalculateInvitationRevenue.js
 */

const db = require('../src/models');
const { Op } = require('sequelize');

async function recalculateInvitationRevenue() {
  console.log('Starting invitation order revenue recalculation...\n');

  try {
    await db.sequelize.authenticate();
    console.log('✓ Database connected\n');

    // Find all invitation-based orders with finalAmount = 0
    const allOrders = await db.PsychologyOrder.findAll({
      where: {
        finalAmount: 0,
        baseAmount: { [Op.gt]: 0 },
        invitationId: { [Op.ne]: null }  // Has invitationId (from invitation)
      },
      attributes: ['id', 'orderNumber', 'status', 'baseAmount', 'discountAmount', 'finalAmount', 'paymentMethod', 'invitationId'],
      order: [['createdAt', 'DESC']]
    });

    // Separate completed orders (to be updated) from outstanding orders (skip for now)
    const orders = allOrders.filter(o => o.status === 'completed');
    const outstandingOrders = allOrders.filter(o => ['paid', 'in_progress', 'verified'].includes(o.status));

    console.log(`Found ${allOrders.length} invitation orders with finalAmount = 0`);
    console.log(`  - Completed (will be updated): ${orders.length}`);
    console.log(`  - Outstanding (skipped): ${outstandingOrders.length}\n`);

    if (orders.length === 0) {
      console.log('No orders to update. Exiting.');
      process.exit(0);
    }

    // Show preview
    console.log('Preview of COMPLETED orders to be updated:');
    console.log('─'.repeat(100));
    console.log('Order Number'.padEnd(20), '| Status'.padEnd(15), '| Base Amount'.padEnd(15), '| Current Final'.padEnd(15), '| New Final');
    console.log('─'.repeat(100));
    
    orders.slice(0, 10).forEach(order => {
      console.log(
        order.orderNumber.padEnd(20),
        '|', order.status.padEnd(13),
        '|', order.baseAmount.toString().padStart(12),
        '|', order.finalAmount.toString().padStart(12),
        '|', order.baseAmount.toString().padStart(12)
      );
    });
    
    if (orders.length > 10) {
      console.log(`... and ${orders.length - 10} more`);
    }
    console.log('─'.repeat(100));
    
    if (outstandingOrders.length > 0) {
      console.log(`\nNote: ${outstandingOrders.length} outstanding orders (paid/in_progress) will be skipped.`);
      console.log('They will be counted in revenue once their status changes to completed.');
    }

    // Ask for confirmation
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      readline.question('\nProceed with update? (yes/no): ', resolve);
    });
    readline.close();

    if (answer.toLowerCase() !== 'yes') {
      console.log('\nUpdate cancelled.');
      process.exit(0);
    }

    console.log('\nStarting update...\n');

    // Update orders
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const order of orders) {
      try {
        const oldFinal = order.finalAmount;
        const newFinal = order.baseAmount;

        // Update order
        await order.update({
          discountAmount: 0,              // Remove discount
          finalAmount: newFinal,          // Set finalAmount = baseAmount
          metadata: {
            ...order.metadata,
            revenueRecalculated: true,
            recalculatedAt: new Date().toISOString(),
            oldFinalAmount: oldFinal,
            oldDiscountAmount: order.discountAmount
          }
        });

        successCount++;
        
        if (successCount % 10 === 0) {
          process.stdout.write(`\rProcessed: ${successCount}/${orders.length}`);
        }
      } catch (error) {
        errorCount++;
        errors.push({
          orderNumber: order.orderNumber,
          error: error.message
        });
      }
    }

    console.log(`\n\n✓ Update completed!`);
    console.log(`  Success: ${successCount}`);
    console.log(`  Errors: ${errorCount}`);

    if (errors.length > 0) {
      console.log('\nErrors encountered:');
      errors.forEach(err => {
        console.log(`  - ${err.orderNumber}: ${err.error}`);
      });
    }

    // Calculate total revenue change
    const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.baseAmount), 0);
    console.log(`\nTotal revenue added: Rp ${totalRevenue.toLocaleString('id-ID')}`);

    // Show summary by status
    const byStatus = orders.reduce((acc, order) => {
      const status = order.status;
      if (!acc[status]) {
        acc[status] = { count: 0, amount: 0 };
      }
      acc[status].count++;
      acc[status].amount += parseFloat(order.baseAmount);
      return acc;
    }, {});

    console.log('\nBreakdown by status:');
    Object.entries(byStatus).forEach(([status, data]) => {
      console.log(`  ${status}: ${data.count} orders, Rp ${data.amount.toLocaleString('id-ID')}`);
    });

  } catch (error) {
    console.error('\n✗ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await db.sequelize.close();
    console.log('\n✓ Database connection closed');
    process.exit(0);
  }
}

// Run the script
recalculateInvitationRevenue();
