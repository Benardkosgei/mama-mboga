/**
 * Login & registration — pure logic tests (no Supabase, no native modules)
 *
 * Run:
 *   node node_modules/jest/build/index.js src/__tests__/login.logic.test.ts --no-coverage --forceExit --verbose --config jest.config.js
 */

/// <reference types="jest" />

// ─────────────────────────────────────────────────────────────────────────────
// Inline the pure functions so this file has ZERO native/Expo imports
// ─────────────────────────────────────────────────────────────────────────────

function validatePhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/\s/g, '');
  return /^(\+?254|0)?[17]\d{8}$/.test(cleaned);
}

function formatPhoneNumber(phone: string): string {
  let f = phone.replace(/\s/g, '');
  if (f.startsWith('0')) f = '254' + f.slice(1);
  if (!f.startsWith('+')) f = '+' + f;
  return f;
}

/** Mirrors the format-building block in login.tsx handleLogin() */
function buildPhoneFormats(phone: string): string[] {
  const raw = phone.trim().replace(/\s/g, '');
  const s = new Set<string>();
  s.add(raw);
  if (raw.startsWith('0')) {
    s.add('+254' + raw.slice(1));
    s.add('254' + raw.slice(1));
  }
  if (raw.startsWith('+254')) {
    s.add('0' + raw.slice(4));
    s.add(raw.slice(1));
  }
  if (raw.startsWith('254') && !raw.startsWith('+')) {
    s.add('0' + raw.slice(3));
    s.add('+' + raw);
  }
  return Array.from(s);
}

function validateLoginForm(phone: string, password: string): string | null {
  if (!phone.trim()) return 'Please enter your phone number';
  if (!validatePhoneNumber(phone))
    return 'Please enter a valid phone number (e.g. 0712 345 678)';
  if (!password) return 'Please enter your password';
  return null;
}

