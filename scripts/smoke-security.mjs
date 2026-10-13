const base = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const checks = [
  [
    "invalid session token",
    "/api/me",
    { headers: { Cookie: "authjs.session-token=invalid-test-token" } },
    401,
  ],
  [
    "foreign mutation origin",
    "/api/profile",
    {
      method: "POST",
      headers: {
        Origin: "https://evil.example",
        "Content-Type": "application/json",
      },
      body: "{}",
    },
    403,
  ],
  [
    "absent mutation origin",
    "/api/profile",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    },
    403,
  ],
];
for (const [name, path, options, expected] of checks) {
  const response = await fetch(base + path, options);
  if (response.status !== expected)
    throw new Error(`${name}: expected ${expected}, got ${response.status}`);
  console.log(`PASS ${name}: HTTP ${response.status}`);
}
