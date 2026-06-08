const express = require('express');
const supabase = require('../supabaseClient');

const router = express.Router();

// All admin routes need a valid JWT for a master_admin profile -- user
// provisioning requires the service-role key, which must never reach the
// browser, so this is the one slice of the app that still goes through Express.
async function requireMasterAdmin(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing bearer token' });

  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) return res.status(401).json({ error: 'Invalid or expired token' });

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', userData.user.id)
    .single();
  if (profileErr || profile?.role !== 'master_admin') {
    return res.status(403).json({ error: 'Master Admin access required' });
  }

  req.callerId = userData.user.id;
  next();
}

router.use(requireMasterAdmin);

router.post('/users', async (req, res) => {
  const { email, password, full_name, role, company_id } = req.body;
  if (!email || !password || !role || !company_id) {
    return res.status(400).json({ error: 'email, password, role and company_id are required' });
  }

  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  if (createErr) return res.status(400).json({ error: createErr.message });

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .upsert({ id: created.user.id, email, full_name: full_name || null, role, company_id })
    .select('id, full_name, email, role, company_id')
    .single();
  if (profileErr) {
    await supabase.auth.admin.deleteUser(created.user.id);
    return res.status(400).json({ error: profileErr.message });
  }

  res.status(201).json(profile);
});

router.patch('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { email, full_name, role, company_id } = req.body;

  if (email) {
    const { error: authErr } = await supabase.auth.admin.updateUserById(id, { email });
    if (authErr) return res.status(400).json({ error: authErr.message });
  }

  const profileUpdate = {};
  if (email !== undefined) profileUpdate.email = email;
  if (full_name !== undefined) profileUpdate.full_name = full_name;
  if (role !== undefined) profileUpdate.role = role;
  if (company_id !== undefined) profileUpdate.company_id = company_id;

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .update(profileUpdate)
    .eq('id', id)
    .select('id, full_name, email, role, company_id')
    .single();
  if (profileErr) return res.status(400).json({ error: profileErr.message });

  res.json(profile);
});

router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;
  if (id === req.callerId) return res.status(400).json({ error: "You can't delete your own account" });

  const { error: authErr } = await supabase.auth.admin.deleteUser(id);
  if (authErr) return res.status(400).json({ error: authErr.message });

  res.status(204).end();
});

module.exports = router;
