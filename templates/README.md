# OpenClaw Workspace Templates

These templates are used when creating new agents via Mission Control.

## File Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AGENT LIFECYCLE                                     │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐
│  AGENT CREATED  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────────────────────────────────────┐
│  BOOTSTRAP.md   │────▶│ First-run ritual (delete after completing)       │
└────────┬────────┘     └──────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EVERY SESSION START                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐     │
│  │  SOUL.md    │   │  AGENTS.md  │   │  USER.md    │   │ IDENTITY.md │     │
│  │  (identity) │   │  (rules)    │   │  (human)    │   │  (name/vibe)│     │
│  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘     │
│         │                 │                 │                 │             │
│         └────────────┬────┴────────────┬────┴────────────┬────┘             │
│                      ▼                 ▼                 ▼                  │
│              ┌─────────────────────────────────────────────┐                │
│              │           AGENT CONTEXT LOADED              │                │
│              └─────────────────────────────────────────────┘                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MEMORY LOADING                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────┐        ┌──────────────────────┐                   │
│  │ memory/YYYY-MM-DD.md │        │     MEMORY.md        │                   │
│  │   (today + yesterday)│        │  (main session only) │                   │
│  │   Always loaded      │        │  ⚠️ NOT in groups    │                   │
│  └──────────────────────┘        └──────────────────────┘                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DURING SESSION                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐                           ┌─────────────┐                  │
│  │  TOOLS.md   │  ◀── Referenced as needed │  skills/    │                  │
│  │ (local notes)│                          │ (capabilities)                 │
│  └─────────────┘                           └─────────────┘                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PERIODIC EVENTS                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐              ┌─────────────────┐                       │
│  │  HEARTBEAT.md   │              │    BOOT.md      │                       │
│  │  (every 30m)    │              │ (gateway restart)│                       │
│  │                 │              │                 │                       │
│  │ • Check mentions│              │ • Startup tasks │                       │
│  │ • Notifications │              │ • Resume work   │                       │
│  │ • Conversations │              │                 │                       │
│  └─────────────────┘              └─────────────────┘                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## File Reference

| File | When Loaded | Purpose | Editable |
|------|-------------|---------|----------|
| `SOUL.md` | Every session | Identity, persona, MC credentials | Yes |
| `AGENTS.md` | Every session | Operating rules, behavior | Yes |
| `USER.md` | Every session | About the human | Yes |
| `IDENTITY.md` | Every session | Name, vibe, emoji | Yes |
| `TOOLS.md` | As needed | Local setup notes | Yes |
| `HEARTBEAT.md` | Heartbeat polls | Periodic checklist | Yes |
| `BOOT.md` | Gateway restart | Startup tasks | Yes |
| `BOOTSTRAP.md` | First run only | Onboarding (delete after) | Delete |
| `MEMORY.md` | Main session | Long-term memory | Yes |
| `memory/*.md` | Session start | Daily logs | Yes |

## Template Placeholders

These placeholders are replaced when creating an agent:

| Placeholder | Replaced With |
|-------------|---------------|
| `{AGENT_NAME}` | Agent's name |
| `{AGENT_DESCRIPTION}` | Agent's description |
| `{MC_AGENT_ID}` | Mission Control agent ID |
| `{MC_API_KEY}` | Mission Control API key |
| `{WORKSPACE_ID}` | Workspace ID |
| `{API_URL}` | Mission Control API URL |

## Security Notes

- `MEMORY.md` is ONLY loaded in main private sessions (not group chats)
- This prevents leaking personal context to strangers
- Daily memory files are always loaded (keep them less sensitive)
