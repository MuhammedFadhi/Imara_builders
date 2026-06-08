require('dotenv').config();
const express = require('express');
const cors = require('cors');
const adminRoutes = require('./routes/admin');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5001;

// User provisioning needs the Supabase service-role key, which must never
// reach the browser -- this is the only slice of the app still proxied
// through Express. Everything else talks to Supabase directly with RLS
// enforcing access.
app.use('/api/admin', adminRoutes);

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
