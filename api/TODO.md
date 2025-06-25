# API Requirements

This application expects a REST-style API under `/api` to manage buildings and units.
The Astro components currently assume the following endpoints exist:

- `GET /api/buildings/:buildingID/units/BUILDING` - fetch details for a building.
- `GET /api/buildings/:buildingID/units` - list all units for a building.
- `GET /api/buildings/:buildingID/units/:unitID` - fetch details for a single unit.
- `PUT /api/buildings/:buildingID/units/:unitID` - update building or unit information.
- `POST /api/buildings/:buildingID/units/:unitID` - create a new unit (unitID may be 'BUILDING' for creating the building record).
- `DELETE /api/buildings/:buildingID` - delete a building and all its units.
- `DELETE /api/buildings/:buildingID/units/:unitID` - delete a specific unit.

Each endpoint should return JSON and use standard HTTP status codes.
The SST router should connect these paths to AWS Lambda functions that
interact with DynamoDB using the `BuildingsUnits` table.
