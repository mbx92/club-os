'use strict';

const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

function generateQR(tenantId, tableNumber) {
    return crypto.createHash('sha256')
        .update(`${tenantId}-${tableNumber}-seed`)
        .digest('hex')
        .substring(0, 16)
        .toUpperCase();
}

module.exports = {
    async up(queryInterface) {
        // Ambil tenant
        const tenants = await queryInterface.sequelize.query(
            `SELECT id, name FROM "Tenants";`
        );
        const tenantA = tenants[0].find(t => t.name === 'Tenant A');
        const tenantB = tenants[0].find(t => t.name === 'Tenant B');

        // Ambil locations
        const locations = await queryInterface.sequelize.query(
            `SELECT id, "tenantId", code FROM "Locations";`
        );

        const locMainA = locations[0].find(l => l.code === 'GF-MAIN');
        const locBranchA = locations[0].find(l => l.code === 'GF-KG');
        const locMainB = locations[0].find(l => l.code === 'FZ-MAIN');

        const tables = [
            // ── Tenant A – GymFit Pusat (6 meja) ─────────
            { tenantId: tenantA.id, locationId: locMainA.id, tableNumber: 'T1', tableName: 'Meja Depan 1', capacity: 2, shape: 'square' },
            { tenantId: tenantA.id, locationId: locMainA.id, tableNumber: 'T2', tableName: 'Meja Depan 2', capacity: 2, shape: 'square' },
            { tenantId: tenantA.id, locationId: locMainA.id, tableNumber: 'T3', tableName: 'Meja Tengah 1', capacity: 4, shape: 'rectangle' },
            { tenantId: tenantA.id, locationId: locMainA.id, tableNumber: 'T4', tableName: 'Meja Tengah 2', capacity: 4, shape: 'rectangle' },
            { tenantId: tenantA.id, locationId: locMainA.id, tableNumber: 'T5', tableName: 'VIP Corner', capacity: 6, shape: 'rectangle' },
            { tenantId: tenantA.id, locationId: locMainA.id, tableNumber: 'T6', tableName: 'Outdoor 1', capacity: 4, shape: 'circle' },

            // ── Tenant A – Cabang Kelapa Gading (4 meja) ──
            { tenantId: tenantA.id, locationId: locBranchA.id, tableNumber: 'KG1', tableName: 'Meja 1', capacity: 2, shape: 'square' },
            { tenantId: tenantA.id, locationId: locBranchA.id, tableNumber: 'KG2', tableName: 'Meja 2', capacity: 4, shape: 'rectangle' },
            { tenantId: tenantA.id, locationId: locBranchA.id, tableNumber: 'KG3', tableName: 'Meja 3', capacity: 4, shape: 'rectangle' },
            { tenantId: tenantA.id, locationId: locBranchA.id, tableNumber: 'KG4', tableName: 'VIP Lounge', capacity: 8, shape: 'rectangle' },

            // ── Tenant B – FitZone Main (4 meja) ──────────
            { tenantId: tenantB.id, locationId: locMainB.id, tableNumber: 'FZ1', tableName: 'Table 1', capacity: 2, shape: 'square' },
            { tenantId: tenantB.id, locationId: locMainB.id, tableNumber: 'FZ2', tableName: 'Table 2', capacity: 4, shape: 'rectangle' },
            { tenantId: tenantB.id, locationId: locMainB.id, tableNumber: 'FZ3', tableName: 'Table 3', capacity: 4, shape: 'rectangle' },
            { tenantId: tenantB.id, locationId: locMainB.id, tableNumber: 'FZ4', tableName: 'Family Table', capacity: 8, shape: 'rectangle' },
        ];

        const rows = tables.map(t => ({
            id: uuidv4(),
            tenantId: t.tenantId,
            locationId: t.locationId,
            tableNumber: t.tableNumber,
            tableName: t.tableName,
            capacity: t.capacity,
            positionX: null,
            positionY: null,
            width: null,
            height: null,
            shape: t.shape,
            status: 'available',
            currentOrderId: null,
            occupiedAt: null,
            occupiedBy: null,
            qrCode: generateQR(t.tenantId, t.tableNumber),
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        }));

        await queryInterface.bulkInsert('RestaurantTables', rows);
        console.log(`✅ ${rows.length} demo restaurant tables seeded`);
    },

    async down(queryInterface) {
        await queryInterface.bulkDelete('RestaurantTables', null, {});
    }
};
