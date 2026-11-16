/**
 * Auth tests — login (phone-only) & registration
 *
 * Run:  node node_modules/jest/build/index.js src/__tests__/auth.test.ts --no-coverage --forceExit
 */

/// <reference types="jest" />

import { validatePhoneNumber, formatPhoneNumber } from '../utils';

// ─────────────────────────────────────────────────────────────────────────────
// 1. Phone utility unit tests
// ─────────────────────────────────────────────────────────────────────────────

describe('validatePhoneNumber', () => {
  const valid = [
    '0712345678',
    '0712 345 678',
    '0722345678',
    '0729351414',   // the real test number
    '+254729351414',
    '254729351414',
    '+254712345678',
    '0100000000',
    '0110000000',
  ];
  const invalid = ['', '123', 'abcdefghij', '0512345678', '+1 800 555 0199'];

  test.each(valid)('accepts %s', (n) => expect(validatePhoneNumber(n)).toBe(true));
  test.each(invalid)('rejects %s', (n) => expect(validatePhoneNumber(n)).toBe(false));
});

describe('formatPhoneNumber', () => {
  it('0729351414 → +254729351414', () =>
    expect(formatPhoneNumber('0729351414')).toBe('+254729351414'));
  it('0712345678 → +254712345678', () =>
    expect(formatPhoneNumber('0712345678')).toBe('+254712345678'));
  it('spaced 0712 345 678 → +254712345678', () =>
    expect(formatPhoneNumber('0712 345 678')).toBe('+254712345678'));
  it('+254712345678 unchanged', () =>
    expect(formatPhoneNumber('+254712345678')).toBe('+254712345678'));
  it('254712345678 → +254712345678', () =>
    expect(formatPhoneNumber('254712345678')).toBe('+254712345678'));
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Phone format expansion — mirrors buildPhoneFormats() in login.tsx
// ─────────────────────────────────────────────────────────────────────────────

/** Exact copy of the format-building logic from login.tsx */
function buildPhoneFormats(phone: string): string[] {
  const raw = phone.trim().replace(/\s/g, '');
  const formats = new Set<string>();
  formats.add(raw);
  if (raw.startsWith('0')) {
    formats.add('+254' + raw.slice(1));
    formats.add('254' + raw.slice(1));
  }
  if (raw.startsWith('+254')) {
    formats.add('0' + raw.slice(4));
    formats.add(raw.slice(1));
  }
  if (raw.startsWith('254') && !raw.startsWith('+')) {
    formats.add('0' + raw.slice(3));
    formats.add('+' + raw);
  }
  return Array.from(formats);
}

describe('buildPhoneFormats', () => {
  it('0729351414 produces all three formats', () => {
    const f = buildPhoneFormats('0729351414');
    expect(f).toContain('0729351414');
    expect(f).toContain('+254729351414');
    expect(f).toContain('254729351414');
  });

  it('+254729351414 produces 07XX and 254XX variants', () => {
    const f = buildPhoneFormats('+254729351414');
    expect(f).toContain('+254729351414');
    expect(f).toContain('0729351414');
    expect(f).toContain('254729351414');
  });

  it('254729351414 produces +254 and 07XX variants', () => {
    const f = buildPhoneFormats('254729351414');
    expect(f).toContain('254729351414');
    expect(f).toContain('+254729351414');
    expect(f).toContain('0729351414');
  });

  it('spaced input is stripped before expansion', () => {
    const f = buildPhoneFormats('0729 351 414');
    expect(f).toContain('0729351414');
    expect(f).toContain('+254729351414');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Login form validation
// ─────────────────────────────────────────────────────────────────────────────

function validateLoginForm(phone: string, password: string): string | null {
  if (!phone.trim()) return 'Please enter your phone number';
  if (!validatePhoneNumber(phone))
    return 'Please enter a valid phone number (e.g. 0712 345 678)';
  if (!password) return 'Please enter your password';
  return null;
}

describe('Login form validation', () => {
  it('rejects empty phone', () =>
    expect(validateLoginForm('', 'pass')).toBe('Please enter your phone number'));
  it('rejects whitespace phone', () =>
    expect(validateLoginForm('   ', 'pass')).toBe('Please enter your phone number'));
  it('rejects invalid phone 0512345678', () =>
    expect(validateLoginForm('0512345678', 'pass')).toBe(
      'Please enter a valid phone number (e.g. 0712 345 678)'
    ));
  it('rejects too-short number', () =>
    expect(validateLoginForm('0712', 'pass')).toBe(
      'Please enter a valid phone number (e.g. 0712 345 678)'
    ));
  it('rejects empty password', () =>
    expect(validateLoginForm('0729351414', '')).toBe('Please enter your password'));
  it('passes 0729351414 + Password@123', () =>
    expect(validateLoginForm('0729351414', 'Password@123')).toBeNull());
  it('passes spaced 0712 345 678', () =>
    expect(validateLoginForm('0712 345 678', 'pass')).toBeNull());
  it('passes +254 format', () =>
    expect(validateLoginForm('+254729351414', 'pass')).toBeNull());
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Registration form validation
// ─────────────────────────────────────────────────────────────────────────────

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

describe('Registration form validation', () => {
  const g = { fullName: 'Jane Doe', phone: '0729351414', email: 'jane@example.com', password: 'Password@123' };
  it('passes all valid fields', () =>
    expect(validateRegisterForm(g.fullName, g.phone, g.email, g.password)).toBeNull());
  it('rejects empty name', () =>
    expect(validateRegisterForm('', g.phone, g.email, g.password)).toBe('Please enter your full name'));
  it('rejects whitespace name', () =>
    expect(validateRegisterForm('  ', g.phone, g.email, g.password)).toBe('Please enter your full name'));
  it('rejects invalid phone', () =>
    expect(validateRegisterForm(g.fullName, '123', g.email, g.password)).toBe(
      'Please enter a valid phone number (e.g. 0712 345 678)'
    ));
  it('rejects email without @', () =>
    expect(validateRegisterForm(g.fullName, g.phone, 'notanemail', g.password)).toBe(
      'Please enter a valid email address'
    ));
  it('rejects email without dot', () =>
    expect(validateRegisterForm(g.fullName, g.phone, 'user@nodot', g.password)).toBe(
      'Please enter a valid email address'
    ));
  it('rejects password < 8 chars', () =>
    expect(validateRegisterForm(g.fullName, g.phone, g.email, 'short')).toBe(
      'Password must be at least 8 characters'
    ));
  it('accepts exactly 8-char password', () =>
    expect(validateRegisterForm(g.fullName, g.phone, g.email, '12345678')).toBeNull());
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Login integration — mirrors the CURRENT login.tsx flow exactly
//    (in() query with all phone formats → signInWithPassword → fetch profile)
// ─────────────────────────────────────────────────────────────────────────────

const mockSignIn = jest.fn();
const mockSignUp = jest.fn();
const mockFrom = jest.fn();

jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...a: any[]) => mockSignIn(...a),
      signUp: (...a: any[]) => mockSignUp(...a),
    },
    from: (t: string) => mockFrom(t),
  },
}));

/**
 * Mirrors handleLogin() in login.tsx exactly — same in() query, same error paths.
 */
async function loginWithPhone(
  phone: string,
  password: string,
  db: any
): Promise<{ session: any; profile: any } | { error: string }> {
  const raw = phone.trim().replace(/\s/g, '');
  const formats = new Set<string>();
  formats.add(raw);
  if (raw.startsWith('0')) {
    formats.add('+254' + raw.slice(1));
    formats.add('254' + raw.slice(1));
  }
  if (raw.startsWith('+254')) {
    formats.add('0' + raw.slice(4));
    formats.add(raw.slice(1));
  }
  if (raw.startsWith('254') && !raw.startsWith('+')) {
    formats.add('0' + raw.slice(3));
    formats.add('+' + raw);
  }

  const { data: profiles, error: lookupError } = await db
    .from('profiles')
    .select('id, email, phone')
    .in('phone', Array.from(formats))
    .limit(1);

  if (lookupError) return { error: 'Something went wrong. Please try again.' };

  const profileData = profiles?.[0] ?? null;
  if (!profileData) return { error: 'No account found with this phone number' };
  if (!profileData.email) return { error: 'This account has no email set. Please contact support.' };

  const { data, error: signInError } = await db.auth.signInWithPassword({
    email: profileData.email,
    password,
  });

  if (signInError) {
    return {
      error: signInError.message.toLowerCase().includes('invalid')
        ? 'Incorrect password. Please try again.'
        : signInError.message,
    };
  }

  const { data: fullProfile } = await db
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  return { session: data.session, profile: fullProfile };
}

// ── helper: build the mock chain for the in() lookup ──────────────────────

function mockInLookup(returnProfiles: any[] | null, error: any = null) {
  mockFrom.mockReturnValueOnce({
    select: () => ({
      in: () => ({
        limit: () => Promise.resolve({ data: returnProfiles, error }),
      }),
    }),
  });
}

function mockProfileFetch(profile: any) {
  mockFrom.mockReturnValueOnce({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({ data: profile, error: null }),
      }),
    }),
  });
}

