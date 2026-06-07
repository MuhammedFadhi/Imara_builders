require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Simple JSON data store
const dataFile = path.join(__dirname, 'data.json');
let db = { leads: [], projects: [], invoices: [], payments: [], change_orders: [] };
if (fs.existsSync(dataFile)) {
  try { db = JSON.parse(fs.readFileSync(dataFile, 'utf8')); } catch (e) { console.error('Failed to parse data.json', e); }
}
const saveDb = () => fs.writeFileSync(dataFile, JSON.stringify(db, null, 2));

// Helper to generate simple IDs
const generateId = () => Date.now().toString() + Math.floor(Math.random() * 1000).toString();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5001;

// --- LEADS ENDPOINTS (local store) --- //

app.get('/api/leads', (req, res) => {
  // Return leads sorted by latest creation
  const sorted = db.leads.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(sorted);
});

app.post('/api/leads', (req, res) => {
  const lead = { ...req.body, id: generateId(), lead_status: 'New', created_at: new Date().toISOString() };
  db.leads.push(lead);
  saveDb();
  res.status(201).json(lead);
});

app.put('/api/leads/:id/convert', (req, res) => {
  const { id } = req.params;
  const lead = db.leads.find(l => l.id === id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  // Update status
  lead.lead_status = 'Won';

  // Create project from lead
  const project = {
    id: generateId(),
    lead_id: lead.id,
    client_name: lead.client_name,
    project_address: lead.property_address,
    source_company: lead.lead_source,
    contract_value: lead.estimated_value,
    job_status: 'Active',
    created_at: new Date().toISOString()
  };
  db.projects.push(project);
  saveDb();
  res.json(project);
});


// --- PROJECTS ENDPOINTS (local store) --- //

app.get('/api/projects', (req, res) => {
  const sorted = db.projects.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(sorted);
});

app.post('/api/projects', (req, res) => {
  const proj = { ...req.body, id: generateId(), created_at: new Date().toISOString() };
  db.projects.push(proj);
  saveDb();
  res.status(201).json(proj);
});

app.get('/api/projects/:id', (req, res) => {
  const { id } = req.params;
  const project = db.projects.find(p => p.id === id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  
  // Filter associated financial data
  const invoices = db.invoices.filter(i => i.project_id === id);
  const payments = db.payments.filter(p => p.project_id === id);
  const change_orders = db.change_orders.filter(c => c.project_id === id);

  res.json({ ...project, invoices, payments, change_orders });
});

app.post('/api/projects/:id/payments', (req, res) => {
  const payment = { ...req.body, id: generateId(), project_id: req.params.id };
  db.payments.push(payment);
  saveDb();
  res.status(201).json(payment);
});

app.post('/api/projects/:id/invoices', (req, res) => {
  const invoice = { ...req.body, id: generateId(), project_id: req.params.id };
  db.invoices.push(invoice);
  saveDb();
  res.status(201).json(invoice);
});


// --- BILLING SUMMARY (local store) --- //
app.get('/api/billing', (req, res) => {
  const totalContractValue = db.projects.reduce((sum, p) => sum + Number(p.contract_value || 0), 0);
  const totalInvoiced = db.invoices.reduce((sum, i) => sum + Number(i.amount || 0), 0);
  const totalPaid = db.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  res.json({
    totalContractValue,
    totalInvoiced,
    totalPaid,
    outstandingBalance: totalInvoiced - totalPaid
  });
});

// --- DASHBOARD METRICS (local store) --- //
app.get('/api/dashboard', (req, res) => {
  const totalLeads = db.leads.length;
  const activeProjects = db.projects.filter(p => p.job_status === 'Active').length;
  const completedProjects = db.projects.filter(p => p.job_status === 'Completed').length;
  const invoiced = db.invoices.reduce((sum, i) => sum + Number(i.amount || 0), 0);
  const paid = db.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  res.json({
    totalLeads,
    activeProjects,
    completedProjects,
    outstandingPayments: invoiced - paid
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
