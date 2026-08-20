const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export function validateEmail(value) { return typeof value === "string" && EMAIL.test(value); }
export function validateId(value) { return typeof value === "string" && value.length > 0; }
