# Security Policy

## Deployment boundary

VSR is a runtime engine, not a complete authentication service. The protocol's optional authorization hook is not a substitute for authentication at the network boundary.

When exposing a transport outside a trusted local process:

- Authenticate the caller before constructing protocol context.
- Set a stable, server-derived principal in command context; never trust a principal supplied in the request body.
- Enable protocol authorization and provide an explicit command allow/deny policy.
- Restrict network access, use TLS at the boundary, and avoid logging credentials or sensitive payloads.
- Do not expose debug, save/restore, or administrative commands unless they are explicitly authorized.
- Treat client snapshots and events as data that may reveal scenario or player state; apply least-privilege projection at the server boundary.
- Rotate credentials and use short-lived tokens where supported by the host application.

## Reporting

Please report security issues privately to the repository maintainer rather than filing public issues with exploit details.
