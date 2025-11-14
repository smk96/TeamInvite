#!/usr/bin/env -S deno run --allow-net --allow-env
/**
 * Minimal self-service invite CLI tool.
 * - Reads Bearer token + account ID from env
 * - Lets you enter multiple comma-separated emails, role, and resend flag
 * - Calls the invite endpoint and prints success/failure details
 */

const API_BASE = "https://chatgpt.com/backend-api";
const ACCOUNT_ID = Deno.env.get("CHATGPT_ACCOUNT_ID") || "11045a20-bdb4-444f-9bd6-768640226554";
const TOKEN = Deno.env.get("CHATGPT_BEARER_TOKEN");
const DEFAULT_USER_AGENT = Deno.env.get("CHATGPT_IMPERSONATE_UA") ||
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function buildInviteUrl(accountId: string): string {
  return `${API_BASE}/accounts/${accountId}/invites`;
}

function buildHeaders(token: string): HeadersInit {
  return {
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
    "chatgpt-account-id": ACCOUNT_ID,
    "Origin": "https://chatgpt.com",
    "Referer": "https://chatgpt.com/",
    "User-Agent": DEFAULT_USER_AGENT,
  };
}

async function promptInput(message: string): Promise<string> {
  const buf = new Uint8Array(1024);
  await Deno.stdout.write(new TextEncoder().encode(message));
  const n = await Deno.stdin.read(buf);
  return new TextDecoder().decode(buf.subarray(0, n || 0)).trim();
}

async function promptEmails(): Promise<string[]> {
  const raw = await promptInput("Email addresses (comma separated): ");
  const emails = raw.split(",").map((e) => e.trim()).filter((e) => e);
  if (emails.length === 0) {
    throw new Error("At least one email required");
  }
  return emails;
}

async function promptRole(): Promise<string> {
  const role = await promptInput("Role [standard-user]: ");
  return role || "standard-user";
}

async function promptResend(): Promise<boolean> {
  const resend = await promptInput("Resend emails? [y/N]: ");
  return resend.toLowerCase() === "y" || resend.toLowerCase() === "yes";
}

async function sendInvites(
  emails: string[],
  role: string,
  resend: boolean
): Promise<Response> {
  if (!TOKEN) {
    throw new Error("CHATGPT_BEARER_TOKEN env var not set");
  }

  const inviteUrl = buildInviteUrl(ACCOUNT_ID);
  const headers = buildHeaders(TOKEN);
  const payload = {
    email_addresses: emails,
    role: role,
    resend_emails: resend,
  };

  try {
    return await fetch(inviteUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
  } catch (error) {
    throw new Error(`Invite request failed: ${error.message}`);
  }
}

async function main() {
  console.log("=== ChatGPT Invite Portal (CLI) ===\n");

  try {
    const emails = await promptEmails();
    const role = await promptRole();
    const resend = await promptResend();

    console.log("\nSending invites...");
    const response = await sendInvites(emails, role, resend);

    console.log(`\nStatus: ${response.status}`);

    try {
      const data = await response.json();
      console.log(JSON.stringify(data, null, 2));
    } catch {
      console.log(await response.text());
    }

    if (response.status === 200) {
      console.log("\n✅ Invites sent successfully!");
    } else {
      console.log("\n❌ Failed to send invites");
      Deno.exit(1);
    }
  } catch (error) {
    if (error.message === "Interrupted") {
      console.log("\n\nCanceled by user.");
      Deno.exit(0);
    }
    console.error(`\nError: ${error.message}`);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}
