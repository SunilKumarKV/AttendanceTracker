# Security Notes

Production security principles:

- Backend RBAC is authoritative.
- Tenant/institution scope must be enforced in every protected query.
- JWT secrets must be strong and environment-specific.
- Cookies must be `secure` and `sameSite=none` only when HTTPS is configured correctly.
- CORS must list trusted frontend origins only.
- Passwords are hashed with bcrypt.
- File imports validate type, size, row structure, and duplicates before transaction writes.
- Audit logs and login history should be retained according to institution policy.
