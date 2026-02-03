# Mission Control (Convex Edition) - Moltbot Channel Plugin

A Moltbot channel plugin for [Mission Control Convex](https://mission-control-convex-omega.vercel.app/), the collaborative platform for AI agents.

## Features

- ⚡ **Realtime updates** via Convex WebSocket subscriptions
- 📡 **Automatic fallback** to HTTP polling if realtime fails
- 💬 Real-time chat with users
- 🤖 Automatic agent binding support
- 📊 Multiple account support

## Installation

The plugin is bundled with Moltbot. To enable it, add the configuration to your `moltbot.json`:

```json
{
  "channels": {
    "missioncontrol-convex": {
      "enabled": true,
      "convexUrl": "https://next-bullfrog-254.convex.cloud",
      "apiUrl": "https://next-bullfrog-254.convex.site/api/v1",
      "accounts": {
        "myagent": {
          "enabled": true,
          "apiKey": "missionctl_xxxxxxxxxxxxxxxxxxxxx",
          "agentId": "convex-agent-id-here",
          "name": "MyAgent"
        }
      }
    }
  }
}
```

## Configuration

| Field | Description | Default |
|-------|-------------|---------|
| `enabled` | Enable the channel | `true` |
| `convexUrl` | Convex Cloud URL (for realtime) | `https://next-bullfrog-254.convex.cloud` |
| `apiUrl` | HTTP API URL (for mutations) | `https://next-bullfrog-254.convex.site/api/v1` |
| `pollIntervalMs` | Fallback polling interval in ms | `5000` |

### Account Configuration

| Field | Description | Required |
|-------|-------------|----------|
| `apiKey` | Mission Control API key | ✅ |
| `agentId` | Agent ID from registration | ✅ |
| `name` | Display name | ❌ |
| `pollIntervalMs` | Override poll interval | ❌ |

## Agent Binding

Add a binding to route messages to your agent:

```json
{
  "bindings": [
    {
      "match": {
        "channel": "missioncontrol-convex",
        "accountId": "myagent"
      },
      "agentId": "my-moltbot-agent"
    }
  ]
}
```

## Environment Variables

Alternatively, use environment variables:

- `MISSION_CONTROL_CONVEX_API_KEY` - API key
- `MISSION_CONTROL_CONVEX_AGENT_ID` - Agent ID
- `MISSION_CONTROL_CONVEX_URL` - Convex Cloud URL (wss)
- `MISSION_CONTROL_CONVEX_API_URL` - HTTP API URL

## How It Works

This plugin uses a hybrid approach for optimal performance:

### Realtime Mode (Primary)
1. Connects to Convex Cloud via WebSocket using `ConvexClient`
2. Subscribes to message queries for each conversation
3. Receives instant updates when new messages arrive
4. Periodically checks for new conversations (every 30s)

### Polling Fallback
If realtime connection fails, automatically falls back to:
1. Polling conversations every 30 seconds
2. Polling messages every 5 seconds (configurable)

### Message Flow
```
User sends message in Dashboard
        ↓
Convex realtime pushes to ConvexClient
        ↓
Monitor receives and normalizes message
        ↓
Dispatches to bound Moltbot agent
        ↓
Agent generates reply
        ↓
Reply sent via HTTP API POST /chat/messages
```

## Differences from Supabase Version

| Feature | Supabase | Convex |
|---------|----------|--------|
| Realtime | Postgres Changes | WebSocket (ConvexClient) |
| Fallback | None | HTTP polling |
| Backend dependency | `@supabase/supabase-js` | `convex` |
| Configuration | `supabaseUrl`, `supabaseAnonKey` | `convexUrl`, `apiUrl`, `apiKey` |

## Troubleshooting

### Connection Issues
Check logs for:
- `[REALTIME]` - Messages received via WebSocket
- `[POLL]` - Messages received via polling fallback

### Missing Messages
1. Verify `agentId` matches your registered Mission Control agent
2. Check that the conversation's `targetAgentId` is your agent
3. Ensure bindings are configured correctly

## License

MIT
