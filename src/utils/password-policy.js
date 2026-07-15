export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 64;
export const PASSWORD_MAX_UTF8_BYTES = 72;

const REQUIREMENTS = [
  { id: "length", label: "12–64 characters", test: (value) => value.length >= PASSWORD_MIN_LENGTH && value.length <= PASSWORD_MAX_LENGTH },
  { id: "uppercase", label: "At least one uppercase English letter", test: (value) => /[A-Z]/.test(value) },
  { id: "lowercase", label: "At least one lowercase English letter", test: (value) => /[a-z]/.test(value) },
  { id: "number", label: "At least one number", test: (value) => /[0-9]/.test(value) },
  { id: "special", label: "At least one special character", test: (value) => /[^A-Za-z0-9]/.test(value) },
  { id: "controls", label: "No control characters", test: (value) => !/[\u0000-\u001F\u007F-\u009F]/.test(value) },
  { id: "bytes", label: "No more than 72 UTF-8 bytes", test: (value) => getPasswordUtf8Bytes(value) <= PASSWORD_MAX_UTF8_BYTES },
];

export function getPasswordUtf8Bytes(password = "") {
  return new TextEncoder().encode(String(password)).length;
}

export function getPasswordRequirements(password = "") {
  const value = typeof password === "string" ? password : "";
  return REQUIREMENTS.map((requirement) => ({
    id: requirement.id,
    label: requirement.label,
    met: requirement.test(value),
  }));
}

export function isStrongPassword(password) {
  return typeof password === "string" && getPasswordRequirements(password).every((item) => item.met);
}
