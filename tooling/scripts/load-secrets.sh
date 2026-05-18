#!/bin/bash

# Default arguments
ENV_FILE=${1:-.vars}
ENV_TARGET=${2}

# Check if .vars file exists
if [ ! -f "$ENV_FILE" ]; then
  echo "Error: $ENV_FILE not found."
  echo "Please create a $ENV_FILE file with your secrets (KEY=VALUE)."
  exit 1
fi

if [ -n "$ENV_TARGET" ]; then
  echo "Loading secrets from $ENV_FILE to $ENV_TARGET..."
else
  echo "Loading secrets from $ENV_FILE to default environment..."
fi

# Read .vars file line by line
while IFS='=' read -r key value; do
  # Skip comments and empty lines
  if [[ ! $key =~ ^# && -n $key ]]; then
    # Trim whitespace
    key=$(echo "$key" | xargs)
    value=$(echo "$value" | xargs)
    
    if [ -n "$key" ] && [ -n "$value" ]; then
      echo "Setting $key..."
      if [ -n "$ENV_TARGET" ]; then
        echo "$value" | pnpm exec wrangler secret put "$key" --env "$ENV_TARGET"
      else
        echo "$value" | pnpm exec wrangler secret put "$key"
      fi
    fi
  fi
done < "$ENV_FILE"

echo "Done!"