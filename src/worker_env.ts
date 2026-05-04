export type Env = {
    DB?: D1Database;
    poster_approvals?: D1Database;
    SHOPIFY_SHOP_DOMAIN: string;
    SHOPIFY_API_VERSION: string;
    SHOPIFY_API_KEY: string;
    SHOPIFY_API_SECRET: string;
    ADMIN_PASSWORD?: string;
    PUBLIC_BASE_URL?: string;
    ADMIN_NOTIFY_EMAIL?: string;
    /** Optional: where poster reservation lead notifications should go (Klaviyo profile email). */
    LEAD_NOTIFY_EMAIL?: string;
    /** Optional: POST JSON on customer approve / edits / decline (Slack Incoming Webhook, Zapier, etc.). */
    ADMIN_WEBHOOK_URL?: string;
    THEME_APPROVAL_PAGE_URL?: string;
    KLAVIYO_PRIVATE_API_KEY?: string;
  
    /** OpenPhone SMS automation */
    OPENPHONE_API_KEY?: string;
    /** OpenPhone "from" number id, e.g. "PNxxxx" */
    OPENPHONE_FROM_NUMBER_ID?: string;
  
    SMS_AUTOMATION?: DurableObjectNamespace;
  };
  
  