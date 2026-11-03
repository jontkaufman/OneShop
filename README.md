# OneShop

OneShop is a dealership operations platform intended to coordinate repair orders, customers, vehicles/RVs, service departments, property spaces, storage and unit movements.

## Repository status

This repository was initialized on November 2, 2026 as the canonical repository for the OneShop project. The existing hosted OneShop prototype has **not** been imported into this repository. There is no verified production application source, build pipeline, deployment integration, or Supabase connection in this repository yet.

Existing hosted prototype (separate): https://oneshop-dealership.sacredkiwi2.chatgpt.site

## Product direction

- Repair-order-centric coordination between advisors, foremen, technicians, parts, warranty, porters and other departments.
- Property maps containing numbered service bays, parking spaces, storage spaces and operational zones.
- Unit movement requests, assignment/claims, handoffs and physical-location history.
- Multi-tenant dealership configuration, permissions, and eventually persistent real-time records.

## Current focus: property map editor

See [Property map interaction requirements](docs/property-map-editor.md) for zoom, pan, marker sizing and responsive editing requirements.

## Development workflow

1. Import or reconstruct the editable hosted application source before attempting to claim parity with the previous prototype.
2. Develop changes in feature branches and review changes before merging into `main`.
3. Run application tests and verify mobile/desktop interactions.
4. Connect a hosting pipeline and persistence only after verifying actual configuration and credentials. Do not commit secrets.

## Source of truth

This GitHub repository is the intended source of truth **going forward**. The prototype website and local standalone HTML previews are separate artifacts until explicitly migrated.
