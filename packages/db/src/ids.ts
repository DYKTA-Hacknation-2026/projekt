/**
 * UUIDv7 generator used for time-ordered primary keys (docs/database-design.md
 * §1.6). It is implemented locally to avoid a runtime dependency.
 */
export function uuidv7(): string {
  const timestamp = Date.now().toString(16).padStart(12, "0")
  const randomBytes = new Uint8Array(10)
  globalThis.crypto.getRandomValues(randomBytes)
  const random = Array.from(randomBytes, (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("")

  const variant = (8 + (Number.parseInt(random[3] ?? "0", 16) & 0x3)).toString(
    16
  )

  return [
    timestamp.slice(0, 8),
    timestamp.slice(8, 12),
    `7${random.slice(0, 3)}`,
    `${variant}${random.slice(4, 7)}`,
    random.slice(7, 19),
  ].join("-")
}
