#!/bin/bash
set -e
APP="bibsclaw"
CURRENT=$(railway status --json | jq -r '.environment')
if [ "$CURRENT" = "blue" ]; then
  TARGET="green"
else
  TARGET="blue"
fi
echo "Deploying to $TARGET environment..."
railway environment $TARGET
railway up --detach
echo "Running health check on $TARGET..."
sleep 30
HEALTH=$(curl -sf "https://$APP-$TARGET.up.railway.app/health" || echo "fail")
if [ "$HEALTH" != "fail" ]; then
  echo "Switching traffic to $TARGET"
  railway domain update --target $TARGET
  echo "Blue-green deploy complete: $TARGET is now live"
else
  echo "Health check failed, rolling back"
  railway environment $CURRENT
  exit 1
fi
