# Module 2 - Disaster Management

**Files:** `frontend/disasters.html`, `frontend/js/disasters.js`, `frontend/css/disasters.css`

## Features
- Disaster listing (live from Firestore `disaster_reports`, updates without refresh)
- Details popup for every incident
- Filters: type, location, severity, status, source + text search
- Status management: Active / Monitoring / Resolved (saved to Firestore)
- Official vs unverified labels (community reports = unverified, USGS = official)

## Genuine disaster-data sources investigated
| Source | Covers | Access | Used? |
|---|---|---|---|
| USGS Earthquake Feed | Earthquakes worldwide | Free GeoJSON, no key, CORS enabled | **Yes** (live in Disasters page) |
| GDACS (UN/EU) | Floods, cyclones, earthquakes, volcanoes | Free RSS/GeoJSON | Future work |
| ReliefWeb API (UN OCHA) | Disaster reports and updates | Free API (app name required) | Future work |
| IMD / NDMA India | Cyclone, rainfall, flood warnings | Website/RSS, no stable public API | Reference only |

## Notes for teammates
- Status values are exactly `Active`, `Monitoring`, `Resolved` (Module 4 charts can group by `status`).
- `REQUIRE_LOGIN_FOR_STATUS` in `disasters.js` -> set `true` once Module 1 login is merged.
- Module 1 Firestore rules must allow `update` of `status` and `updated_at` on `disaster_reports` for admins only.
