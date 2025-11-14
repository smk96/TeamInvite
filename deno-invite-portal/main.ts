import { Application, Router } from "@oak/oak";
import { dirname, fromFileUrl, join } from "@std/path";

const app = new Application();
const router = new Router();

// Configuration
const API_BASE = "https://chatgpt.com/backend-api";
const ACCOUNT_ID = Deno.env.get("CHATGPT_ACCOUNT_ID") || "11045a20-bdb4-444f-9bd6-768640226554";
const TOKEN = Deno.env.get("CHATGPT_BEARER_TOKEN");

const DEFAULT_USER_AGENT = Deno.env.get(
  "CHATGPT_IMPERSONATE_UA"
) || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Runtime configuration
const runtimeConfig = {
  token: TOKEN,
  accountId: ACCOUNT_ID,
};

interface InviteRequest {
  emails: string[];
  role: string;
  resend: boolean;
}

interface InviteResponse {
  success: boolean;
  statusCode?: number;
  data?: unknown;
  error?: string;
}

function buildInviteUrl(accountId: string): string {
  return `${API_BASE}/accounts/${accountId}/invites`;
}

function buildInviteHeaders(token: string, accountId: string): HeadersInit {
  return {
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
    "chatgpt-account-id": accountId,
    "Origin": "https://chatgpt.com",
    "Referer": "https://chatgpt.com/",
    "User-Agent": DEFAULT_USER_AGENT,
  };
}

async function sendInvitesApi(
  emails: string[],
  role: string,
  resend: boolean
): Promise<InviteResponse> {
  const currentToken = runtimeConfig.token || TOKEN;
  if (!currentToken) {
    return {
      success: false,
      error: "CHATGPT_BEARER_TOKEN environment variable not set",
      statusCode: undefined,
      data: null,
    };
  }

  const accountId = runtimeConfig.accountId || ACCOUNT_ID;
  const inviteUrl = buildInviteUrl(accountId);
  const headers = buildInviteHeaders(currentToken, accountId);

  const payload = {
    email_addresses: emails,
    role: role,
    resend_emails: resend,
  };

  try {
    const response = await fetch(inviteUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    let responseData;
    try {
      responseData = await response.json();
    } catch {
      responseData = { raw_response: await response.text() };
    }

    return {
      success: response.status === 200,
      statusCode: response.status,
      data: responseData,
      error: response.status === 200 ? undefined : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      success: false,
      error: `Request failed: ${error.message}`,
      statusCode: undefined,
      data: null,
    };
  }
}

// Get base directory (works in both local and deployed environments)
const baseDir = dirname(fromFileUrl(import.meta.url));

// Serve static files
router.get("/static/:file", async (ctx) => {
  const file = ctx.params.file;
  const filePath = join(baseDir, "static", file);
  
  try {
    const content = await Deno.readTextFile(filePath);
    const ext = file.split(".").pop();
    
    const contentTypes: Record<string, string> = {
      "css": "text/css",
      "js": "application/javascript",
      "html": "text/html",
    };
    
    ctx.response.headers.set("Content-Type", contentTypes[ext || ""] || "text/plain");
    ctx.response.body = content;
  } catch (error) {
    console.error(`Error loading static file ${file}:`, error);
    ctx.response.status = 404;
    ctx.response.body = "File not found";
  }
});

// Main page
router.get("/", async (ctx) => {
  try {
    const html = await Deno.readTextFile(join(baseDir, "templates", "index.html"));
    ctx.response.headers.set("Content-Type", "text/html");
    ctx.response.body = html;
  } catch (error) {
    console.error("Error loading index.html:", error);
    ctx.response.status = 500;
    ctx.response.body = "Error loading page";
  }
});

// Admin page
router.get("/admin", async (ctx) => {
  try {
    const html = await Deno.readTextFile(join(baseDir, "templates", "admin.html"));
    ctx.response.headers.set("Content-Type", "text/html");
    ctx.response.body = html;
  } catch (error) {
    console.error("Error loading admin.html:", error);
    ctx.response.status = 500;
    ctx.response.body = "Error loading page";
  }
});

// API: Send invites
router.post("/api/invite", async (ctx) => {
  try {
    const body = await ctx.request.body.json();
    
    if (!body) {
      ctx.response.status = 400;
      ctx.response.body = { error: "No JSON data provided" };
      return;
    }

    let emails = body.emails || [];
    if (!Array.isArray(emails) || emails.length === 0) {
      ctx.response.status = 400;
      ctx.response.body = { error: "emails field is required and must be a list" };
      return;
    }

    emails = emails.map((e: string) => e.trim()).filter((e: string) => e);
    if (emails.length === 0) {
      ctx.response.status = 400;
      ctx.response.body = { error: "At least one valid email is required" };
      return;
    }

    const role = body.role || "standard-user";
    const resend = body.resend || false;

    const result = await sendInvitesApi(emails, role, resend);

    ctx.response.status = result.success ? 200 : (result.statusCode || 500);
    ctx.response.body = result;
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { error: `Server error: ${error.message}` };
  }
});

// API: Get config
router.get("/api/config", (ctx) => {
  const currentToken = runtimeConfig.token || TOKEN;
  ctx.response.body = {
    available_roles: ["standard-user", "admin", "viewer"],
    account_id: runtimeConfig.accountId || ACCOUNT_ID,
    token_configured: !!currentToken,
  };
});

// API: Admin config
router.get("/api/admin/config", (ctx) => {
  const currentToken = runtimeConfig.token || TOKEN;
  ctx.response.body = {
    account_id: runtimeConfig.accountId || ACCOUNT_ID,
    token_configured: !!currentToken,
    token_preview: currentToken ? `${currentToken.substring(0, 10)}...` : null,
    env_token_configured: !!TOKEN,
    env_account_id: ACCOUNT_ID,
  };
});

router.post("/api/admin/config", async (ctx) => {
  try {
    const body = await ctx.request.body.json();
    
    if (!body) {
      ctx.response.status = 400;
      ctx.response.body = { error: "No JSON data provided" };
      return;
    }

    if (body.token) {
      runtimeConfig.token = body.token.trim() || null;
    }

    if (body.account_id) {
      runtimeConfig.accountId = body.account_id.trim() || ACCOUNT_ID;
    }

    ctx.response.body = {
      success: true,
      message: "配置已更新",
      token_configured: !!runtimeConfig.token,
      account_id: runtimeConfig.accountId,
    };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { error: `配置更新失败: ${error.message}` };
  }
});

// Health check
router.get("/health", (ctx) => {
  const currentToken = runtimeConfig.token || TOKEN;
  ctx.response.body = {
    status: "healthy",
    token_configured: !!currentToken,
  };
});

app.use(router.routes());
app.use(router.allowedMethods());

// CORS middleware
app.use(async (ctx, next) => {
  ctx.response.headers.set("Access-Control-Allow-Origin", "*");
  ctx.response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  ctx.response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  await next();
});

const PORT = parseInt(Deno.env.get("PORT") || "5000");
console.log(`🚀 ChatGPT Invite Portal starting...`);
console.log(`📍 Server running on http://localhost:${PORT}`);
console.log(`🔑 Token configured: ${TOKEN ? "Yes" : "No"}`);
console.log(`👤 Account ID: ${ACCOUNT_ID}`);
console.log(`📁 Base directory: ${baseDir}`);

await app.listen({ port: PORT });
