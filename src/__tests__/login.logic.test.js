'use strict';
// Login & registration — pure logic tests (plain JS, zero native imports)
// Run: node node_modules/jest/build/index.js src/__tests__/login.logic.test.js --no-coverage --forceExit --verbose

// ── inline pure functions ────────────────────────────────────────────────────

function validatePhoneNumber(phone) {
  return /^(\+?254|0)?[17]\d{8}$/.test(phone.replace(/\s/g, ''));
}

function formatPhoneNumber(phone) {
  let f = phone.replace(/\s/g, '');
  if (f.startsWith('0')) f = '254' + f.slice(1);
  if (!f.startsWith('+')) f = '+' + f;
  return f;
}

function buildPhoneFormats(phone) {
  const raw = phone.trim().replace(/\s/g, '');
  const s = new Set([raw]);
  if (raw.startsWith('0'))   { s.add('+254' + raw.slice(1)); s.add('254' + raw.slice(1)); }
  if (raw.startsWith('+254')){ s.add('0' + raw.slice(4));    s.add(raw.slice(1)); }
  if (raw.startsWith('254') && !raw.startsWith('+')) { s.add('0' + raw.slice(3)); s.add('+' + raw); }
  return Array.from(s);
}

function validateLoginForm(phone, password) {
  if (!phone.trim()) return 'Please enter your phone number';
  if (!validatePhoneNumber(phone)) return 'Please enter a valid phone number (e.g. 0712 345 678)';
  if (!password) return 'Please enter your password';
  return null;
}

function validateRegisterForm(fullName, phone, email, password) {
  if (!fullName.trim()) return 'Please enter your full name';
  if (!validatePhoneNumber(phone)) return 'Please enter a valid phone number (e.g. 0712 345 678)';
  if (!email.trim() || !email.includes('@') || !email.includes('.')) return 'Please enter a valid email address';
  if (password.length < 8) return 'Password must be at least 8 characters';
  return null;
}

async function runLoginFlow(phone, password, fakeDb) {
  const raw = phone.trim().replace(/\s/g, '');
  const s = new Set([raw]);
  if (raw.startsWith('0'))   { s.add('+254' + raw.slice(1)); s.add('254' + raw.slice(1)); }
  if (raw.startsWith('+254')){ s.add('0' + raw.slice(4));    s.add(raw.slice(1)); }
  if (raw.startsWith('254') && !raw.startsWith('+')) { s.add('0' + raw.slice(3)); s.add('+' + raw); }

  if (fakeDb.lookupError) return { ok: false, error: 'Something went wrong. Please try again.' };

  const profileData = (fakeDb.profileRows || [])[0] || null;
  if (!profileData) return { ok: false, error: 'No account found with this phone number' };
  if (!profileData.email) return { ok: false, error: 'This account has no email set. Please contact support.' };

  const { data, error: signInError } = fakeDb.signInResult || { data: null, error: { message: 'No sign-in result' } };
  if (signInError) {
    return {
      ok: false,
      error: signInError.message.toLowerCase().includes('invalid')
        ? 'Incorrect password. Please try again.'
        : signInError.message,
    };
  }
  return { ok: true, session: data.session, profile: fakeDb.fullProfile };
}

// ── validatePhoneNumber ──────────────────────────────────────────────────────

describe('validatePhoneNumber', () => {
  const valid = [
    '0712345678', '0712 345 678', '0722345678',
    '0729351414', '+254729351414', '254729351414',
    '+254712345678', '0100000000', '0110000000',
  ];
  const invalid = ['', '123', 'abcdefghij', '0512345678', '+1 800 555 0199'];

  test.each(valid)('accepts %s', (n) => expect(validatePhoneNumber(n)).toBe(true));
  test.each(invalid)('rejects %s', (n) => expect(validatePhoneNumber(n)).toBe(false));
});

// ── formatPhoneNumber ────────────────────────────────────────────────────────

describe('formatPhoneNumber', () => {
  it('0729351414 → +254729351414', () => expect(formatPhoneNumber('0729351414')).toBe('+254729351414'));
  it('0712345678 → +254712345678', () => expect(formatPhoneNumber('0712345678')).toBe('+254712345678'));
  it('0712 345 678 → +254712345678', () => expect(formatPhoneNumber('0712 345 678')).toBe('+254712345678'));
  it('+254712345678 unchanged', () => expect(formatPhoneNumber('+254712345678')).toBe('+254712345678'));
  it('254712345678 → +254712345678', () => expect(formatPhoneNumber('254712345678')).toBe('+254712345678'));
});

// ── buildPhoneFormats ────────────────────────────────────────────────────────

describe('buildPhoneFormats', () => {
  it('0729351414 → all three formats', () => {
    const f = buildPhoneFormats('0729351414');
    expect(f).toContain('0729351414');
    expect(f).toContain('+254729351414');
    expect(f).toContain('254729351414');
  });
  it('+254729351414 → 07XX and 254XX', () => {
    const f = buildPhoneFormats('+254729351414');
    expect(f).toContain('+254729351414');
    expect(f).toContain('0729351414');
    expect(f).toContain('254729351414');
  });
  it('254729351414 → +254XX and 07XX', () => {
    const f = buildPhoneFormats('254729351414');
    expect(f).toContain('254729351414');
    expect(f).toContain('+254729351414');
    expect(f).toContain('0729351414');
  });
  it('strips spaces before expanding', () => {
    const f = buildPhoneFormats('0729 351 414');
    expect(f).toContain('0729351414');
    expect(f).toContain('+254729351414');
  });
  it('no duplicates', () => {
    const f = buildPhoneFormats('0729351414');
    expect(f.length).toBe(new Set(f).size);
  });
  it('or() filter contains all formats', () => {
    const filter = buildPhoneFormats('0729351414').map((x) => 'phone.eq.' + x).join(',');
    expect(filter).toContain('phone.eq.0729351414');
    expect(filter).toContain('phone.eq.+254729351414');
    expect(filter).toContain('phone.eq.254729351414');
  });
});

