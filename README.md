# mcp-cfpb

CFPB MCP — Consumer Financial Protection Bureau complaint database (free, no auth)

Part of the [Pipeworx](https://pipeworx.io) open MCP gateway.

## Tools

| Tool | Description |
|------|-------------|

## Quick Start

Add to your MCP client config:

```json
{
  "mcpServers": {
    "cfpb": {
      "url": "https://gateway.pipeworx.io/cfpb/mcp"
    }
  }
}
```

Or use the CLI:

```bash
npx pipeworx use cfpb
```

## License

MIT
