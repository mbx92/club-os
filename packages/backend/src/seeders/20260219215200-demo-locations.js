'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
    async up(queryInterface) {
        // Ambil tenant
        const tenants = await queryInterface.sequelize.query(
            `SELECT id, name FROM "Tenants";`
        );

        const tenantA = tenants[0].find(t => t.name === 'Tenant A');
        const tenantB = tenants[0].find(t => t.name === 'Tenant B');

        await queryInterface.bulkInsert('Locations', [
            // ── Tenant A ──────────────────────────────────
            {
                id: uuidv4(),
                tenantId: tenantA.id,
                name: 'GymFit Pusat',
                code: 'GF-MAIN',
                address: 'Jl. Sudirman No. 123',
                city: 'Jakarta Selatan',
                province: 'DKI Jakarta',
                postalCode: '12190',
                country: 'Indonesia',
                phone: '+6221-5551234',
                email: 'pusat@gymfit.id',
                locationType: 'main',
                latitude: -6.22750000,
                longitude: 106.80280000,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id: uuidv4(),
                tenantId: tenantA.id,
                name: 'GymFit Cabang Kelapa Gading',
                code: 'GF-KG',
                address: 'Jl. Boulevard Raya Blok A No. 10',
                city: 'Jakarta Utara',
                province: 'DKI Jakarta',
                postalCode: '14240',
                country: 'Indonesia',
                phone: '+6221-5559876',
                email: 'kelapagading@gymfit.id',
                locationType: 'branch',
                latitude: -6.15890000,
                longitude: 106.90870000,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            },

            // ── Tenant B ──────────────────────────────────
            {
                id: uuidv4(),
                tenantId: tenantB.id,
                name: 'FitZone Main',
                code: 'FZ-MAIN',
                address: 'Jl. Gatot Subroto No. 45',
                city: 'Bandung',
                province: 'Jawa Barat',
                postalCode: '40263',
                country: 'Indonesia',
                phone: '+6222-7331234',
                email: 'main@fitzone.id',
                locationType: 'main',
                latitude: -6.91460000,
                longitude: 107.60960000,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ]);

        console.log('✅ Demo locations seeded');
    },

    async down(queryInterface) {
        await queryInterface.bulkDelete('Locations', null, {});
    }
};
