#!/usr/bin/env bash
set -euo pipefail

NEO4J_URI="${NEO4J_URI:-bolt://neo4j:7687}"
NEO4J_USER="${NEO4J_USER:-neo4j}"
NEO4J_PASSWORD="${NEO4J_PASSWORD:-sovereign12345}"
SCHEMA_FILE="${SCHEMA_FILE:-/startup/schema.cypher}"

if [[ ! -r "$SCHEMA_FILE" ]]; then
  echo "Neo4j schema file is not readable: $SCHEMA_FILE" >&2
  exit 1
fi

echo "Waiting for Neo4j at $NEO4J_URI..."
for attempt in $(seq 1 60); do
  if cypher-shell -a "$NEO4J_URI" -u "$NEO4J_USER" -p "$NEO4J_PASSWORD" "RETURN 1" >/dev/null 2>&1; then
    echo "Neo4j is ready."
    break
  fi

  if [[ "$attempt" -eq 60 ]]; then
    echo "Neo4j did not become ready in time." >&2
    exit 1
  fi

  sleep 2
done

echo "Applying Neo4j schema from $SCHEMA_FILE..."
cypher-shell -a "$NEO4J_URI" -u "$NEO4J_USER" -p "$NEO4J_PASSWORD" --fail-fast -f "$SCHEMA_FILE"
echo "Neo4j schema applied successfully."
