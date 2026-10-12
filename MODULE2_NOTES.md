# Module 2 - Disaster Management

**New files only (no existing file is changed):**
- Disaster Management: `frontend/disaster-management.html`, `frontend/js/disaster-management.js`, `frontend/css/disasters.css`
- Alerts: `frontend/alerts.html`, `frontend/js/alerts.js`, `frontend/css/alerts.css`
- Existing `disasters.html` / `disasters.js` are left exactly as the team had them.

## Features
- Disaster listing (live from Firestore `disaster_reports`, updates without refresh)
- Details popup for every incident
- Filters: type, location, severity, status, source + text search
- Status management: Active / Monitoring / Resolved (saved to Firestore)
- Official vs unverified labels (community reports = unverified, USGS = official)

## Alerts
- Official warnings = USGS earthquakes (M5+) + reports an admin has verified (`verified: true` in Firestore)
- Unverified reports = public reports (High/Medium, not Resolved) with a Verify button
- Popup + browser notification when a new High-severity report arrives
- `REQUIRE_LOGIN_FOR_VERIFY` in `alerts.js` -> set `true` once Module 1 login is merged

## Genuine disaster-data sources investigated
| Source | Covers | Access | Used? |
|---|---|---|---|
| USGS Earthquake Feed | Earthquakes worldwide | Free GeoJSON, no key, CORS enabled | **Yes** (live in Disasters page) |
| GDACS (UN/EU) | Floods, cyclones, earthquakes, volcanoes | Free RSS/GeoJSON | Future work |
| ReliefWeb API (UN OCHA) | Disaster reports and updates | Free API (app name required) | Future work |
| IMD / NDMA India | Cyclone, rainfall, flood warnings | Website/RSS, no stable public API | Reference only |

## Notes for teammates
- Status values are exactly `Active`, `Monitoring`, `Resolved` (Module 4 charts can group by `status`).
- `REQUIRE_LOGIN_FOR_STATUS` in `disaster-management.js` -> set `true` once Module 1 login is merged.
- Module 1 Firestore rules must allow `update` of `status`, `updated_at`, `verified`, `verified_at` on `disaster_reports` for admins only.
