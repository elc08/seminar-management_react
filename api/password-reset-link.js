// Vercel serverless function: POST /api/password-reset-link
// Generates a Firebase password-reset link for a user, but ONLY if the caller
// is signed in AND has role "Organizer" in Firestore (user_roles/{uid}).
// The check happens on the server, so it cannot be bypassed from the browser.

const admin = require('firebase-admin');

function getAdmin() {
  if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT env var is not set');
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
  }
  return admin;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const fb = getAdmin();

    // 1. Who is calling? Verify their Firebase ID token.
    const authHeader = req.headers.authorization || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken) return res.status(401).json({ error: 'Not signed in' });

    let caller;
    try {
      caller = await fb.auth().verifyIdToken(idToken);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    // 2. Is the caller an Organizer? (read with admin rights, can't be faked)
    const roleDoc = await fb.firestore().collection('user_roles').doc(caller.uid).get();
    if (!roleDoc.exists || roleDoc.data().role !== 'Organizer') {
      return res.status(403).json({ error: 'Only organisers can reset passwords' });
    }

    // 3. Generate the reset link for the target user.
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const email = String(body.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const continueUrl = process.env.APP_URL || `https://${req.headers.host}`;
    try {
      const link = await fb.auth().generatePasswordResetLink(email, { url: continueUrl });
      return res.status(200).json({ link });
    } catch (err) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/email-not-found') {
        return res.status(404).json({
          error: 'No login account exists for this email (the user may not have completed signup).',
        });
      }
      throw err;
    }
  } catch (err) {
    console.error('password-reset-link error:', err);
    return res.status(500).json({ error: 'Server error generating reset link' });
  }
};
