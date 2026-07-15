import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { changePasswordSchema, managedPasswordSchema, passwordLoginSchema } from "../src/validations/auth.js";
import { getPasswordRequirements, getPasswordUtf8Bytes, isStrongPassword } from "../src/utils/password-policy.js";

test("password login accepts email and supported Indian phone identifiers", () => {
  assert.equal(passwordLoginSchema.parse({ identifier: " admin@dailyveg.co.in ", password: " secret " }).identifier, "admin@dailyveg.co.in");
  assert.equal(passwordLoginSchema.safeParse({ identifier: "9990000001", password: "secret" }).success, true);
  assert.equal(passwordLoginSchema.safeParse({ identifier: "919990000001", password: "secret" }).success, true);
  assert.equal(passwordLoginSchema.safeParse({ identifier: "123", password: "secret" }).success, false);
});

test("login and password-management schemas never trim password values", () => {
  const login = passwordLoginSchema.parse({ identifier: "9990000001", password: " padded password " });
  assert.equal(login.password, " padded password ");
  const managed = managedPasswordSchema.parse({ password: " StrongPass@2026 ", confirm_password: " StrongPass@2026 " });
  assert.equal(managed.password, " StrongPass@2026 ");
});

test("shared strong-password policy checks every rule and UTF-8 byte length", () => {
  assert.equal(isStrongPassword("SecurePass@2026"), true);
  assert.equal(isStrongPassword("weak-password"), false);
  assert.equal(getPasswordRequirements("SecurePass@2026").every((rule) => rule.met), true);
  const unicodeHeavy = `Aa1!${"🙂".repeat(18)}`;
  assert.ok(getPasswordUtf8Bytes(unicodeHeavy) > 72);
  assert.equal(isStrongPassword(unicodeHeavy), false);
});

test("change-password validation checks confirmation and current-password reuse", () => {
  assert.equal(changePasswordSchema.safeParse({ current_password: "OldPassword@2026", new_password: "NewPassword@2026", confirm_password: "MismatchPass@2026" }).success, false);
  assert.equal(changePasswordSchema.safeParse({ current_password: "SamePassword@2026", new_password: "SamePassword@2026", confirm_password: "SamePassword@2026" }).success, false);
  assert.equal(changePasswordSchema.safeParse({ current_password: "OldPassword@2026", new_password: "NewPassword@2026", confirm_password: "NewPassword@2026" }).success, true);
});

test("password endpoints and public-login no-refresh protection are wired", async () => {
  const endpoints = await readFile(new URL("../src/api/endpoints.js", import.meta.url), "utf8");
  const axiosSource = await readFile(new URL("../src/api/axios.js", import.meta.url), "utf8");
  const authService = await readFile(new URL("../src/api/services/auth.service.js", import.meta.url), "utf8");
  assert.match(endpoints, /passwordLogin: "\/v1\/auth\/password\/login"/);
  assert.match(endpoints, /changePassword: "\/v1\/auth\/password"/);
  assert.match(endpoints, /`\/v1\/admin\/users\/\$\{id\}\/password-login`/);
  assert.match(axiosSource, /NO_REFRESH_ENDPOINTS[\s\S]*ENDPOINTS\.auth\.passwordLogin/);
  assert.match(authService, /loginWithPassword[\s\S]*ENDPOINTS\.auth\.passwordLogin/);
});

test("login defaults to password while retaining isolated OTP forms and safe wording", async () => {
  const source = await readFile(new URL("../src/pages/auth/login-page.jsx", import.meta.url), "utf8");
  assert.match(source, /useState\("password"\)/);
  assert.match(source, /passwordLoginForm/);
  assert.match(source, /otpPhoneForm/);
  assert.match(source, /otpVerifyForm/);
  assert.match(source, /One-time password/);
  assert.doesNotMatch(source, /OTP or admin access code|special OTP|static OTP|master OTP|OTP bypass/i);
});
