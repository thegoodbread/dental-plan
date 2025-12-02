
import { ProcedureTemplate } from './dentalTypes';

export const PROCEDURE_TEMPLATES: ProcedureTemplate[] = [
  // --- EXAMS ---
  {
    cdtCode: "D0120",
    label: "Periodic oral evaluation",
    category: "exam",
    toothContext: "full_mouth",
    subjectiveTemplate: "Patient presents for routine recall examination. Reports [chief_complaint] or no specific concerns. Medical history reviewed and [updated/no_changes].",
    objectiveTemplate: "Extraoral exam WNL. Intraoral exam: [soft_tissue_findings]. Perio status: [stable/localized_gingivitis]. Restorations: [intact/defective]. Hygiene: [good/fair/poor].",
    assessmentTemplate: "Periodic oral evaluation completed. Caries risk: [low/mod/high]. Periodontal diagnosis: [diagnosis].",
    treatmentPerformedTemplate: "Clinical examination performed. Oral cancer screening (visual/tactile) negative. Reviewed radiographs [type_if_taken].",
    planTemplate: "Findings reviewed with patient. Continue recall schedule at [interval] months. Next visit: [prophy/restorative].",
    suggestedRiskLabels: [],
    complianceChecklist: [
      "Medical history updated",
      "Oral cancer screening documented",
      "Perio status assessed",
      "Caries risk assessed"
    ]
  },
  {
    cdtCode: "D0150",
    label: "Comprehensive oral evaluation",
    category: "exam",
    toothContext: "full_mouth",
    subjectiveTemplate: "Patient presents for new patient comprehensive examination. CC: [chief_complaint]. History of [medical/dental_history_highlights].",
    objectiveTemplate: "Vitals: BP [bp], Pulse [pulse]. EO/IO exam: [findings]. TMJ: [findings]. Perio charting completed. Hard tissue exam completed. Radiographic findings: [findings].",
    assessmentTemplate: "Comprehensive evaluation. Perio Dx: [AAP_stage_grade]. Caries risk: [risk]. Restorative needs: [summary].",
    treatmentPerformedTemplate: "Comprehensive clinical exam performed. FMX/Pano taken and reviewed. Oral cancer screening performed. Intraoral photos taken.",
    planTemplate: "Treatment plan presented to patient: [plan_summary]. Sequence and financials discussed. Patient agrees to proceed with [phase_1].",
    suggestedRiskLabels: [],
    complianceChecklist: [
      "Full perio chart",
      "Full restorative chart",
      "Oral cancer screening",
      "Treatment plan presented"
    ]
  },
  {
    cdtCode: "D0140",
    label: "Limited/problem-focused evaluation",
    category: "exam",
    toothContext: "single_tooth",
    subjectiveTemplate: "Patient presents with specific complaint: [symptoms] in area of [tooth_number/area]. Duration: [duration]. Pain level: [1-10].",
    objectiveTemplate: "Visual exam of [area]. Percussion: [pos/neg]. Palpation: [pos/neg]. Cold test: [response]. Radiographic findings: [findings].",
    assessmentTemplate: "Limited evaluation. Diagnosis: [diagnosis] (e.g. symptomatic irreversible pulpitis, fractured tooth, pericoronitis).",
    treatmentPerformedTemplate: "Limited exam performed. PA radiograph taken. Diagnosis and treatment options discussed.",
    planTemplate: "Recommended treatment: [treatment]. Patient elected to [proceed_today/schedule]. Rx given: [medication_if_any].",
    suggestedRiskLabels: [],
    complianceChecklist: [
      "Chief complaint specific",
      "Diagnostic tests recorded",
      "Radiograph of area",
      "Diagnosis established"
    ]
  },

  // --- HYGIENE ---
  {
    cdtCode: "D1110",
    label: "Adult prophylaxis",
    category: "hygiene_scaling",
    toothContext: "full_mouth",
    subjectiveTemplate: "Patient presents for routine cleaning. No major sensitivity reported.",
    objectiveTemplate: "Plaque: [light/mod/heavy]. Calculus: [light/mod/heavy] [supra/sub]. Gingiva: [pink/inflamed].",
    assessmentTemplate: "Adult prophylaxis appropriate. Gingival health: [status].",
    treatmentPerformedTemplate: "Scale and polish performed. Flossed. OHI provided focusing on [brushing/flossing_technique]. Fluoride varnish [placed/declined].",
    planTemplate: "Maintain [interval] month recall. Stress home care compliance.",
    suggestedRiskLabels: [
      "Minor gingival bleeding",
      "Temporary sensitivity"
    ],
    complianceChecklist: [
      "Calculus removal verified",
      "OHI provided",
      "Tissue response noted"
    ]
  },
  {
    cdtCode: "D1120",
    label: "Child prophylaxis",
    category: "hygiene_scaling",
    toothContext: "full_mouth",
    subjectiveTemplate: "Child presents for routine cleaning. Parent reports [concerns].",
    objectiveTemplate: "Eruption pattern normal for age. Plaque: [amount]. Hygiene: [status].",
    assessmentTemplate: "Child prophylaxis. Caries risk: [risk].",
    treatmentPerformedTemplate: "Scale and polish performed. Flossed. OHI given to patient and parent. Fluoride treatment provided.",
    planTemplate: "Recall in 6 months. Encouraged parent to assist with brushing.",
    suggestedRiskLabels: [],
    complianceChecklist: [
      "Eruption check",
      "OHI to parent",
      "Fluoride consent"
    ]
  },
  {
    cdtCode: "D4341",
    label: "SRP (per quadrant)",
    category: "hygiene_scaling",
    toothContext: "quadrant",
    subjectiveTemplate: "Patient presents for SRP [quadrants]. Reports [sensitivity/anxiety].",
    objectiveTemplate: "Localized/Generalized mod-severe periodontitis. Subgingival calculus: [mod/heavy]. BOP: [generalized].",
    assessmentTemplate: "Periodontitis Stage [stage] Grade [grade]. Need for non-surgical therapy.",
    treatmentPerformedTemplate: "Local anesthesia [agent] [volume]. Scaling and root planing performed on [quadrants] using ultrasonic and hand instrumentation. Irrigation w/ [agent].",
    planTemplate: "Post-op instructions given (warm salt water, gentle brushing). Next visit: [next_quad_or_reval].",
    suggestedRiskLabels: [
      "Temporary sensitivity",
      "Gingival recession",
      "Minor bleeding/soreness"
    ],
    complianceChecklist: [
      "Anesthesia documented",
      "Quadrants specified",
      "Perio diagnosis confirmed",
      "Post-op instructions"
    ]
  },

  // --- DIRECT RESTORATIONS ---
  {
    cdtCode: "D2391",
    label: "One-surface posterior composite",
    category: "direct_restoration",
    toothContext: "single_tooth",
    subjectiveTemplate: "Patient presents for filling on tooth #[tooth_number]. Asymptomatic or [symptoms].",
    objectiveTemplate: "Tooth #[tooth_number]: Caries/Defect on [surface].",
    assessmentTemplate: "Caries #[tooth_number] [surface].",
    treatmentPerformedTemplate: "Anesthesia [agent] [volume]. Isolation [rubber_dam/iso-dry]. Caries removed. Bond [agent]. Composite shade [shade] placed/cured. Occlusion checked/adjusted. Polished.",
    planTemplate: "Reviewed post-op instructions (numbness, sensitivity).",
    suggestedRiskLabels: [
      "Post-op sensitivity",
      "High bite / adjustment",
      "Need for root canal (deep decay)"
    ],
    complianceChecklist: [
      "Anesthesia details",
      "Isolation method",
      "Composite shade",
      "Occlusion verified"
    ]
  },
  {
    cdtCode: "D2392",
    label: "Two-surface posterior composite",
    category: "direct_restoration",
    toothContext: "single_tooth",
    subjectiveTemplate: "Patient presents for restorative tx #[tooth_number].",
    objectiveTemplate: "Tooth #[tooth_number]: Caries detected on [surfaces].",
    assessmentTemplate: "Caries #[tooth_number] [surfaces].",
    treatmentPerformedTemplate: "Local anesthesia [agent] [volume]. Isolation [method]. Caries removed. Sectional matrix placed. Etch/Bond. Composite shade [shade] placed incrementally. Cured. Contoured and polished. Contacts verified.",
    planTemplate: "Advised patient of possible sensitivity. Check bite if high.",
    suggestedRiskLabels: [
      "Post-op sensitivity",
      "High bite / adjustment",
      "Need for root canal (deep decay)"
    ],
    complianceChecklist: [
      "Anesthesia details",
      "Matrix system used",
      "Interproximal contact verified",
      "Occlusion checked"
    ]
  },
  {
    cdtCode: "D2393",
    label: "Three-surface posterior composite",
    category: "direct_restoration",
    toothContext: "single_tooth",
    subjectiveTemplate: "Patient presents for MO/DO/MOD filling #[tooth_number].",
    objectiveTemplate: "Large caries/defect #[tooth_number] involving [surfaces].",
    assessmentTemplate: "Extensive caries #[tooth_number] [surfaces] suitable for direct restoration.",
    treatmentPerformedTemplate: "Anesthesia [agent]. Isolation. Caries removal. Liner [type] placed if deep. Matrix band. Bond. Composite [shade]. Cured. Shaped/Polished. Occlusion adjusted.",
    planTemplate: "Discussed size of filling and potential need for crown in future if fracture occurs. Post-op instructions given.",
    suggestedRiskLabels: [
      "Post-op sensitivity",
      "High bite / adjustment",
      "Fracture risk (large filling)",
      "Need for root canal"
    ],
    complianceChecklist: [
      "Anesthesia details",
      "Liner/Base if used",
      "Contact/Contour verified",
      "Crown prognosis discussed"
    ]
  },

  // --- INDIRECT RESTORATIONS ---
  {
    cdtCode: "D2740",
    label: "Full coverage porcelain/ceramic crown",
    category: "indirect_restoration",
    toothContext: "single_tooth",
    subjectiveTemplate: "Patient presents for crown prep #[tooth_number]. Reports [symptoms].",
    objectiveTemplate: "Tooth #[tooth_number] has [large_filling/fracture/decay] compromising structural integrity.",
    assessmentTemplate: "Tooth #[tooth_number] requires full coverage restoration (crown).",
    treatmentPerformedTemplate: "Local anesthesia [agent]. Isolation. Tooth prepared for ceramic crown. Margin [shoulder/chamfer]. Impression/Scan taken. Temp crown fabricated/cemented w/ [temp_cement]. Shade [shade] selected.",
    planTemplate: "Temp crown instructions given (avoid sticky foods). Return in [2-3] weeks for delivery.",
    suggestedRiskLabels: [
      "Temperature sensitivity (temp crown)",
      "Nerve irritation / Need for Endo",
      "Temp crown coming loose"
    ],
    complianceChecklist: [
      "Anesthesia details",
      "Shade selection",
      "Temp cement used",
      "Clearance verified"
    ]
  },
  {
    cdtCode: "D2950",
    label: "Core buildup, including any pins",
    category: "indirect_restoration",
    toothContext: "single_tooth",
    subjectiveTemplate: "Patient presents for buildup #[tooth_number] prior to crown.",
    objectiveTemplate: "Insufficient tooth structure remaining after caries removal to retain crown.",
    assessmentTemplate: "Need for core buildup to provide retention/resistance form.",
    treatmentPerformedTemplate: "Isolation. Caries removal completed. Band placement. Bonding agent. Core material [composite/amalgam] placed and cured/set. Prepped for crown.",
    planTemplate: "Proceeded with crown preparation.",
    suggestedRiskLabels: [
      "Need for root canal (deep decay)",
      "Tooth fracture"
    ],
    complianceChecklist: [
      "Caries removal confirmed",
      "Retention established",
      "Material specified"
    ]
  },

  // --- ENDODONTICS ---
  {
    cdtCode: "D3310",
    label: "Endo, anterior",
    category: "endo",
    toothContext: "single_tooth",
    subjectiveTemplate: "Patient presents with pain/swelling #[tooth_number]. Duration [days].",
    objectiveTemplate: "#[tooth_number]: Percussion [+], Palpation [+], Cold [lingering/neg]. PARL present.",
    assessmentTemplate: "Irreversible pulpitis / Necrotic pulp with [apical_periodontitis].",
    treatmentPerformedTemplate: "Anesthesia. Rubber dam isolation. Access. WL confirmed w/ apex locator. Instrumentation [rotary_system]. Irrigation [NaOCl]. Obturation [gutta_percha/sealer]. Temp restoration placed.",
    planTemplate: "Advised patient to restore with permanent restoration ASAP. Pain meds [OTC/Rx] discussed.",
    suggestedRiskLabels: [
      "Post-op soreness",
      "File separation (rare)",
      "Fracture risk until restored",
      "Retreatment risk"
    ],
    complianceChecklist: [
      "Rubber dam mandatory",
      "WL documented",
      "Canals obturated",
      "Temp placed"
    ]
  },
  {
    cdtCode: "D3320",
    label: "Endo, premolar",
    category: "endo",
    toothContext: "single_tooth",
    subjectiveTemplate: "Symptomatic #[tooth_number].",
    objectiveTemplate: "Deep caries into pulp. TTP [+].",
    assessmentTemplate: "Irreversible pulpitis / Necrosis #[tooth_number].",
    treatmentPerformedTemplate: "Anes. Rubber dam. Access. [Number] canals located. Cleaned and shaped [size]. Dry. Obturation [method]. Temp [cavit/irm]. Occlusion reduced.",
    planTemplate: "Ref for buildup and crown. Warned of fracture risk.",
    suggestedRiskLabels: [
      "Post-op soreness",
      "Fracture risk",
      "Anatomical complications"
    ],
    complianceChecklist: [
      "Rubber dam isolation",
      "Canal count verification",
      "Post-op radiograph",
      "Restorative plan"
    ]
  },
  {
    cdtCode: "D3330",
    label: "Endo, molar",
    category: "endo",
    toothContext: "single_tooth",
    subjectiveTemplate: "Patient reports throbbing pain #[tooth_number].",
    objectiveTemplate: "Deep decay. TTP [+].",
    assessmentTemplate: "Necrotic pulp #[tooth_number].",
    treatmentPerformedTemplate: "Anes. Rubber dam. Access. located [3/4] canals. Instrumentation. Irrigation NaOCl/EDTA. Master cone fit. Obturation. Sealant. Temp placed.",
    planTemplate: "Crown recommended immediately. POI given.",
    suggestedRiskLabels: [
      "Post-op soreness",
      "Complex anatomy/Missed canal",
      "Fracture risk",
      "Need for crown"
    ],
    complianceChecklist: [
      "Rubber dam isolation",
      "Canal configuration noted",
      "Obturation quality check",
      "Crown urgency discussed"
    ]
  },

  // --- ORAL SURGERY ---
  {
    cdtCode: "D7140",
    label: "Simple extraction",
    category: "extraction_simple",
    toothContext: "single_tooth",
    subjectiveTemplate: "Patient presents for extraction of #[tooth_number].",
    objectiveTemplate: "#[tooth_number] non-restorable due to [caries/fracture/perio].",
    assessmentTemplate: "Hopeless tooth #[tooth_number].",
    treatmentPerformedTemplate: "Review med hx. Anesthesia [agent]. Elevators and forceps used. Tooth delivered intact. Hemostasis achieved w/ gauze [and_sutures].",
    planTemplate: "POI given: No smoking/straws 24-48hrs. Soft diet. Call if complications.",
    suggestedRiskLabels: [
      "Dry socket",
      "Post-op pain/swelling",
      "Infection",
      "Sinus involvement (uppers)"
    ],
    complianceChecklist: [
      "Consent signed",
      "Time out performed",
      "Tooth delivered entire",
      "Hemostasis confirmed"
    ]
  },
  {
    cdtCode: "D7210",
    label: "Surgical extraction",
    category: "extraction_surgical",
    toothContext: "single_tooth",
    subjectiveTemplate: "Patient presents for surgical ext #[tooth_number].",
    objectiveTemplate: "#[tooth_number] broken down below gumline / ankylosed.",
    assessmentTemplate: "Surgical extraction required #[tooth_number].",
    treatmentPerformedTemplate: "Anesthesia. Flap reflected. Bone removal/troughing performed. Tooth sectioned. Roots delivered. Socket debrided. Sutures [type/number] placed.",
    planTemplate: "Written/Verbal POI. Ice pack rec. Pain meds prescribed [Rx]. Follow-up in 1 week.",
    suggestedRiskLabels: [
      "Dry socket",
      "Nerve injury (paresthesia)",
      "Sinus exposure",
      "Swelling/Bruising"
    ],
    complianceChecklist: [
      "Surgical consent",
      "Flap design noted",
      "Bone removal noted",
      "Sutures documented"
    ]
  },

  // --- IMPLANTS ---
  {
    cdtCode: "D6010",
    label: "Surgical placement of endosteal implant",
    category: "implant_surgery",
    toothContext: "single_tooth",
    subjectiveTemplate: "Patient presents for implant placement site #[tooth_number].",
    objectiveTemplate: "Edentulous site #[tooth_number]. Bone width/height adequate on CBCT.",
    assessmentTemplate: "Site #[tooth_number] suitable for implant.",
    treatmentPerformedTemplate: "Anesthesia. Flap/Punch. Osteotomy prepared [size]. Implant [Brand/Size] placed at [torque] Ncm. [Cover_screw/Healing_abutment] placed. Sutures. Post-op PA taken.",
    planTemplate: "POI given. Antibiotics/Chlorhexidine prescribed. Uncover/Restore in [3-4] months.",
    suggestedRiskLabels: [
      "Implant failure (non-integration)",
      "Nerve injury",
      "Infection",
      "Sinus involvement"
    ],
    complianceChecklist: [
      "Consent signed",
      "Implant sticker/lot recorded",
      "Primary stability torque",
      "Post-op radiograph"
    ]
  }
];
