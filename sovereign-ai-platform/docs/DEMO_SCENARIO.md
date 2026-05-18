# Executive Demo Scenario

## Narrative

A ministry wants to understand whether procurement modernization initiatives are duplicating scope across departments, systems, and projects.

## Flow

1. Reset demo data with `POST /api/seed/reset`.
2. Open the dashboard and show validated capabilities, pending capability candidates, and overlap risk.
3. Upload `seed/procurement_demo.txt`.
4. Review extracted capabilities.
5. Approve evidence-backed candidates and reject noisy candidates if any.
6. Open the capability map to show domain, area, capability, and owner.
7. Run overlap detection.
8. Open overlap matrix and explain why Vendor Portal Upgrade overlaps with eProcurement Modernization.
9. Open graph viewer to show organization units, systems, projects, processes, and capabilities.
10. Ask the copilot:
    - Which systems support procurement capabilities?
    - Which projects overlap with each other?
    - What capabilities are not owned by any department?

## Governance Messages

- All AI output is grounded in uploaded documents and graph nodes.
- Humans validate extracted capabilities before publishing.
- The deployment is on-premise ready and works without external cloud dependencies.

