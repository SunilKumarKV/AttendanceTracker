# API Overview

Base URL:

```txt
/api
```

Major route groups:

- `/auth` authentication, refresh, password flows
- `/admin` admin CRUD, assignments, imports, institution operations
- `/professor` teacher attendance and assigned data
- `/reports` attendance/report exports
- `/settings` institution settings
- `/notifications` notifications
- `/profile` user profile

All protected routes require authentication. Role and institution checks are enforced server-side.
