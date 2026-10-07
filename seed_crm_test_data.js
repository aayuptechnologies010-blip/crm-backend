const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./src/models/User');
const Branch = require('./src/models/Branch');
const RolePermission = require('./src/models/RolePermission');
const Lead = require('./src/models/Lead');
const FollowUp = require('./src/models/FollowUp');
const WorkflowActivity = require('./src/models/WorkflowActivity');
const AuditLog = require('./src/models/AuditLog');
const { DEFAULT_ROLE_PERMISSIONS } = require('./src/middleware/rbac');

async function seedData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB. Starting test dataset population...');

    // 1. Seed Default Role Permissions
    console.log('1. Seeding Role Permissions...');
    for (const [roleName, cfg] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      await RolePermission.findOneAndUpdate(
        { role: roleName },
        { role: roleName, ...cfg },
        { upsert: true, new: true }
      );
    }

    // 2. Seed Branches (PDF Multi-Branch Scope)
    console.log('2. Seeding Branches...');
    const branchesData = [
      { name: 'Mumbai HQ', code: 'MUM-01', city: 'Mumbai', state: 'Maharashtra', phone: '9820011223' },
      { name: 'Delhi NCR', code: 'DEL-01', city: 'Delhi', state: 'Delhi', phone: '9810033445' },
      { name: 'Bangalore Tech', code: 'BLR-01', city: 'Bengaluru', state: 'Karnataka', phone: '9880055667' },
    ];

    const branchDocs = {};
    for (const b of branchesData) {
      const doc = await Branch.findOneAndUpdate(
        { code: b.code },
        b,
        { upsert: true, new: true }
      );
      branchDocs[b.name] = doc;
    }

    // 3. Seed Users for Every Role (with password 'password123')
    console.log('3. Seeding Test Users for all 4 Roles...');
    const hashedPassword = await bcrypt.hash('password123', 10);

    const testUsers = [
      {
        name: 'Super Admin User',
        email: 'superadmin@crm.com',
        role: 'Super Admin',
        branch: 'Mumbai HQ',
        team: 'Management',
        phone: '9900112233'
      },
      {
        name: 'Org Admin User',
        email: 'admin@crm.com',
        role: 'Admin',
        branch: 'Mumbai HQ',
        team: 'Operations',
        phone: '9900223344'
      },
      {
        name: 'Rajesh Sharma',
        email: 'branchadmin.delhi@crm.com',
        role: 'Branch Admin',
        branch: 'Delhi NCR',
        team: 'North Sales',
        phone: '9900334455'
      },
      {
        name: 'Pooja Hegde',
        email: 'branchadmin.mumbai@crm.com',
        role: 'Branch Admin',
        branch: 'Mumbai HQ',
        team: 'West Sales',
        phone: '9900445566'
      },
      {
        name: 'Rahul Verma',
        email: 'rahul.sales@crm.com',
        role: 'Sales Executive',
        branch: 'Delhi NCR',
        team: 'North Sales',
        phone: '9900556677'
      },
      {
        name: 'Sneha Patel',
        email: 'sneha.sales@crm.com',
        role: 'Sales Executive',
        branch: 'Mumbai HQ',
        team: 'West Sales',
        phone: '9900667788'
      },
      {
        name: 'Amit Kumar',
        email: 'amit.sales@crm.com',
        role: 'Sales Executive',
        branch: 'Delhi NCR',
        team: 'North Sales',
        phone: '9900778899'
      }
    ];

    const userDocs = {};
    for (const u of testUsers) {
      let user = await User.findOne({ email: u.email });
      if (!user) {
        user = await User.create({
          ...u,
          password: hashedPassword,
          status: 'Active'
        });
      } else {
        user.role = u.role;
        user.branch = u.branch;
        user.name = u.name;
        user.password = hashedPassword;
        await user.save();
      }
      userDocs[u.name] = user;
    }

    // Set branch managers
    if (branchDocs['Delhi NCR'] && userDocs['Rajesh Sharma']) {
      branchDocs['Delhi NCR'].manager = userDocs['Rajesh Sharma']._id;
      await branchDocs['Delhi NCR'].save();
    }
    if (branchDocs['Mumbai HQ'] && userDocs['Pooja Hegde']) {
      branchDocs['Mumbai HQ'].manager = userDocs['Pooja Hegde']._id;
      await branchDocs['Mumbai HQ'].save();
    }

    // 4. Seed Leads across all stages & branches
    console.log('4. Seeding Test Leads across all 16 stages & scopes...');
    const testLeads = [
      {
        name: 'Aarav Singhania',
        company: 'Singhania Tech Solutions',
        email: 'aarav@singhaniatech.com',
        phone: '9876543210',
        value: '850000',
        budget: '850000',
        source: 'Website',
        status: 'Quotation Sent',
        priority: 'High',
        branch: 'Delhi NCR',
        assignedTo: 'Rahul Verma',
        location: 'Connaught Place, Delhi',
        requirementDetails: 'Complete CRM ERP Web Application for 50 users.',
        quotations: [{
          quotationNumber: 'QT-2026-001',
          amount: 850000,
          status: 'Sent',
          sentDate: new Date()
        }],
        payments: [{
          amount: 200000,
          type: 'Advance',
          paymentMode: 'Bank Transfer',
          transactionId: 'TXN-DEL-89912',
          paymentDate: new Date()
        }]
      },
      {
        name: 'Vikram Malhotra',
        company: 'Apex Logistics Hub',
        email: 'vikram@apexlogistics.in',
        phone: '9822334455',
        value: '1200000',
        budget: '1200000',
        source: 'Referral',
        status: 'Closed / Won',
        priority: 'Urgent',
        branch: 'Mumbai HQ',
        assignedTo: 'Sneha Patel',
        location: 'Andheri East, Mumbai',
        requirementDetails: 'Warehouse tracking & fleet GPS integration.',
        quotations: [{
          quotationNumber: 'QT-2026-002',
          amount: 1200000,
          status: 'Accepted',
          sentDate: new Date(Date.now() - 5 * 86400000)
        }],
        payments: [{
          amount: 600000,
          type: 'Advance',
          paymentMode: 'UPI',
          transactionId: 'UPI-MUM-7761',
          paymentDate: new Date()
        }],
        documents: [{
          title: 'Master Service Agreement Signed',
          documentType: 'Agreement',
          fileUrl: 'https://example.com/msa_signed.pdf'
        }]
      },
      {
        name: 'Kavita Iyer',
        company: 'Nova Healthcare Clinic',
        email: 'kavita@novaclinic.com',
        phone: '9811224466',
        value: '450000',
        budget: '450000',
        source: 'LinkedIn',
        status: 'Meeting / Demo',
        priority: 'Medium',
        branch: 'Delhi NCR',
        assignedTo: 'Amit Kumar',
        location: 'South Extension, Delhi',
        requirementDetails: 'Patient appointment scheduling and billing software.'
      },
      {
        name: 'Rohan Mehra',
        company: 'Mehra Builders & Realty',
        email: 'rohan@mehrabuilders.com',
        phone: '9899887766',
        value: '1500000',
        budget: '1500000',
        source: 'Cold Call',
        status: 'Negotiation',
        priority: 'Urgent',
        branch: 'Delhi NCR',
        assignedTo: 'Rahul Verma',
        location: 'Noida Sector 62',
        requirementDetails: 'Lead capture portal for high-end residential apartments.'
      },
      {
        name: 'Dr. Suresh Nair',
        company: 'Green Life Diagnostics',
        email: 'suresh@greenlifelab.com',
        phone: '9844556677',
        value: '300000',
        budget: '300000',
        source: 'Website',
        status: 'New Lead',
        priority: 'Medium',
        branch: 'Mumbai HQ',
        assignedTo: '', // Unassigned to test Assign module
        location: 'Bandra West, Mumbai',
        requirementDetails: 'Lab report online delivery WhatsApp bot.'
      },
      {
        name: 'Tanvi Deshmukh',
        company: 'Zenith Retail Chain',
        email: 'tanvi@zenithretail.in',
        phone: '9833445566',
        value: '600000',
        budget: '600000',
        source: 'Email Campaign',
        status: 'Lost / Closed Lost',
        priority: 'Low',
        branch: 'Mumbai HQ',
        assignedTo: 'Sneha Patel',
        location: 'Pune',
        requirementDetails: 'Looking for free open-source software, budget mismatch.'
      }
    ];

    const leadDocs = [];
    for (const ld of testLeads) {
      let lead = await Lead.findOne({ email: ld.email });
      if (!lead) {
        lead = await Lead.create(ld);
      } else {
        Object.assign(lead, ld);
        await lead.save();
      }
      leadDocs.push(lead);
    }

    // 5. Seed Workflow Activities & Timeline Events for Leads (PDF Section 4 & 6)
    console.log('5. Seeding Workflow Activities & Timeline...');
    const sampleTimelineEvents = [
      {
        lead: leadDocs[0]._id,
        activityType: 'Call',
        performedByName: 'Rahul Verma',
        performedByRole: 'Sales Executive',
        remark: 'First discovery call completed with Mr. Aarav. Very keen on automation.',
        nextAction: 'Prepare formal budget quote',
        nextFollowUpDate: new Date(Date.now() + 86400000)
      },
      {
        lead: leadDocs[0]._id,
        activityType: 'Quotation',
        performedByName: 'Rahul Verma',
        performedByRole: 'Sales Executive',
        previousStatus: 'Requirement Collected',
        newStatus: 'Quotation Sent',
        remark: 'Sent Quotation QT-2026-001 of ₹8,50,000 for review.',
        systemGenerated: true
      },
      {
        lead: leadDocs[1]._id,
        activityType: 'Meeting',
        performedByName: 'Sneha Patel',
        performedByRole: 'Sales Executive',
        remark: 'Executive level site visit & demo conducted at client Mumbai office.',
        nextAction: 'Final contract signing'
      },
      {
        lead: leadDocs[1]._id,
        activityType: 'Payment',
        performedByName: 'Sneha Patel',
        performedByRole: 'Sales Executive',
        previousStatus: 'Project Confirmed',
        newStatus: 'Payment / Advance',
        remark: 'Received 50% advance ₹6,00,000 via UPI.',
        systemGenerated: true
      }
    ];

    for (const ev of sampleTimelineEvents) {
      await WorkflowActivity.create(ev);
    }

    // 6. Seed Follow-ups (Today and Overdue)
    console.log('6. Seeding Scheduled & Overdue Follow-ups...');
    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    const followUps = [
      {
        lead: leadDocs[0].name,
        company: leadDocs[0].company,
        date: todayStr,
        time: '11:30',
        assignedTo: 'Rahul Verma',
        priority: 'High',
        status: 'Pending',
        leadRef: leadDocs[0]._id
      },
      {
        lead: leadDocs[2].name,
        company: leadDocs[2].company,
        date: todayStr,
        time: '14:00',
        assignedTo: 'Amit Kumar',
        priority: 'Medium',
        status: 'Pending',
        leadRef: leadDocs[2]._id
      },
      {
        lead: leadDocs[3].name,
        company: leadDocs[3].company,
        date: yesterdayStr, // OVERDUE FOLLOW-UP
        time: '16:00',
        assignedTo: 'Rahul Verma',
        priority: 'High',
        status: 'Pending',
        leadRef: leadDocs[3]._id
      }
    ];

    for (const f of followUps) {
      await FollowUp.findOneAndUpdate(
        { lead: f.lead, date: f.date },
        f,
        { upsert: true, new: true }
      );
    }

    // 7. Seed System Audit Logs (PDF Section 13)
    console.log('7. Seeding Audit Trail logs...');
    const auditLogs = [
      {
        entity: 'lead',
        entityId: String(leadDocs[0]._id),
        action: 'STATUS_CHANGE',
        performedByName: 'Rahul Verma',
        performedByRole: 'Sales Executive',
        branch: 'Delhi NCR',
        details: 'Transitioned status from Requirement Collected to Quotation Sent',
        newValues: { status: 'Quotation Sent' }
      },
      {
        entity: 'permission',
        entityId: 'Sales Executive',
        action: 'PERMISSION_CHANGE',
        performedByName: 'Super Admin User',
        performedByRole: 'Super Admin',
        branch: 'Mumbai HQ',
        details: 'Configured Sales Executive scope to Own Assigned Data',
      },
      {
        entity: 'payment',
        entityId: String(leadDocs[1]._id),
        action: 'CREATE',
        performedByName: 'Sneha Patel',
        performedByRole: 'Sales Executive',
        branch: 'Mumbai HQ',
        details: 'Recorded Advance payment of ₹6,00,000 for Apex Logistics Hub'
      }
    ];

    for (const a of auditLogs) {
      await AuditLog.create(a);
    }

    console.log('SUCCESS! Comprehensive test dataset successfully seeded for all roles, branches, and modules.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seedData();
