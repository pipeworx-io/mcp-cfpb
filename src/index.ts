interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
}

/**
 * CFPB MCP — Consumer Financial Protection Bureau complaint database (free, no auth)
 *
 * Tools:
 * - cfpb_search_complaints: search consumer complaints by keyword, company, product, or date
 * - cfpb_company_complaints: get complaints for a specific company
 * - cfpb_get_complaint: get a single complaint by ID
 * - cfpb_top_companies: get companies with most complaints in a period
 * - cfpb_product_breakdown: complaint counts by product category
 *
 * API: https://www.consumerfinance.gov/data-research/consumer-complaints/search/api/v1/
 */


const BASE_URL = 'https://www.consumerfinance.gov/data-research/consumer-complaints/search/api/v1/';

const tools: McpToolExport['tools'] = [
  {
    name: 'cfpb_search_complaints',
    description:
      'Search the CFPB consumer complaint database. Filter by keyword, company, product category, and date range. Returns complaint narratives, company responses, and resolution status.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search term (e.g., "overdraft fees", "denied claim"). Optional if other filters provided.' },
        company: { type: 'string', description: 'Company name to filter by (e.g., "BANK OF AMERICA", "WELLS FARGO")' },
        product: {
          type: 'string',
          description:
            'Product category (e.g., "Credit card", "Mortgage", "Student loan", "Vehicle loan or lease", "Checking or savings account", "Credit reporting", "Debt collection")',
        },
        start_date: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
        end_date: { type: 'string', description: 'End date in YYYY-MM-DD format' },
        limit: { type: 'number', description: 'Number of results (1-100, default 25)' },
      },
    },
  },
  {
    name: 'cfpb_company_complaints',
    description:
      'Get recent consumer complaints for a specific company, sorted by newest first. Returns complaint details and company response information.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        company: { type: 'string', description: 'Company name (e.g., "BANK OF AMERICA", "CITIBANK", "JPMORGAN CHASE")' },
        limit: { type: 'number', description: 'Number of results (1-100, default 25)' },
      },
      required: ['company'],
    },
  },
  {
    name: 'cfpb_get_complaint',
    description:
      'Get full details for a single consumer complaint by its complaint ID number.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        complaint_id: { type: 'string', description: 'CFPB complaint ID number' },
      },
      required: ['complaint_id'],
    },
  },
  {
    name: 'cfpb_top_companies',
    description:
      'Get the companies with the most consumer complaints in a given date range. Useful for identifying which companies receive the most complaints.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        start_date: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
        end_date: { type: 'string', description: 'End date in YYYY-MM-DD format' },
        product: { type: 'string', description: 'Optional product filter (e.g., "Mortgage", "Credit card")' },
        limit: { type: 'number', description: 'Number of top companies to return (default 10)' },
      },
    },
  },
  {
    name: 'cfpb_product_breakdown',
    description:
      'Get complaint counts broken down by product category. Optionally filter by company and/or date range.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        company: { type: 'string', description: 'Optional company name to filter by' },
        start_date: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
        end_date: { type: 'string', description: 'End date in YYYY-MM-DD format' },
      },
    },
  },
];

// ── Types ───────────────────────────────────────────────────────────

interface CfpbHit {
  _source: {
    complaint_id: string;
    date_received: string;
    product: string;
    sub_product?: string;
    issue: string;
    sub_issue?: string;
    complaint_what_happened?: string;
    company: string;
    state?: string;
    zip_code?: string;
    company_public_response?: string;
    company_response: string;
    timely?: string;
    consumer_disputed?: string;
    consumer_consent_provided?: string;
    submitted_via?: string;
    date_sent_to_company?: string;
    tags?: string;
  };
}

interface CfpbResponse {
  hits: {
    hits: CfpbHit[];
    total: number;
  };
  aggregations?: {
    company?: { buckets: { key: string; doc_count: number }[] };
    product?: { buckets: { key: string; doc_count: number }[] };
  };
  _meta?: { total_record_count: number };
}

// ── Helpers ─────────────────────────────────────────────────────────

function formatComplaint(hit: CfpbHit) {
  const s = hit._source;
  return {
    complaint_id: s.complaint_id,
    date_received: s.date_received,
    product: s.product,
    sub_product: s.sub_product ?? null,
    issue: s.issue,
    sub_issue: s.sub_issue ?? null,
    narrative: s.complaint_what_happened ?? null,
    company: s.company,
    state: s.state ?? null,
    company_response: s.company_response,
    company_public_response: s.company_public_response ?? null,
    timely: s.timely ?? null,
    consumer_disputed: s.consumer_disputed ?? null,
    submitted_via: s.submitted_via ?? null,
  };
}

// ── Tool implementations ────────────────────────────────────────────

