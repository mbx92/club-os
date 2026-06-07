#!/usr/bin/env node

/**
 * Debug Kitchen Ticket Notes Display
 * 
 * This script helps diagnose why notes might not appear on kitchen tickets:
 * 1. Check if notes are saved in TransactionItem
 * 2. Check kitchen template configuration
 * 3. Generate sample kitchen ticket to verify output
 * 
 * Usage: node scripts/debug-kitchen-notes.js <orderId>
 */

require('dotenv').config();
require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

const { 
  Transaction, 
  TransactionItem, 
  Product,
  Tenant,
  RestaurantTable,
  Location
} = require('../src/models');
const receiptPrinterService = require('../src/services/receiptPrinterService');

async function debugKitchenNotes(orderId) {
  try {
    console.log('🔍 Debugging Kitchen Ticket Notes');
    console.log('═══════════════════════════════════════\n');

    if (!orderId) {
      console.log('❌ Please provide orderId as argument');
      console.log('Usage: node scripts/debug-kitchen-notes.js <orderId>\n');
      process.exit(1);
    }

    // 1. Load order with items
    console.log(`📦 Loading order: ${orderId}\n`);
    
    const order = await Transaction.findByPk(orderId, {
      include: [
        { 
          model: TransactionItem, 
          as: 'items',
          include: [
            { model: Product, as: 'product' }
          ]
        },
        { model: RestaurantTable, as: 'table' },
        { model: Location, as: 'location' }
      ]
    });

    if (!order) {
      console.log(`❌ Order not found: ${orderId}\n`);
      process.exit(1);
    }

    console.log(`✅ Order found: ${order.transactionNumber}`);
    console.log(`   Type: ${order.orderType}`);
    console.log(`   Table: ${order.table?.tableNumber || 'N/A'}`);
    console.log(`   Customer: ${order.customerName || 'N/A'}`);
    console.log(`   Items: ${order.items?.length || 0}\n`);

    // 2. Check items and notes
    console.log('📋 Checking Items & Notes:');
    console.log('─────────────────────────────────────\n');

    let hasNotes = false;
    order.items.forEach((item, idx) => {
      console.log(`${idx + 1}. ${item.itemName}`);
      console.log(`   Quantity: ${item.quantity}`);
      console.log(`   Notes Field Exists: ${item.notes !== undefined ? 'YES' : 'NO'}`);
      console.log(`   Notes Value: ${item.notes ? `"${item.notes}"` : '(empty/null)'}`);
      console.log(`   Notes Length: ${item.notes?.length || 0} chars`);
      
      if (item.notes) {
        hasNotes = true;
        console.log(`   ✅ HAS NOTES`);
      } else {
        console.log(`   ⚠️  NO NOTES`);
      }
      console.log('');
    });

    if (!hasNotes) {
      console.log('⚠️  WARNING: No items have notes!\n');
      console.log('This could mean:');
      console.log('1. Notes were not included in the original order request');
      console.log('2. Notes were not saved to database\n');
    }

    // 3. Load tenant and check template
    console.log('🎨 Checking Kitchen Template Configuration:');
    console.log('─────────────────────────────────────\n');

    const tenant = await Tenant.findByPk(order.tenantId);
    
    if (!tenant) {
      console.log(`❌ Tenant not found: ${order.tenantId}\n`);
      process.exit(1);
    }

    const receiptTemplates = tenant.settings?.receiptTemplates;
    
    if (!receiptTemplates) {
      console.log('⚠️  No receiptTemplates in tenant.settings');
      console.log('Will use default hardcoded template\n');
    } else {
      console.log('✅ Tenant has receiptTemplates configuration');
      
      // Check if it's array or object
      if (Array.isArray(receiptTemplates)) {
        console.log(`   Format: Array with ${receiptTemplates.length} templates\n`);
        
        const kitchenTemplate = receiptTemplates.find(t => 
          t.templateType === 'kitchen' && t.isDefault
        );
        
        if (kitchenTemplate) {
          console.log('✅ Found default kitchen template:');
          console.log(`   Name: ${kitchenTemplate.name}`);
          console.log(`   showNotes: ${kitchenTemplate.body?.showNotes !== false ? 'TRUE ✅' : 'FALSE ❌'}`);
          console.log(`   showModifiers: ${kitchenTemplate.body?.showModifiers !== false ? 'TRUE' : 'FALSE'}`);
          console.log(`   showPrices: ${kitchenTemplate.body?.showPrices ? 'TRUE' : 'FALSE'}`);
        } else {
          console.log('⚠️  No default kitchen template found in array');
          console.log('   Will use hardcoded default template\n');
        }
      } else {
        console.log('   Format: Object (legacy format)');
        const kitchenTemplate = receiptTemplates.kitchen;
        
        if (kitchenTemplate) {
          console.log('✅ Found kitchen template:');
          console.log(`   showNotes: ${kitchenTemplate.body?.showNotes !== false ? 'TRUE ✅' : 'FALSE ❌'}`);
        } else {
          console.log('⚠️  No kitchen template in object\n');
        }
      }
    }
    console.log('');

    // 4. Generate sample kitchen ticket
    console.log('🖨️  Generating Sample Kitchen Ticket:');
    console.log('─────────────────────────────────────\n');

    try {
      // Get template
      let template;
      if (Array.isArray(receiptTemplates)) {
        template = receiptTemplates.find(t => t.templateType === 'kitchen' && t.isDefault);
      } else if (receiptTemplates?.kitchen) {
        template = receiptTemplates.kitchen;
      }
      
      if (!template) {
        console.log('Using default hardcoded template\n');
        template = {
          paperWidth: 48,
          header: { customHeaderText: '=== DAPUR ===', separatorChar: '=' },
          body: {
            orderLabel: 'Order', dateLabel: 'Waktu', typeLabel: 'Tipe',
            tableLabel: 'Meja', customerLabel: 'Atas Nama',
            showModifiers: true, showNotes: true, notesLabel: 'Catatan',
            showPrices: false,
            separatorChar: '-'
          },
          footer: { customFooterText: 'SEGERA PROSES!', autoCut: true }
        };
      }

      const ticketContent = receiptPrinterService.buildKitchenTicket(
        order,
        order.items,
        tenant,
        template
      );

      // Convert ESC/POS to readable format
      const readable = ticketContent
        .replace(/\x1b/g, '[ESC]')
        .replace(/\x1d/g, '[GS]')
        .replace(/\n/g, '\n')
        .replace(/\x00/g, '[NULL]');

      console.log('Generated Ticket Content:');
      console.log('═════════════════════════════════════');
      console.log(readable);
      console.log('═════════════════════════════════════\n');

      // Search for notes markers in content
      const hasNotesMarker = ticketContent.includes('>>') || ticketContent.includes('*');
      console.log(`Notes markers (>> or *) found in ticket: ${hasNotesMarker ? 'YES ✅' : 'NO ❌'}\n`);

      // Check each item's notes specifically
      console.log('Searching for item notes in generated content:');
      order.items.forEach((item, idx) => {
        if (item.notes) {
          const notesInContent = ticketContent.includes(item.notes);
          console.log(`${idx + 1}. "${item.notes}": ${notesInContent ? '✅ FOUND' : '❌ NOT FOUND'}`);
        }
      });
      console.log('');

    } catch (buildError) {
      console.log(`❌ Error building kitchen ticket: ${buildError.message}\n`);
      console.log(buildError.stack);
    }

    // 5. Summary
    console.log('📊 Summary:');
    console.log('─────────────────────────────────────');
    console.log(`Items with notes: ${order.items.filter(i => i.notes).length}/${order.items.length}`);
    
    // Safe template check
    let templateShowNotes = 'UNKNOWN';
    try {
      if (Array.isArray(receiptTemplates)) {
        const kitchenTpl = receiptTemplates.find(t => t.templateType === 'kitchen' && t.isDefault);
        templateShowNotes = kitchenTpl?.body?.showNotes !== false ? 'TRUE ✅' : 'FALSE ❌';
      } else if (receiptTemplates?.kitchen) {
        templateShowNotes = receiptTemplates.kitchen.body?.showNotes !== false ? 'TRUE ✅' : 'FALSE ❌';
      }
    } catch (e) {
      templateShowNotes = 'ERROR';
    }
    
    console.log(`Template showNotes: ${templateShowNotes}`);
    console.log('');

    if (!hasNotes) {
      console.log('🔧 RECOMMENDATION:');
      console.log('Add notes field when creating orders:');
      console.log('```json');
      console.log('{');
      console.log('  "items": [');
      console.log('    {');
      console.log('      "productId": "uuid",');
      console.log('      "quantity": 1,');
      console.log('      "notes": "Pedas level 3, tanpa bawang"  ← ADD THIS');
      console.log('    }');
      console.log('  ]');
      console.log('}');
      console.log('```\n');
    } else if (!template || template.body?.showNotes === false) {
      console.log('🔧 RECOMMENDATION:');
      console.log('Update kitchen template to enable showNotes:');
      console.log('1. Go to receipt template settings');
      console.log('2. Find "Kitchen Ticket" template');
      console.log('3. Ensure body.showNotes = true\n');
    } else {
      console.log('✅ Everything looks good! Notes should appear on kitchen tickets.\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run
const orderId = process.argv[2];
debugKitchenNotes(orderId)
  .then(() => {
    console.log('✅ Debug complete\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
