// Simple campus location lookup with proximity "zones".
// Locations in the same zone score higher proximity than locations in
// different zones. This avoids needing real GPS coordinates -- students
// just pick from a dropdown.
//
// Edit CAMPUS_LOCATIONS / ZONES for your own college's building names.

const CAMPUS_LOCATIONS = [
  "Block 1",
  "Block 2",
  "Block 3",
  "Block 4",
  "Block 5",
  "Block 6",
  "Block 7",
  "Block 8",
  "Central Library",
  "Main Canteen",
  "Sports Complex",
  "Boys Hostel",
  "Girls Hostel",
  "Admin Block",
  "Auditorium",
  "Main Gate",
  "Other / Not sure",
];

// Locations grouped into zones. Same zone = close by.
const ZONES = {
  academic: ["Block 1", "Block 2", "Block 3", "Block 4", "Block 5", "Block 6", "Block 7", "Block 8", "Central Library"],
  food: ["Main Canteen"],
  sports: ["Sports Complex"],
  hostel: ["Boys Hostel", "Girls Hostel"],
  admin: ["Admin Block", "Main Gate", "Auditorium"],
  unknown: ["Other / Not sure"],
};

function zoneOf(location) {
  for (const [zone, locations] of Object.entries(ZONES)) {
    if (locations.includes(location)) return zone;
  }
  return "unknown";
}

/**
 * Returns a proximity score between 0 and 1.
 * 1   = exact same location
 * 0.6 = same zone, different location
 * 0.2 = different zone (still on campus, small credit)
 */
function locationProximityScore(locA, locB) {
  if (!locA || !locB) return 0.2;
  if (locA === locB) return 1;
  if (zoneOf(locA) === zoneOf(locB) && zoneOf(locA) !== "unknown") return 0.6;
  return 0.2;
}

module.exports = { CAMPUS_LOCATIONS, ZONES, zoneOf, locationProximityScore };