async function searchComplaints(
  query?: string,
  company?: string,
  product?: string,
  startDate?: string,
  endDate?: string,
  limit?: number,
) {
  const size = Math.min(100, Math.max(1, limit ?? 25));
  const params = new URLSearchParams({ size: String(size), sort: 'created_date_desc', field: 'all' });

  if (query) params.set('search_term', query);
  if (company) params.set('company', company);
  if (product) params.set('product', product);
  if (startDate) params.set('date_received_min', startDate);
  if (endDate) params.set('date_received_max', endDate);

  const res = await fetch(`${BASE_URL}?${params}`);
  if (!res.ok) throw new Error(`CFPB API error: ${res.status}`);

  const data = (await res.json()) as CfpbResponse;

  return {
    query: query ?? null,
    filters: {
      company: company ?? null,
      product: product ?? null,
      date_range: { start: startDate ?? null, end: endDate ?? null },
    },
    total: data.hits?.total ?? 0,
    complaints: (data.hits?.hits ?? []).map(formatComplaint),
  };
}

async function companyComplaints(company: string, limit?: number) {
  const size = Math.min(100, Math.max(1, limit ?? 25));
  const params = new URLSearchParams({
    company,
    size: String(size),
    sort: 'created_date_desc',
  });

  const res = await fetch(`${BASE_URL}?${params}`);
  if (!res.ok) throw new Error(`CFPB API error: ${res.status}`);

  const data = (await res.json()) as CfpbResponse;

  return {
    company,
    total: data.hits?.total ?? 0,
    complaints: (data.hits?.hits ?? []).map(formatComplaint),
  };
}

async function getComplaint(complaintId: string) {
  const res = await fetch(`${BASE_URL}${encodeURIComponent(complaintId)}`);
  if (!res.ok) throw new Error(`CFPB API error: ${res.status} — complaint ID "${complaintId}" may not exist`);

  const data = (await res.json()) as { hits: { hits: CfpbHit[]; total: number } };

  if (!data.hits?.hits?.length) {
    throw new Error(`Complaint not found: ${complaintId}`);
  }

  return formatComplaint(data.hits.hits[0]);
}

async function topCompanies(startDate?: string, endDate?: string, product?: string, limit?: number) {
  const count = Math.min(50, Math.max(1, limit ?? 10));
  const params = new URLSearchParams({ size: '0', field: 'all' });

  if (startDate) params.set('date_received_min', startDate);
  if (endDate) params.set('date_received_max', endDate);
  if (product) params.set('product', product);

  const res = await fetch(`${BASE_URL}?${params}`);
  if (!res.ok) throw new Error(`CFPB API error: ${res.status}`);

  const data = (await res.json()) as CfpbResponse;
  const buckets = data.aggregations?.company?.buckets ?? [];

  return {
    filters: {
      product: product ?? null,
      date_range: { start: startDate ?? null, end: endDate ?? null },
    },
    total_complaints: data.hits?.total ?? 0,
    top_companies: buckets.slice(0, count).map((b, i) => ({
      rank: i + 1,
      company: b.key,
      complaint_count: b.doc_count,
    })),
  };
}

async function productBreakdown(company?: string, startDate?: string, endDate?: string) {
  const params = new URLSearchParams({ size: '0', field: 'all' });

  if (company) params.set('company', company);
  if (startDate) params.set('date_received_min', startDate);
  if (endDate) params.set('date_received_max', endDate);

  const res = await fetch(`${BASE_URL}?${params}`);
  if (!res.ok) throw new Error(`CFPB API error: ${res.status}`);

  const data = (await res.json()) as CfpbResponse;
  const buckets = data.aggregations?.product?.buckets ?? [];

  return {
    filters: {
      company: company ?? null,
      date_range: { start: startDate ?? null, end: endDate ?? null },
    },
    total_complaints: data.hits?.total ?? 0,
    products: buckets.map((b) => ({
      product: b.key,
      complaint_count: b.doc_count,
    })),
  };
}

// ── callTool router ─────────────────────────────────────────────────

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'cfpb_search_complaints':
      return searchComplaints(
        args.query as string | undefined,
        args.company as string | undefined,
        args.product as string | undefined,
        args.start_date as string | undefined,
        args.end_date as string | undefined,
        args.limit as number | undefined,
      );
    case 'cfpb_company_complaints':
      return companyComplaints(args.company as string, args.limit as number | undefined);
    case 'cfpb_get_complaint':
      return getComplaint(args.complaint_id as string);
    case 'cfpb_top_companies':
      return topCompanies(
        args.start_date as string | undefined,
        args.end_date as string | undefined,
        args.product as string | undefined,
        args.limit as number | undefined,
      );
    case 'cfpb_product_breakdown':
      return productBreakdown(
        args.company as string | undefined,
        args.start_date as string | undefined,
        args.end_date as string | undefined,
      );
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export default { tools, callTool, meter: { credits: 5 } } satisfies McpToolExport;