// ── Login form validation ────────────────────────────────────────────────────

describe('Login form validation', () => {
  it('rejects empty phone',          () => expect(validateLoginForm('', 'pass')).toBe('Please enter your phone number'));
  it('rejects whitespace phone',     () => expect(validateLoginForm('   ', 'pass')).toBe('Please enter your phone number'));
  it('rejects invalid 0512345678',   () => expect(validateLoginForm('0512345678', 'pass')).toBe('Please enter a valid phone number (e.g. 0712 345 678)'));
  it('rejects too-short 0712',       () => expect(validateLoginForm('0712', 'pass')).toBe('Please enter a valid phone number (e.g. 0712 345 678)'));
  it('rejects empty password',       () => expect(validateLoginForm('0729351414', '')).toBe('Please enter your password'));
  it('PASS: 0729351414 + Password@123',   () => expect(validateLoginForm('0729351414', 'Password@123')).toBeNull());
  it('PASS: +254729351414',          () => expect(validateLoginForm('+254729351414', 'Password@123')).toBeNull());
  it('PASS: spaced 0729 351 414',    () => expect(validateLoginForm('0729 351 414', 'Password@123')).toBeNull());
});

// ── Registration form validation ─────────────────────────────────────────────

describe('Registration form validation', () => {
  const g = { fullName: 'Test User', phone: '0729351414', email: 'test@example.com', password: 'Password@123' };
  it('PASS: all valid',              () => expect(validateRegisterForm(g.fullName, g.phone, g.email, g.password)).toBeNull());
  it('rejects empty name',           () => expect(validateRegisterForm('', g.phone, g.email, g.password)).toBe('Please enter your full name'));
  it('rejects whitespace name',      () => expect(validateRegisterForm('  ', g.phone, g.email, g.password)).toBe('Please enter your full name'));
  it('rejects invalid phone',        () => expect(validateRegisterForm(g.fullName, '123', g.email, g.password)).toBe('Please enter a valid phone number (e.g. 0712 345 678)'));
  it('rejects email without @',      () => expect(validateRegisterForm(g.fullName, g.phone, 'notanemail', g.password)).toBe('Please enter a valid email address'));
  it('rejects email without dot',    () => expect(validateRegisterForm(g.fullName, g.phone, 'user@nodot', g.password)).toBe('Please enter a valid email address'));
  it('rejects password < 8 chars',   () => expect(validateRegisterForm(g.fullName, g.phone, g.email, 'short')).toBe('Password must be at least 8 characters'));
  it('PASS: exactly 8-char password',() => expect(validateRegisterForm(g.fullName, g.phone, g.email, '12345678')).toBeNull());
});

// ── Login flow logic (in-memory, no Supabase) ────────────────────────────────

describe('Login flow logic', () => {
  const fakeUser    = { id: 'user-abc' };
  const fakeSession = { access_token: 'tok-abc' };
  const fakeProfile = { id: 'user-abc', full_name: 'Test User', role: 'customer' };
  const profileRow  = { id: 'user-abc', email: 'test@example.com', phone: '+254729351414' };
  const goodSignIn  = { data: { user: fakeUser, session: fakeSession }, error: null };

  it('PASS: 0729351414 + Password@123', async () => {
    const r = await runLoginFlow('0729351414', 'Password@123', { profileRows: [profileRow], signInResult: goodSignIn, fullProfile: fakeProfile });
    expect(r).toEqual({ ok: true, session: fakeSession, profile: fakeProfile });
  });
  it('PASS: +254729351414 format', async () => {
    const r = await runLoginFlow('+254729351414', 'Password@123', { profileRows: [profileRow], signInResult: goodSignIn, fullProfile: fakeProfile });
    expect(r).toEqual({ ok: true, session: fakeSession, profile: fakeProfile });
  });
  it('PASS: spaced 0729 351 414', async () => {
    const r = await runLoginFlow('0729 351 414', 'Password@123', { profileRows: [profileRow], signInResult: goodSignIn, fullProfile: fakeProfile });
    expect(r).toEqual({ ok: true, session: fakeSession, profile: fakeProfile });
  });
  it('FAIL: phone not in DB (empty array)', async () => {
    const r = await runLoginFlow('0799999999', 'Password@123', { profileRows: [] });
    expect(r).toEqual({ ok: false, error: 'No account found with this phone number' });
  });
  it('FAIL: phone not in DB (null)', async () => {
    const r = await runLoginFlow('0799999999', 'Password@123', { profileRows: null });
    expect(r).toEqual({ ok: false, error: 'No account found with this phone number' });
  });
  it('FAIL: wrong password → friendly message', async () => {
    const r = await runLoginFlow('0729351414', 'WrongPass', {
      profileRows: [profileRow],
      signInResult: { data: null, error: { message: 'Invalid login credentials' } },
    });
    expect(r).toEqual({ ok: false, error: 'Incorrect password. Please try again.' });
  });
  it('FAIL: account has no email', async () => {
    const r = await runLoginFlow('0729351414', 'Password@123', {
      profileRows: [{ id: 'u1', email: null, phone: '+254729351414' }],
    });
    expect(r).toEqual({ ok: false, error: 'This account has no email set. Please contact support.' });
  });
  it('FAIL: DB lookup error → generic message', async () => {
    const r = await runLoginFlow('0729351414', 'Password@123', { profileRows: null, lookupError: true });
    expect(r).toEqual({ ok: false, error: 'Something went wrong. Please try again.' });
  });
});
