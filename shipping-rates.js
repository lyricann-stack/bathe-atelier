/* =====================================================================
   Bathe Atelier — zone-based shipping estimates (USD, per bathtub)
   Door-to-door LCL estimate for one crated bathtub (~1.35 CBM).
   PLACEHOLDER RATES seeded from 2026 market LCL levels — replace with
   forwarder door-to-door quotes (China & Thailand origin) when available.
   Review quarterly.
   ===================================================================== */
window.SITE_RATES = {
  zones: {
    SEA:   { label: 'Southeast Asia',        acrylic: 450,  solid: 550  },
    EASIA: { label: 'East Asia',             acrylic: 550,  solid: 650  },
    AUNZ:  { label: 'Australia & NZ',        acrylic: 750,  solid: 900  },
    ME:    { label: 'Middle East',           acrylic: 900,  solid: 1100 },
    NA:    { label: 'North America',         acrylic: 950,  solid: 1150 },
    EUUK:  { label: 'Europe & UK',           acrylic: 1050, solid: 1250 },
    ROW:   { label: 'Rest of world',         acrylic: 1400, solid: 1700 }
  },
  /* [ISO code, display name, zone] */
  countries: [
    ['AU','Australia','AUNZ'],
    ['NZ','New Zealand','AUNZ'],
    ['US','United States','NA'],
    ['CA','Canada','NA'],
    ['GB','United Kingdom','EUUK'],
    ['IE','Ireland','EUUK'],
    ['FR','France','EUUK'],
    ['DE','Germany','EUUK'],
    ['NL','Netherlands','EUUK'],
    ['BE','Belgium','EUUK'],
    ['ES','Spain','EUUK'],
    ['PT','Portugal','EUUK'],
    ['IT','Italy','EUUK'],
    ['AT','Austria','EUUK'],
    ['CH','Switzerland','EUUK'],
    ['DK','Denmark','EUUK'],
    ['SE','Sweden','EUUK'],
    ['NO','Norway','EUUK'],
    ['FI','Finland','EUUK'],
    ['PL','Poland','EUUK'],
    ['CZ','Czechia','EUUK'],
    ['GR','Greece','EUUK'],
    ['AE','United Arab Emirates','ME'],
    ['SA','Saudi Arabia','ME'],
    ['QA','Qatar','ME'],
    ['KW','Kuwait','ME'],
    ['BH','Bahrain','ME'],
    ['OM','Oman','ME'],
    ['IL','Israel','ME'],
    ['JO','Jordan','ME'],
    ['JP','Japan','EASIA'],
    ['KR','South Korea','EASIA'],
    ['TW','Taiwan','EASIA'],
    ['HK','Hong Kong','EASIA'],
    ['MO','Macau','EASIA'],
    ['CN','China','EASIA'],
    ['SG','Singapore','SEA'],
    ['MY','Malaysia','SEA'],
    ['TH','Thailand','SEA'],
    ['ID','Indonesia','SEA'],
    ['PH','Philippines','SEA'],
    ['VN','Vietnam','SEA'],
    ['KH','Cambodia','SEA'],
    ['BN','Brunei','SEA'],
    ['IN','India','ROW'],
    ['ZA','South Africa','ROW'],
    ['BR','Brazil','ROW'],
    ['CL','Chile','ROW'],
    ['MX','Mexico','ROW'],
    ['XX','Other / rest of world','ROW']
  ]
};