// ── Login integration tests ───────────────────────────────────────────────

describe('Login with phone — integration (mocked Supabase)', () => {
  const { supabase: db } = require('../lib/supabase');
  beforeEach(() => jest.clearAllMocks());

  // ── happy path ────────────────────────────────────────────────────────────

  it('signs in successfully with 07XX format (0729351414)', async () => {
    const fakeUser    = { id: 'user-abc' };
    const fakeSession = { access_token: 'tok-abc', user: fakeUser };
    const fakeProfile = { id: 'user-abc', full_name: 'Test User', role: 'customer', phone: '+254729351414' };

    mockInLookup([{ id: 'user-abc', email: 'test@example.com', phone: '+254729351414' }]);
    mockSignIn.mockResolvedValueOnce({ data: { user: fakeUser, session: fakeSession }, error: null });
    mockProfileFetch(fakeProfile);

    const result = await loginWithPhone('0729351414', 'Password@123', db);

    expect(result).toEqual({ session: fakeSession, profile: fakeProfile });
    // Must sign in with email, never with phone
    expect(mockSignIn).toHaveBeenCalledWith({ email: 'test@example.com', password: 'Password@123' });
  });

  it('signs in successfully with +254 format', async () => {
    const fakeUser    = { id: 'user-xyz' };
    const fakeSession = { access_token: 'tok-xyz', user: fakeUser };
    const fakeProfile = { id: 'user-xyz', full_name: 'Test User', role: 'customer' };

    mockInLookup([{ id: 'user-xyz', email: 'test2@example.com', phone: '+254729351414' }]);
    mockSignIn.mockResolvedValueOnce({ data: { user: fakeUser, session: fakeSession }, error: null });
    mockProfileFetch(fakeProfile);

    const result = await loginWithPhone('+254729351414', 'Password@123', db);
    expect(result).toEqual({ session: fakeSession, profile: fakeProfile });
  });

  it('signs in successfully with spaced number 0729 351 414', async () => {
    const fakeUser    = { id: 'user-spaced' };
    const fakeSession = { access_token: 'tok-spaced', user: fakeUser };
    const fakeProfile = { id: 'user-spaced', full_name: 'Spaced User', role: 'customer' };

    mockInLookup([{ id: 'user-spaced', email: 'spaced@example.com', phone: '+254729351414' }]);
    mockSignIn.mockResolvedValueOnce({ data: { user: fakeUser, session: fakeSession }, error: null });
    mockProfileFetch(fakeProfile);

    const result = await loginWithPhone('0729 351 414', 'Password@123', db);
    expect(result).toEqual({ session: fakeSession, profile: fakeProfile });
  });

  // ── phone not found ───────────────────────────────────────────────────────

  it('returns "no account" when phone not in DB', async () => {
    mockInLookup([]); // empty array = no match
    const result = await loginWithPhone('0799999999', 'Password@123', db);
    expect(result).toEqual({ error: 'No account found with this phone number' });
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('returns "no account" when DB returns null', async () => {
    mockInLookup(null);
    const result = await loginWithPhone('0799999999', 'Password@123', db);
    expect(result).toEqual({ error: 'No account found with this phone number' });
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  // ── wrong password ────────────────────────────────────────────────────────

  it('returns friendly error on wrong password', async () => {
    mockInLookup([{ id: 'u1', email: 'test@example.com', phone: '+254729351414' }]);
    mockSignIn.mockResolvedValueOnce({
      data: null,
      error: { message: 'Invalid login credentials' },
    });

    const result = await loginWithPhone('0729351414', 'WrongPass', db);
    expect(result).toEqual({ error: 'Incorrect password. Please try again.' });
  });

  // ── account has no email ──────────────────────────────────────────────────

  it('returns error when profile has no email', async () => {
    mockInLookup([{ id: 'u2', email: null, phone: '+254729351414' }]);
    const result = await loginWithPhone('0729351414', 'Password@123', db);
    expect(result).toEqual({ error: 'This account has no email set. Please contact support.' });
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  // ── DB lookup error ───────────────────────────────────────────────────────

  it('returns generic error on DB lookup failure', async () => {
    mockInLookup(null, { message: 'connection timeout' });
    const result = await loginWithPhone('0729351414', 'Password@123', db);
    expect(result).toEqual({ error: 'Something went wrong. Please try again.' });
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  // ── in() receives all formats ─────────────────────────────────────────────

  it('passes all phone formats to the in() lookup', async () => {
    let capturedInValues: string[] = [];
    mockFrom.mockReturnValueOnce({
      select: () => ({
        in: (_column: string, values: string[]) => {
          capturedInValues = values;
          return { limit: () => Promise.resolve({ data: [], error: null }) };
        },
      }),
    });

    await loginWithPhone('0729351414', 'Password@123', db);

    expect(capturedInValues).toContain('0729351414');
    expect(capturedInValues).toContain('+254729351414');
    expect(capturedInValues).toContain('254729351414');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Registration integration
// ─────────────────────────────────────────────────────────────────────────────

async function registerUser(
  params: { email: string; password: string; phone: string; fullName: string; role: string },
  db: any
): Promise<{ session: any; profile: any } | { error: string }> {
  const { data, error } = await db.auth.signUp({
    email: params.email,
    password: params.password,
    options: { data: { phone: params.phone, full_name: params.fullName, role: params.role } },
  });
  if (error) return { error: error.message };
  if (!data?.user) return { error: 'Sign up failed — no user returned.' };

  const profileResult = await db
    .from('profiles')
    .upsert(
      { id: data.user.id, phone: params.phone, email: params.email,
        full_name: params.fullName, role: params.role,
        is_approved: params.role === 'seller' ? false : true },
      { onConflict: 'id' }
    )
    .select()
    .single();

  if (profileResult.error) return { error: profileResult.error.message };
  return { session: data.session, profile: profileResult.data };
}

describe('Registration — integration (mocked Supabase)', () => {
  const { supabase: db } = require('../lib/supabase');
  beforeEach(() => jest.clearAllMocks());

  it('creates customer account successfully', async () => {
    const fakeUser    = { id: 'new-456' };
    const fakeSession = { access_token: 'new-tok' };
    const fakeProfile = { id: 'new-456', full_name: 'John Doe', phone: '+254729351414',
                          email: 'john@example.com', role: 'customer', is_approved: true };

    mockSignUp.mockResolvedValueOnce({ data: { user: fakeUser, session: fakeSession }, error: null });
    mockFrom.mockReturnValue({
      upsert: () => ({ select: () => ({ single: () => Promise.resolve({ data: fakeProfile, error: null }) }) }),
    });

    const result = await registerUser(
      { email: 'john@example.com', password: 'Password@123',
        phone: '+254729351414', fullName: 'John Doe', role: 'customer' },
      db
    );
    expect(result).toEqual({ session: fakeSession, profile: fakeProfile });
    expect(mockSignUp).toHaveBeenCalledWith(expect.objectContaining({ email: 'john@example.com' }));
  });

  it('sets is_approved=false for seller', async () => {
    const fakeUser = { id: 'seller-789' };
    mockSignUp.mockResolvedValueOnce({ data: { user: fakeUser, session: null }, error: null });

    let upsertedData: any = null;
    mockFrom.mockReturnValue({
      upsert: (data: any) => {
        upsertedData = data;
        return { select: () => ({ single: () => Promise.resolve({ data: { ...data }, error: null }) }) };
      },
    });

    await registerUser(
      { email: 'seller@example.com', password: 'Password@123',
        phone: '+254722345678', fullName: 'Seller Sam', role: 'seller' },
      db
    );
    expect(upsertedData).toMatchObject({ is_approved: false, role: 'seller' });
  });

  it('returns error when email already taken', async () => {
    mockSignUp.mockResolvedValueOnce({ data: null, error: { message: 'User already registered' } });
    const result = await registerUser(
      { email: 'existing@example.com', password: 'Password@123',
        phone: '+254712345678', fullName: 'Existing', role: 'customer' },
      db
    );
    expect(result).toEqual({ error: 'User already registered' });
  });

  it('returns error when profile upsert fails', async () => {
    const fakeUser = { id: 'fail-user' };
    mockSignUp.mockResolvedValueOnce({ data: { user: fakeUser, session: null }, error: null });
    mockFrom.mockReturnValue({
      upsert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: null, error: { message: 'duplicate key value' } }),
        }),
      }),
    });

    const result = await registerUser(
      { email: 'fail@example.com', password: 'Password@123',
        phone: '+254712345678', fullName: 'Fail User', role: 'customer' },
      db
    );
    expect(result).toEqual({ error: 'duplicate key value' });
  });
});