function validateRegisterForm(
  fullName: string, phone: string, email: string, password: string
): string | null {
  if (!fullName.trim()) return 'Please enter your full name';
  if (!validatePhoneNumber(phone))
    return 'Please enter a valid phone number (e.g. 0712 345 678)';
  if (!email.trim() || !email.includes('@') || !email.includes('.'))
    return 'Please enter a valid email address';
  if (password.length < 8) return 'Password must be at least 8 characters';
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// validatePhoneNumber
// ─────────────────────────────────────────────────────────────────────────────

describe('validatePhoneNumber', () => {
  const valid = [
    '0712345678', '0712 345 678', '0722345678',
    '0729351414',       // real test number
    '+254729351414', '254729351414',
    '+254712345678', '0100000000', '0110000000',
  ];
  const invalid = ['', '123', 'abcdefghij', '0512345678', '+1 800 555 0199'];

  test.each(valid)('✓ accepts %s', (n) => expect(validatePhoneNumber(n)).toBe(true));
  test.each(invalid)('✗ rejects %s', (n) => expect(validatePhoneNumber(n)).toBe(false));
});

// ─────────────────────────────────────────────────────────────────────────────
// formatPhoneNumber
// ─────────────────────────────────────────────────────────────────────────────

describe('formatPhoneNumber', () => {
  it('0729351414 → +254729351414', () =>
    expect(formatPhoneNumber('0729351414')).toBe('+254729351414'));
  it('0712345678 → +254712345678', () =>
    expect(formatPhoneNumber('0712345678')).toBe('+254712345678'));
  it('0712 345 678 (spaced) → +254712345678', () =>
    expect(formatPhoneNumber('0712 345 678')).toBe('+254712345678'));
  it('+254712345678 unchanged', () =>
    expect(formatPhoneNumber('+254712345678')).toBe('+254712345678'));
  it('254712345678 → +254712345678', () =>
    expect(formatPhoneNumber('254712345678')).toBe('+254712345678'));
});

// ─────────────────────────────────────────────────────────────────────────────
// buildPhoneFormats — the multi-format or() query logic
// ─────────────────────────────────────────────────────────────────────────────

describe('buildPhoneFormats', () => {
  it('0729351414 → contains 07XX, +254XX, 254XX', () => {
    const f = buildPhoneFormats('0729351414');
    expect(f).toContain('0729351414');
    expect(f).toContain('+254729351414');
    expect(f).toContain('254729351414');
  });

  it('+254729351414 → contains 07XX and 254XX', () => {
    const f = buildPhoneFormats('+254729351414');
    expect(f).toContain('+254729351414');
    expect(f).toContain('0729351414');
    expect(f).toContain('254729351414');
  });

  it('254729351414 → contains +254XX and 07XX', () => {
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

  it('produces no duplicates', () => {
    const f = buildPhoneFormats('0729351414');
    expect(f.length).toBe(new Set(f).size);
  });

  it('or() filter string contains all formats', () => {
    const f = buildPhoneFormats('0729351414');
    const orFilter = f.map((x) => `phone.eq.${x}`).join(',');
    expect(orFilter).toContain('phone.eq.0729351414');
    expect(orFilter).toContain('phone.eq.+254729351414');
    expect(orFilter).toContain('phone.eq.254729351414');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Login form validation
// ─────────────────────────────────────────────────────────────────────────────

describe('Login form validation', () => {
  it('rejects empty phone', () =>
    expect(validateLoginForm('', 'pass')).toBe('Please enter your phone number'));
  it('rejects whitespace-only phone', () =>
    expect(validateLoginForm('   ', 'pass')).toBe('Please enter your phone number'));
  it('rejects invalid prefix 0512345678', () =>
    expect(validateLoginForm('0512345678', 'pass')).toBe(
      'Please enter a valid phone number (e.g. 0712 345 678)'));
  it('rejects too-short number 0712', () =>
    expect(validateLoginForm('0712', 'pass')).toBe(
      'Please enter a valid phone number (e.g. 0712 345 678)'));
  it('rejects empty password', () =>
    expect(validateLoginForm('0729351414', '')).toBe('Please enter your password'));

  // ── the real test credentials ──
  it('✓ passes 0729351414 + Password@123', () =>
    expect(validateLoginForm('0729351414', 'Password@123')).toBeNull());
  it('✓ passes +254729351414 + Password@123', () =>
    expect(validateLoginForm('+254729351414', 'Password@123')).toBeNull());
  it('✓ passes spaced 0729 351 414', () =>
    expect(validateLoginForm('0729 351 414', 'Password@123')).toBeNull());
});

// ─────────────────────────────────────────────────────────────────────────────
// Registration form validation
// ─────────────────────────────────────────────────────────────────────────────

describe('Registration form validation', () => {
  const g = {
    fullName: 'Test User',
    phone: '0729351414',
    email: 'test@example.com',
    password: 'Password@123',
  };

  it('✓ passes all valid fields', () =>
    expect(validateRegisterForm(g.fullName, g.phone, g.email, g.password)).toBeNull());
  it('rejects empty name', () =>
    expect(validateRegisterForm('', g.phone, g.email, g.password)).toBe(
      'Please enter your full name'));
  it('rejects whitespace name', () =>
    expect(validateRegisterForm('  ', g.phone, g.email, g.password)).toBe(
      'Please enter your full name'));
  it('rejects invalid phone', () =>
    expect(validateRegisterForm(g.fullName, '123', g.email, g.password)).toBe(
      'Please enter a valid phone number (e.g. 0712 345 678)'));
  it('rejects email without @', () =>
    expect(validateRegisterForm(g.fullName, g.phone, 'notanemail', g.password)).toBe(
      'Please enter a valid email address'));
  it('rejects email without dot', () =>
    expect(validateRegisterForm(g.fullName, g.phone, 'user@nodot', g.password)).toBe(
      'Please enter a valid email address'));
  it('rejects password < 8 chars', () =>
    expect(validateRegisterForm(g.fullName, g.phone, g.email, 'short')).toBe(
      'Password must be at least 8 characters'));
  it('✓ accepts exactly 8-char password', () =>
    expect(validateRegisterForm(g.fullName, g.phone, g.email, '12345678')).toBeNull());
});

// ─────────────────────────────────────────────────────────────────────────────
// Login flow logic — fully in-memory, no Supabase client needed
// ─────────────────────────────────────────────────────────────────────────────

/** Mirrors handleLogin() in login.tsx — takes a fake DB object */
async function runLoginFlow(
  phone: string,
  _password: string,
  fakeDb: {
    profileRows: Array<{ id: string; email: string | null; phone: string }> | null;
    lookupError?: any;
    signInResult?: { data: any; error: any };
    fullProfile?: any;
  }
): Promise<{ ok: true; session: any; profile: any } | { ok: false; error: string }> {
  const raw = phone.trim().replace(/\s/g, '');
  const formats = new Set<string>();
  formats.add(raw);
  if (raw.startsWith('0')) { formats.add('+254' + raw.slice(1)); formats.add('254' + raw.slice(1)); }
  if (raw.startsWith('+254')) { formats.add('0' + raw.slice(4)); formats.add(raw.slice(1)); }
  if (raw.startsWith('254') && !raw.startsWith('+')) { formats.add('0' + raw.slice(3)); formats.add('+' + raw); }

  // Simulate the or() query
  if (fakeDb.lookupError) return { ok: false, error: 'Something went wrong. Please try again.' };

  const profileData = fakeDb.profileRows?.[0] ?? null;
  if (!profileData) return { ok: false, error: 'No account found with this phone number' };
  if (!profileData.email) return { ok: false, error: 'This account has no email set. Please contact support.' };

  // Simulate signInWithPassword
  const { data, error: signInError } = fakeDb.signInResult ?? { data: null, error: { message: 'No sign-in result provided' } };
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

describe('Login flow logic (in-memory)', () => {
  const fakeUser    = { id: 'user-abc' };
  const fakeSession = { access_token: 'tok-abc' };
  const fakeProfile = { id: 'user-abc', full_name: 'Test User', role: 'customer' };
  const profileRow  = { id: 'user-abc', email: 'test@example.com', phone: '+254729351414' };

  it('✓ succeeds with 0729351414 + Password@123', async () => {
    const result = await runLoginFlow('0729351414', 'Password@123', {
      profileRows: [profileRow],
      signInResult: { data: { user: fakeUser, session: fakeSession }, error: null },
      fullProfile: fakeProfile,
    });
    expect(result).toEqual({ ok: true, session: fakeSession, profile: fakeProfile });
  });

  it('✓ succeeds with +254729351414 format', async () => {
    const result = await runLoginFlow('+254729351414', 'Password@123', {
      profileRows: [profileRow],
      signInResult: { data: { user: fakeUser, session: fakeSession }, error: null },
      fullProfile: fakeProfile,
    });
    expect(result).toEqual({ ok: true, session: fakeSession, profile: fakeProfile });
  });

  it('✓ succeeds with spaced 0729 351 414', async () => {
    const result = await runLoginFlow('0729 351 414', 'Password@123', {
      profileRows: [profileRow],
      signInResult: { data: { user: fakeUser, session: fakeSession }, error: null },
      fullProfile: fakeProfile,
    });
    expect(result).toEqual({ ok: true, session: fakeSession, profile: fakeProfile });
  });

  it('✗ phone not in DB → "No account found"', async () => {
    const result = await runLoginFlow('0799999999', 'Password@123', { profileRows: [] });
    expect(result).toEqual({ ok: false, error: 'No account found with this phone number' });
  });

  it('✗ DB returns null → "No account found"', async () => {
    const result = await runLoginFlow('0799999999', 'Password@123', { profileRows: null });
    expect(result).toEqual({ ok: false, error: 'No account found with this phone number' });
  });

  it('✗ wrong password → friendly error', async () => {
    const result = await runLoginFlow('0729351414', 'WrongPass', {
      profileRows: [profileRow],
      signInResult: { data: null, error: { message: 'Invalid login credentials' } },
    });
    expect(result).toEqual({ ok: false, error: 'Incorrect password. Please try again.' });
  });

  it('✗ account has no email', async () => {
    const result = await runLoginFlow('0729351414', 'Password@123', {
      profileRows: [{ id: 'u1', email: null, phone: '+254729351414' }],
    });
    expect(result).toEqual({ ok: false, error: 'This account has no email set. Please contact support.' });
  });

  it('✗ DB lookup error → generic error', async () => {
    const result = await runLoginFlow('0729351414', 'Password@123', {
      profileRows: null,
      lookupError: { message: 'timeout' },
    });
    expect(result).toEqual({ ok: false, error: 'Something went wrong. Please try again.' });
  });
});
