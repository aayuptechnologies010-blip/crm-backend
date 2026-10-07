const mongoose = require('mongoose');
require('dotenv').config();

const Invoice = require('./src/models/Invoice');
const Lead = require('./src/models/Lead');
const User = require('./src/models/User');

async function seedInvoices() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB. Seeding Invoice test records...');

    const superAdmin = await User.findOne({ role: 'Super Admin' });
    const leads = await Lead.find();

    const leadMap = {};
    leads.forEach(l => {
      leadMap[l.name] = l;
    });

    const today = new Date();
    const formatDate = (d) => d.toISOString().split('T')[0];

    const testInvoices = [
      {
        invoiceNumber: 'INV-2026-1001',
        client: 'Singhania Tech Solutions',
        contact: '9876543210',
        amount: 850000,
        status: 'Pending',
        issueDate: formatDate(new Date(today.getTime() - 3 * 86400000)),
        dueDate: formatDate(new Date(today.getTime() + 12 * 86400000)),
        leadRef: leadMap['Aarav Singhania']?._id,
        createdBy: superAdmin?._id
      },
      {
        invoiceNumber: 'INV-2026-1002',
        client: 'Apex Logistics Hub',
        contact: '9822334455',
        amount: 1200000,
        status: 'Paid',
        issueDate: formatDate(new Date(today.getTime() - 10 * 86400000)),
        dueDate: formatDate(new Date(today.getTime() - 2 * 86400000)),
        leadRef: leadMap['Vikram Malhotra']?._id,
        createdBy: superAdmin?._id
      },
      {
        invoiceNumber: 'INV-2026-1003',
        client: 'Nova Healthcare Clinic',
        contact: '9811224466',
        amount: 450000,
        status: 'Pending',
        issueDate: formatDate(new Date(today.getTime() - 1 * 86400000)),
        dueDate: formatDate(new Date(today.getTime() + 14 * 86400000)),
        leadRef: leadMap['Kavita Iyer']?._id,
        createdBy: superAdmin?._id
      },
      {
        invoiceNumber: 'INV-2026-1004',
        client: 'Mehra Builders & Realty',
        contact: '9899887766',
        amount: 1500000,
        status: 'Overdue',
        issueDate: formatDate(new Date(today.getTime() - 25 * 86400000)),
        dueDate: formatDate(new Date(today.getTime() - 5 * 86400000)),
        leadRef: leadMap['Rohan Mehra']?._id,
        createdBy: superAdmin?._id
      },
      {
        invoiceNumber: 'INV-2026-1005',
        client: 'Green Life Diagnostics',
        contact: '9844556677',
        amount: 300000,
        status: 'Paid',
        issueDate: formatDate(new Date(today.getTime() - 15 * 86400000)),
        dueDate: formatDate(new Date(today.getTime() - 5 * 86400000)),
        leadRef: leadMap['Dr. Suresh Nair']?._id,
        createdBy: superAdmin?._id
      }
    ];

    for (const inv of testInvoices) {
      await Invoice.findOneAndUpdate(
        { invoiceNumber: inv.invoiceNumber },
        inv,
        { upsert: true, new: true }
      );
      console.log(`Saved Invoice: ${inv.invoiceNumber} | ${inv.client} | ₹${inv.amount} | Status: ${inv.status}`);
    }

    console.log('\nSUCCESS! Invoices seeded successfully across Paid, Pending, and Overdue statuses.');
    process.exit(0);
  } catch (err) {
    console.error('Invoice seeding error:', err);
    process.exit(1);
  }
}

seedInvoices();
