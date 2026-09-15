import assert from 'assert';
import { generateToken, verifyToken, getCookieOptions, setAuthCookie, clearAuthCookie } from './src/services/authService.js';
import { authenticate, requireRole } from './src/middleware/auth.js';

// Helper mock response factory
function createMockResponse() {
  return {
    statusCode: 200,
    cookies: {},
    clearedCookies: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    cookie(name, val, opts) {
      this.cookies[name] = { val, opts };
    },
    clearCookie(name, opts) {
      this.clearedCookies[name] = opts;
    },
  };
}

async function runTests() {
  console.log('--- JWT & HttpOnly Cookie Authentication Tests ---\n');

  const testUser = {
    _id: 'prof-998877',
    name: 'Dr. Alan Turing',
    role: 'PROFESSOR',
    email: 'alan.turing@university.edu',
  };

  // Test 1: JWT Signing & Verification
  console.log('1. Testing RFC 7519 JWT generation & verification...');
  const token = generateToken(testUser);
  assert.ok(typeof token === 'string' && token.split('.').length === 3, 'Token must be a valid 3-part JWT');

  const decoded = verifyToken(token);
  assert.strictEqual(decoded.userId, testUser._id);
  assert.strictEqual(decoded.name, testUser.name);
  assert.strictEqual(decoded.role, testUser.role);
  assert.strictEqual(decoded.email, testUser.email);
  console.log('   ✓ Token generated and payload claims verified\n');

  // Test 2: Cookie Configuration Options
  console.log('2. Testing HttpOnly cookie security configuration...');
  const cookieOpts = getCookieOptions();
  assert.strictEqual(cookieOpts.httpOnly, true, 'Cookie must be flagged httpOnly');
  assert.strictEqual(cookieOpts.path, '/', 'Cookie path must be root (/)');
  assert.ok(cookieOpts.maxAge > 0, 'Cookie maxAge must be greater than 0');
  console.log(`   ✓ Cookie options verified (sameSite: ${cookieOpts.sameSite}, secure: ${cookieOpts.secure})\n`);

  // Test 3: Cookie Set and Clear Helpers
  console.log('3. Testing cookie set & clear helpers...');
  const res = createMockResponse();
  setAuthCookie(res, token);
  assert.strictEqual(res.cookies['token']?.val, token);
  assert.strictEqual(res.cookies['token']?.opts?.httpOnly, true);

  clearAuthCookie(res);
  assert.ok('token' in res.clearedCookies, 'clearCookie must clear token cookie');
  console.log('   ✓ Cookie setAuthCookie and clearAuthCookie helpers verified\n');

  // Test 4: Middleware Authentication via HttpOnly Cookie
  console.log('4. Testing authentication middleware with HttpOnly cookie...');
  let nextCalled = false;
  const reqCookie = { cookies: { token }, headers: {} };
  const resCookie = createMockResponse();

  authenticate(reqCookie, resCookie, () => { nextCalled = true; });
  assert.strictEqual(nextCalled, true, 'next() must be called on valid cookie');
  assert.strictEqual(reqCookie.user?.userId, testUser._id);
  assert.strictEqual(reqCookie.user?.role, 'PROFESSOR');
  console.log('   ✓ Authenticate via req.cookies.token verified\n');

  // Test 5: Middleware Authentication via Bearer Header Fallback
  console.log('5. Testing authentication middleware with Bearer header fallback...');
  nextCalled = false;
  const reqHeader = { cookies: {}, headers: { authorization: `Bearer ${token}` } };
  const resHeader = createMockResponse();

  authenticate(reqHeader, resHeader, () => { nextCalled = true; });
  assert.strictEqual(nextCalled, true, 'next() must be called on valid Bearer header');
  assert.strictEqual(reqHeader.user?.userId, testUser._id);
  console.log('   ✓ Authenticate via Authorization Bearer header verified\n');

  // Test 6: Missing Token Rejection
  console.log('6. Testing missing token handling...');
  nextCalled = false;
  const reqEmpty = { cookies: {}, headers: {} };
  const resEmpty = createMockResponse();

  authenticate(reqEmpty, resEmpty, () => { nextCalled = true; });
  assert.strictEqual(nextCalled, false, 'next() must not be called when token is missing');
  assert.strictEqual(resEmpty.statusCode, 401);
  assert.strictEqual(resEmpty.body?.errorCode, 'UNAUTHORIZED');
  console.log('   ✓ Missing credentials properly rejected with 401 UNAUTHORIZED\n');

  // Test 7: Role-Based Access Control
  console.log('7. Testing role-based access guard...');
  const requireProfessor = requireRole('PROFESSOR');
  nextCalled = false;
  requireProfessor({ user: { role: 'PROFESSOR' } }, createMockResponse(), () => { nextCalled = true; });
  assert.strictEqual(nextCalled, true, 'Authorized role must pass');

  const requireStudent = requireRole('STUDENT');
  nextCalled = false;
  const resForbidden = createMockResponse();
  requireStudent({ user: { role: 'PROFESSOR' } }, resForbidden, () => { nextCalled = true; });
  assert.strictEqual(nextCalled, false, 'Unauthorized role must be blocked');
  assert.strictEqual(resForbidden.statusCode, 403);
  assert.strictEqual(resForbidden.body?.errorCode, 'FORBIDDEN');
  console.log('   ✓ Role-based access control verified\n');

  console.log('==============================================');
  console.log(' ALL AUTHENTICATION TESTS PASSED SUCCESSFULLY ');
  console.log('==============================================\n');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
