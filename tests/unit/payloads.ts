/** Hostile inputs reused across tests. */
export const XSS = [
  "<script>alert(1)</script>",
  '"><img src=x onerror=alert(1)>',
  "javascript:alert(1)",
  "<svg/onload=alert(1)>",
  "'><iframe src=javascript:alert(1)>",
  "{{constructor.constructor('alert(1)')()}}",
];
export const SQLI = [
  "' OR '1'='1",
  "'; DROP TABLE enquiries; --",
  '{"$gt": ""}',
  "admin'--",
  "1; SELECT * FROM users",
];
export const REGEX_BOMBS = ["(a+)+$", "[", "\\", "(?<x>", "*", ".*.*.*.*", "((((((((((", "\\u0000"];
export const TRAVERSAL = [
  "../../etc/passwd",
  "..\\..\\windows\\win.ini",
  "%2e%2e%2f%2e%2e%2fetc",
  "/etc/passwd",
  "a/../../b",
  "....//....//",
];
