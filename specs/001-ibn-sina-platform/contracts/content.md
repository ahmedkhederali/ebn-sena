# API Contract: Content & Services

See [admin.md](./admin.md) for the full Content Management and Services endpoints.

**Quick reference**:

| Endpoint | Auth | Purpose |
|---|---|---|
| `GET /api/content/public?keys[]=...` | Public | Fetch specific content blocks for public website |
| `GET /api/content` | admin | List all editable content blocks |
| `PUT /api/content/:key` | admin | Update a content block (AR + EN) |
| `GET /api/services` | Public | List all active medical services/specialties |
| `POST /api/services` | admin | Create new service/specialty |
| `PUT /api/services/:id` | admin | Update service details |

**Content block key namespace**:

| Key | Section | Description |
|---|---|---|
| `hero.title` | homepage | Main hero headline |
| `hero.subtitle` | homepage | Hero subheading |
| `hero.cta` | homepage | Call-to-action button label |
| `hero.backgroundImageUrl` | homepage | Hero background image URL |
| `about.intro` | homepage | Center introduction paragraph |
| `contact.address` | homepage | Physical address (AR + EN) |
| `contact.phone` | homepage | Contact phone number |
| `contact.email` | homepage | Contact email address |
| `contact.hours` | homepage | Working hours text |
| `services.intro` | services | Services page intro paragraph |
| `services.cta` | services | Services page CTA text |

All keys support `ar` and `en` fields. Keys are fixed and seeded; new keys require a code change (not a runtime CMS operation in v1).
