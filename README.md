# CFPB — Consumer Financial Protection Bureau

The CFPB's Consumer Complaint Database. Every consumer complaint filed with the CFPB about a financial product (mortgages, credit cards, debt collection, banking, payments, student loans, etc.), tagged with company, product, issue, response, and outcome. ~5M+ complaints since 2011. Free, no auth, public.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1476+ live data sources.

## Why this matters for AI agents

For consumer-finance risk assessment, brand reputation analysis, or "is this company's posture deteriorating?" questions, CFPB complaints are the canonical leading indicator. Spikes correlate with brewing reputational issues, often before they show up in earnings.

Common flows:

- **Company posture.** `cfpb_company_complaints({company: "Wells Fargo"})` → complaint volume by year, product, issue.
- **Product breakdown.** `cfpb_product_breakdown` → industry-wide distribution of complaints across product categories.
- **Issue-level drilldown.** Filter by issue tags (e.g., "Charged fees or interest you didn't expect").

Used by the `fintech_company_deep_dive` compound and the `financial_health_check` recipe.

## Auth

None. The CFPB Consumer Complaint Database is fully public.

## Product taxonomy

CFPB groups complaints into a stable taxonomy:

| Top-level product | Examples |
|---|---|
| Credit card or prepaid card | Credit card, store card, prepaid |
| Checking or savings account | Bank account, ATM |
| Mortgage | Conventional, FHA, VA, reverse |
| Debt collection | Consumer debt, payday loans, legal pursuit |
| Credit reporting | Bureau disputes, identity theft |
| Money transfer / virtual currency | Wires, crypto, P2P |
| Payday loan / title loan | Short-term lending |
| Student loan | Federal, private |

Product-level complaint volume varies massively. A bank with high mortgage complaints isn't directly comparable to a fintech with high "money transfer" complaints — context matters.

## Update cadence

Daily. Complaints generally appear within ~15 days of submission. Consumer responses (whether the user marked the company response as "satisfactory") trickle in over weeks.

## Common pitfalls

- **Volume ≠ wrongdoing.** A bank with 100,000 customers and 100 complaints has a low rate; a tiny lender with 1,000 customers and 50 complaints has a much higher rate. Always normalize by customer base or AUM where possible.
- **Company name normalization.** "JPMorgan Chase," "JPMorgan Chase Bank, N.A.," "Chase" — all the same company in different contexts. CFPB normalizes to a "company" field; verify by searching multiple variants.
- **Response status meaning.** "Closed with relief," "Closed without relief," "Closed with monetary relief" — these are the company's own classification of the outcome. Read the per-complaint narrative for context.
- **Selection bias.** Not every dissatisfied customer files with the CFPB. Volume reflects awareness of the CFPB as a recourse, not pure customer dissatisfaction. Trends over time are more meaningful than absolute counts.
- **Industry comparisons.** Use `cfpb_product_breakdown` to anchor a company's volume against industry baseline before judging.

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "cfpb": {
      "url": "https://gateway.pipeworx.io/cfpb/mcp"
    }
  }
}
```

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/cfpb/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1476+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Cfpb data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
