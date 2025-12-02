
import { RiskLibraryItem } from './dentalTypes';

export const RISK_LIBRARY: RiskLibraryItem[] = [
  // --- DIRECT RESTORATION ---
  {
    id: "rest_pain_common",
    version: 1,
    category: "DIRECT_RESTORATION",
    severity: "COMMON",
    activeByDefault: true,
    title: "Post-op Sensitivity",
    body: "You may experience temporary discomfort, soreness, or sensitivity to temperature/pressure in the treated area."
  },
  {
    id: "rest_occlusion",
    version: 1,
    category: "DIRECT_RESTORATION",
    severity: "UNCOMMON",
    activeByDefault: true,
    title: "High Bite / Adjustment",
    body: "The filling may feel 'high' after anesthesia wears off and might require a brief follow-up adjustment to balance your bite."
  },
  {
    id: "rest_endo",
    version: 1,
    category: "DIRECT_RESTORATION",
    severity: "RARE",
    activeByDefault: false,
    title: "Need for Root Canal",
    body: "Deep decay or trauma from the procedure may impact the nerve. If the tooth does not heal or pain persists, root canal therapy may be required."
  },

  // --- INDIRECT RESTORATION (Crowns) ---
  {
    id: "crown_temp",
    version: 1,
    category: "INDIRECT_RESTORATION",
    severity: "COMMON",
    activeByDefault: true,
    title: "Temporary Crown Issues",
    body: "The temporary crown is fragile. It may come loose, break, or feel rough. Please contact the office immediately if it comes off."
  },
  {
    id: "crown_nerve",
    version: 1,
    category: "INDIRECT_RESTORATION",
    severity: "UNCOMMON",
    activeByDefault: true,
    title: "Nerve Irritation",
    body: "Preparation of the tooth may irritate the nerve. In some cases (approx. 1-15%), the nerve may not recover, requiring root canal therapy."
  },

  // --- EXTRACTION ---
  {
    id: "ext_dry_socket",
    version: 1,
    category: "EXTRACTION",
    severity: "UNCOMMON",
    activeByDefault: true,
    title: "Dry Socket",
    body: "Dislodging the blood clot may lead to a painful 'dry socket', delaying healing. Avoid smoking, straws, or vigorous rinsing for 72 hours."
  },
  {
    id: "ext_nerve",
    version: 1,
    category: "EXTRACTION",
    severity: "RARE",
    activeByDefault: true,
    title: "Nerve Injury",
    body: "Proximity to nerves carries a small risk of temporary or permanent numbness/tingling in the lip, chin, or tongue."
  },
  {
    id: "ext_sinus",
    version: 1,
    category: "EXTRACTION",
    severity: "RARE",
    activeByDefault: false,
    title: "Sinus Exposure",
    body: "Upper roots may be close to the sinus. Removal may result in a communication between the mouth and sinus, requiring specific post-op precautions."
  },

  // --- IMPLANT ---
  {
    id: "imp_fail",
    version: 1,
    category: "IMPLANT",
    severity: "UNCOMMON",
    activeByDefault: true,
    title: "Integration Failure",
    body: "The implant may fail to integrate (bond) with the bone. If this occurs, the implant may need to be removed, the site grafted, and retried later."
  },
  {
    id: "imp_maint",
    version: 1,
    category: "IMPLANT",
    severity: "COMMON",
    activeByDefault: true,
    title: "Maintenance Requirement",
    body: "Implants require strict oral hygiene and professional cleaning. Neglect can lead to infection (peri-implantitis) and loss of the implant."
  },

  // --- ENDO ---
  {
    id: "endo_fail",
    version: 1,
    category: "ENDO",
    severity: "UNCOMMON",
    activeByDefault: true,
    title: "Retreatment Risk",
    body: "While success rates are high, intricate anatomy or reinfection may cause the treatment to fail, requiring retreatment or extraction."
  },
  {
    id: "endo_fracture",
    version: 1,
    category: "ENDO",
    severity: "COMMON",
    activeByDefault: true,
    title: "Fracture Risk",
    body: "The tooth is weakened and brittle. You must minimize chewing on it until a permanent crown is placed to prevent fracture."
  },

  // --- ANESTHESIA ---
  {
    id: "anes_paresthesia",
    version: 1,
    category: "ANESTHESIA",
    severity: "VERY_RARE",
    activeByDefault: false,
    title: "Paresthesia",
    body: "Injection may cause nerve injury resulting in prolonged or permanent numbness."
  }
];
