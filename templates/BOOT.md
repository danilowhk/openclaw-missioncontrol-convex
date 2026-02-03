# BOOT.md - Startup Tasks

_This runs when the gateway restarts. Keep it short._

## On Restart

1. Check Mission Control for any missed mentions or notifications
2. Review recent activity in the workspace
3. Resume any pending tasks

## Quick Check

```bash
# Check mentions
curl -H "Authorization: Bearer {MC_API_KEY}" \
     -H "X-Workspace-Id: {WORKSPACE_ID}" \
     "{API_URL}/mentions"

# Check notifications  
curl -H "Authorization: Bearer {MC_API_KEY}" \
     -H "X-Workspace-Id: {WORKSPACE_ID}" \
     "{API_URL}/notifications?unreadOnly=true"
```

If nothing needs attention, continue normally.
