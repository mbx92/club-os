'use strict';

/**
 * Psychology Invitations Seeder
 * 
 * Seeds sample invitations that allow public registration for tests.
 * Demonstrates the invitation flow and customizable fields.
 * 
 * Invitation types:
 * - link: Accessible via URL with invitation code
 * - qrcode: Same as link, but intended to be shared via QR code
 * 
 * Access control:
 * - maxUses: Maximum number of registrations (null = unlimited)
 * - expiresAt: When the invitation expires
 * - isActive: Enable/disable the invitation
 */

const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    // Get first tenant
    const [tenants] = await queryInterface.sequelize.query(
      `SELECT id, name FROM "Tenants" LIMIT 1`
    );
    
    if (tenants.length === 0) {
      console.log('No tenant found, skipping psychology invitations seeder');
      return;
    }
    
    const tenantId = tenants[0].id;

    // Get a package
    const [packages] = await queryInterface.sequelize.query(
      `SELECT id, name FROM "PsychologyPackages" WHERE "tenantId" = :tenantId LIMIT 1`,
      { replacements: { tenantId } }
    );

    if (packages.length === 0) {
      console.log('No packages found, run packages seeder first');
      return;
    }

    const packageId = packages[0].id;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    // Check if invitations already exist
    const [existingInvitations] = await queryInterface.sequelize.query(
      `SELECT code FROM "PsychologyInvitations" WHERE "tenantId" = :tenantId`,
      { replacements: { tenantId } }
    );
    
    const existingCodes = existingInvitations.map(i => i.code);
    const invitationsToInsert = [];

    // Invitation 1: Open recruitment
    if (!existingCodes.includes('RECRUIT2024')) {
      invitationsToInsert.push({
        id: uuidv4(),
        tenantId,
        packageId,
        code: 'RECRUIT2024',
        name: 'Rekrutmen Batch 2024',
        description: 'Link pendaftaran tes psikologi untuk rekrutmen karyawan baru batch 2024',
        maxUses: 100,
        usedCount: 0,
        expiresAt,
        testExpiryHours: 72, // Test access valid for 72 hours after registration
        isActive: true,
        requireFields: JSON.stringify(['fullName', 'email', 'phone', 'birthDate', 'gender']),
        customFields: JSON.stringify([
          {
            name: 'education',
            label: 'Pendidikan Terakhir',
            type: 'select',
            required: true,
            options: ['SMA/SMK', 'D3', 'S1', 'S2', 'S3']
          },
          {
            name: 'position',
            label: 'Posisi yang Dilamar',
            type: 'text',
            required: true
          },
          {
            name: 'source',
            label: 'Sumber Informasi Lowongan',
            type: 'select',
            required: false,
            options: ['LinkedIn', 'JobStreet', 'Referensi Karyawan', 'Website Perusahaan', 'Lainnya']
          }
        ]),
        welcomeMessage: 'Selamat datang di proses rekrutmen kami. Silakan lengkapi data diri Anda untuk memulai tes psikologi.',
        successMessage: 'Pendaftaran berhasil! Anda dapat langsung memulai tes. Link tes akan kadaluarsa dalam 72 jam.',
        createdAt: now,
        updatedAt: now
      });
    }

    // Invitation 2: Internal assessment
    if (!existingCodes.includes('PROMO2024')) {
      invitationsToInsert.push({
        id: uuidv4(),
        tenantId,
        packageId,
        code: 'PROMO2024',
        name: 'Assessment Promosi 2024',
        description: 'Link asesmen untuk kandidat promosi jabatan',
        maxUses: 50,
        usedCount: 0,
        expiresAt,
        testExpiryHours: 48,
        isActive: true,
        requireFields: JSON.stringify(['fullName', 'email', 'phone']),
        customFields: JSON.stringify([
          {
            name: 'employeeId',
            label: 'Nomor Induk Karyawan',
            type: 'text',
            required: true
          },
          {
            name: 'currentPosition',
            label: 'Jabatan Saat Ini',
            type: 'text',
            required: true
          },
          {
            name: 'targetPosition',
            label: 'Jabatan yang Dituju',
            type: 'text',
            required: true
          },
          {
            name: 'yearsInCompany',
            label: 'Lama Bekerja (tahun)',
            type: 'number',
            required: true
          }
        ]),
        welcomeMessage: 'Assessment Center Promosi Jabatan 2024. Pastikan Anda mengerjakan tes dalam kondisi yang kondusif.',
        successMessage: 'Registrasi berhasil. Silakan kerjakan tes dalam waktu 48 jam.',
        createdAt: now,
        updatedAt: now
      });
    }

    // Invitation 3: Demo/Training
    if (!existingCodes.includes('DEMO001')) {
      invitationsToInsert.push({
        id: uuidv4(),
        tenantId,
        packageId,
        code: 'DEMO001',
        name: 'Demo Tes Psikologi',
        description: 'Link demo untuk training HR atau presentasi klien',
        maxUses: null, // Unlimited
        usedCount: 0,
        expiresAt: null, // Never expires
        testExpiryHours: 24,
        isActive: true,
        requireFields: JSON.stringify(['fullName', 'email']),
        customFields: JSON.stringify([
          {
            name: 'company',
            label: 'Nama Perusahaan',
            type: 'text',
            required: false
          },
          {
            name: 'purpose',
            label: 'Tujuan Demo',
            type: 'select',
            required: true,
            options: ['Evaluasi Produk', 'Training Internal', 'Presentasi', 'Lainnya']
          }
        ]),
        welcomeMessage: 'Selamat datang di demo tes psikologi. Ini adalah versi demo dengan soal terbatas.',
        successMessage: 'Anda dapat langsung mencoba tes. Hasil tes demo bersifat simulasi.',
        createdAt: now,
        updatedAt: now
      });
    }

    if (invitationsToInsert.length > 0) {
      await queryInterface.bulkInsert('PsychologyInvitations', invitationsToInsert);
      console.log(`Inserted ${invitationsToInsert.length} psychology invitations`);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('PsychologyInvitations', {
      code: { [Sequelize.Op.in]: ['RECRUIT2024', 'PROMO2024', 'DEMO001'] }
    });
  }
};
