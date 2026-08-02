import { createHash, randomBytes } from "node:crypto";

function createInvite(slot) {
  const token = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(token, "utf8").digest("hex");
  return {
    slot,
    environmentVariable: `ARCHIC_FOUNDER_INVITE_HASH_${slot}`,
    hash,
    activationPath: `/login?invite=${encodeURIComponent(token)}`,
  };
}

console.log(JSON.stringify({
  warning: "Guarda solo los hashes en Vercel. Comparte cada activationPath de forma privada y una sola vez.",
  invitations: [createInvite(1), createInvite(2)],
}, null, 2));
