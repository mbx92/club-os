/**
 * Test Invitation Type Response
 */

const { PsychologyInvitation, Patient, PsychologyPackage, Tenant } = require('./src/models');

async function testInvitationResponse() {
  try {
    console.log('🧪 Testing invitation type response...\n');

    // Find a tenant
    const tenant = await Tenant.findOne();
    if (!tenant) {
      console.error('❌ No tenant found');
      return;
    }

    console.log(`✅ Using tenant: ${tenant.name} (${tenant.id})`);

    // Find a package
    const pkg = await PsychologyPackage.findOne({
      where: { tenantId: tenant.id }
    });

    if (!pkg) {
      console.error('❌ No package found');
      return;
    }

    console.log(`✅ Using package: ${pkg.name} (${pkg.id})`);

    // Find a patient
    const patient = await Patient.findOne({
      where: { tenantId: tenant.id }
    });

    if (!patient) {
      console.error('❌ No patient found');
      return;
    }

    console.log(`✅ Using patient: ${patient.fullName} (${patient.id})`);

    // Create test invitation (single_patient type)
    console.log('\n📝 Creating single_patient invitation...');
    
    const invitation = await PsychologyInvitation.create({
      code: PsychologyInvitation.generateCode(),
      tenantId: tenant.id,
      packageId: pkg.id,
      invitationType: 'single_patient',
      patientId: patient.id,
      name: 'Test Single Patient Invitation',
      description: 'Test invitation for specific patient',
      welcomeMessage: 'Welcome! This test is specifically for you.',
      maxUses: 1,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      testExpiryHours: 48
    });

    console.log(`✅ Created invitation: ${invitation.code}`);

    // Fetch invitation with includes (like API does)
    console.log('\n🔍 Fetching invitation with includes...');
    
    const fetchedInvitation = await PsychologyInvitation.findOne({
      where: { code: invitation.code },
      include: [
        {
          model: PsychologyPackage,
          as: 'package'
        },
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'fullName', 'email', 'phone', 'birthDate', 'sex']
        },
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['id', 'name', 'logo']
        }
      ]
    });

    // Build response like API
    const responseData = {
      invitation: {
        code: fetchedInvitation.code,
        invitationType: fetchedInvitation.invitationType,
        name: fetchedInvitation.name,
        description: fetchedInvitation.description,
        welcomeMessage: fetchedInvitation.welcomeMessage
      },
      organization: {
        name: fetchedInvitation.tenant?.name,
        logo: fetchedInvitation.tenant?.logo
      },
      package: {
        name: fetchedInvitation.package?.name,
        description: fetchedInvitation.package?.description
      },
      remainingSlots: fetchedInvitation.getRemainingSlots(),
      expiresAt: fetchedInvitation.expiresAt
    };

    // Add patient data for single_patient invitations
    if (fetchedInvitation.invitationType === 'single_patient' && fetchedInvitation.patient) {
      responseData.patient = {
        id: fetchedInvitation.patient.id,
        name: fetchedInvitation.patient.fullName,
        email: fetchedInvitation.patient.email,
        phone: fetchedInvitation.patient.phone,
        birthDate: fetchedInvitation.patient.birthDate,
        sex: fetchedInvitation.patient.sex
      };
    }

    console.log('\n📊 API Response:');
    console.log(JSON.stringify({ success: true, data: responseData }, null, 2));

    // Test open_registration type
    console.log('\n\n📝 Creating open_registration invitation...');
    
    const openInvitation = await PsychologyInvitation.create({
      code: PsychologyInvitation.generateCode(),
      tenantId: tenant.id,
      packageId: pkg.id,
      invitationType: 'open_registration',
      name: 'Test Open Registration',
      description: 'Open for anyone',
      maxUses: 10,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });

    console.log(`✅ Created invitation: ${openInvitation.code}`);

    const fetchedOpen = await PsychologyInvitation.findOne({
      where: { code: openInvitation.code },
      include: [
        { model: PsychologyPackage, as: 'package' },
        { model: Patient, as: 'patient' },
        { model: Tenant, as: 'tenant', attributes: ['id', 'name'] }
      ]
    });

    const openResponse = {
      invitation: {
        code: fetchedOpen.code,
        invitationType: fetchedOpen.invitationType,
        name: fetchedOpen.name,
        description: fetchedOpen.description
      },
      organization: {
        name: fetchedOpen.tenant?.name
      },
      remainingSlots: fetchedOpen.getRemainingSlots()
    };

    // No patient data for open_registration
    if (fetchedOpen.invitationType === 'single_patient' && fetchedOpen.patient) {
      openResponse.patient = { /* ... */ };
    }

    console.log('\n📊 API Response:');
    console.log(JSON.stringify({ success: true, data: openResponse }, null, 2));

    console.log('\n✅ Test complete!');
    console.log('\n📝 Summary:');
    console.log(`   - single_patient invitation: ${invitation.code} (includes patient data)`);
    console.log(`   - open_registration invitation: ${openInvitation.code} (no patient data)`);

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await invitation.destroy();
    await openInvitation.destroy();
    console.log('✅ Cleanup complete');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

testInvitationResponse();
