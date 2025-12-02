
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
    body: "You may experience temporary discomfort, soreness, or sensitivity to temperature or pressure in the treated area."
  },
  {
    id: "rest_occlusion",
    version: 1,
    category: "DIRECT_RESTORATION",
    severity: "UNCOMMON",
    activeByDefault: true,
    title: "High Bite / Adjustment",
    body: "The filling may feel 'high' after the anesthesia wears off and might require a brief follow-up adjustment to balance your bite."
  },
  {
    id: "rest_endo",
    version: 1,
    category: "DIRECT_RESTORATION",
    severity: "RARE",
    activeByDefault: false,
    title: "Need for Root Canal",
    body: "Deep decay or irritation from the procedure may affect the nerve. If the tooth does not heal or pain persists, root canal therapy may be required."
  },

  // --- INDIRECT RESTORATION (Crowns) ---
  {
    id: "crown_temp",
    version: 1,
    category: "INDIRECT_RESTORATION",
    severity: "COMMON",
    activeByDefault: true,
    title: "Temporary Crown Issues",
    body: "The temporary crown is fragile. It may come loose, break, or feel rough. Please contact the office promptly if it comes off."
  },
  {
    id: "crown_nerve",
    version: 1,
    category: "INDIRECT_RESTORATION",
    severity: "UNCOMMON",
    activeByDefault: true,
    title: "Nerve Irritation",
    body: "Preparation of the tooth may irritate the nerve. In a small percentage of cases, the nerve may not recover and root canal therapy may be required."
  },

  // --- EXTRACTION ---
  {
    id: "ext_dry_socket",
    version: 1,
    category: "EXTRACTION",
    severity: "UNCOMMON",
    activeByDefault: true,
    title: "Dry Socket",
    body: "Dislodging the blood clot may lead to a painful 'dry socket' and delay healing. Avoid smoking, straws, or vigorous rinsing for 72 hours."
  },
  {
    id: "ext_nerve",
    version: 1,
    category: "EXTRACTION",
    severity: "RARE",
    activeByDefault: true,
    title: "Nerve Injury",
    body: "Because of the proximity to nerves, there is a small risk of temporary or permanent numbness or tingling in the lip, chin, or tongue."
  },
  {
    id: "ext_sinus",
    version: 1,
    category: "EXTRACTION",
    severity: "RARE",
    activeByDefault: false,
    title: "Sinus Exposure",
    body: "Upper roots may be close to the sinus. Removal can sometimes create an opening between the mouth and sinus, which may require specific post-operative precautions and additional treatment."
  },

  // --- IMPLANT ---
  {
    id: "imp_fail",
    version: 1,
    category: "IMPLANT",
    severity: "UNCOMMON",
    activeByDefault: true,
    title: "Integration Failure",
    body: "The implant may fail to integrate (bond) with the bone. If this occurs, the implant may need to be removed and, in some cases, the area grafted and treatment attempted again later."
  },
  {
    id: "imp_maint",
    version: 1,
    category: "IMPLANT",
    severity: "COMMON",
    activeByDefault: true,
    title: "Maintenance Requirement",
    body: "Implants require strict oral hygiene and regular professional cleaning. Neglect can lead to infection (peri-implantitis) and loss of the implant."
  },

  // --- ENDO ---
  {
    id: "endo_fail",
    version: 1,
    category: "ENDO",
    severity: "UNCOMMON",
    activeByDefault: true,
    title: "Retreatment Risk",
    body: "Although root canal treatment is often successful, complex tooth anatomy or reinfection can still cause the treatment to fail, which may require retreatment or extraction."
  },
  {
    id: "endo_fracture",
    version: 1,
    category: "ENDO",
    severity: "COMMON",
    activeByDefault: true,
    title: "Fracture Risk",
    body: "The tooth is weakened and more brittle after treatment. We strongly recommend minimizing chewing on that tooth until a permanent crown is placed to reduce the risk of fracture."
  },

  // --- ANESTHESIA ---
  {
    id: "anes_paresthesia",
    version: 1,
    category: "ANESTHESIA",
    severity: "VERY_RARE",
    activeByDefault: false,
    title: "Paresthesia",
    body: "Local anesthetic injection may, in rare cases, cause nerve injury resulting in prolonged or permanent numbness."
  }
];
