
import React from 'react';
import { TreatmentPlanItem, FeeCategory } from '../types';
import * as Icons from '../components/icons/ProcedureIcons';

// Interface compatible with both TreatmentPlanItem and FeeScheduleEntry
interface ProcedureIconInput {
  procedureCode: string;
  procedureName: string;
  category?: string;
}

export const getProcedureIcon = (item: ProcedureIconInput): React.FC<React.SVGProps<SVGSVGElement>> => {
  const code = item.procedureCode.toUpperCase();
  const name = item.procedureName.toLowerCase();
  const category = item.category || 'OTHER';

  // 1. Check Specific Codes
  if (code.startsWith('AO4')) return Icons.IconBridge; // All-on-4 is basically a big bridge
  
  if (code.startsWith('D01')) return Icons.IconExam;
  if (code.startsWith('D02')) return Icons.IconXray;
  if (code.startsWith('D03')) return Icons.IconXray;
  if (code.startsWith('D1')) return Icons.IconPerio; // Preventive/Hygiene
  
  if (code.startsWith('D23')) return Icons.IconFilling; // Composites
  if (code.startsWith('D21')) return Icons.IconFilling; // Amalgams
  
  if (code.startsWith('D27')) return Icons.IconCrown;
  if (code.startsWith('D29')) return Icons.IconVeneer;
  
  if (code.startsWith('D3')) return Icons.IconRootCanal; // Endodontics
  
  if (code.startsWith('D4')) return Icons.IconPerio; // Periodontics
  
  if (code.startsWith('D5')) return Icons.IconDenture; // Removable Pros
  
  if (code.startsWith('D60')) return Icons.IconImplant; // Implants
  if (code.startsWith('D62') || code.startsWith('D67')) return Icons.IconBridge; // Fixed Pros
  
  if (code.startsWith('D7')) return Icons.IconExtraction; // Oral Surgery
  
  if (code.startsWith('D8')) return Icons.IconOrtho; // Ortho
  
  if (code.startsWith('D994')) return Icons.IconNightguard; // Guards
  if (code.startsWith('D997')) return Icons.IconWhitening; // Whitening

  // 2. Check Keywords in Name
  if (name.includes('all-on-4') || name.includes('all on 4')) return Icons.IconBridge;
  if (name.includes('exam') || name.includes('evaluation')) return Icons.IconExam;
  if (name.includes('x-ray') || name.includes('radiograph') || name.includes('image')) return Icons.IconXray;
  if (name.includes('clean') || name.includes('prophy') || name.includes('scaling')) return Icons.IconPerio;
  if (name.includes('filling') || name.includes('composite') || name.includes('resin')) return Icons.IconFilling;
  if (name.includes('crown') || name.includes('onlay')) return Icons.IconCrown;
  if (name.includes('root canal') || name.includes('endo')) return Icons.IconRootCanal;
  if (name.includes('implant')) return Icons.IconImplant;
  if (name.includes('extraction') || name.includes('remove')) return Icons.IconExtraction;
  if (name.includes('denture')) return Icons.IconDenture;
  if (name.includes('bridge')) return Icons.IconBridge;
  if (name.includes('veneer')) return Icons.IconVeneer;
  if (name.includes('ortho') || name.includes('braces') || name.includes('aligner')) return Icons.IconOrtho;
  if (name.includes('guard') || name.includes('splint')) return Icons.IconNightguard;
  if (name.includes('whiten') || name.includes('bleach')) return Icons.IconWhitening;

  // 3. Check Category
  switch (category) {
    case 'IMPLANT': return Icons.IconImplant;
    case 'PERIO': return Icons.IconPerio;
    case 'RESTORATIVE': return Icons.IconFilling;
    case 'ENDODONTIC': return Icons.IconRootCanal;
    case 'PROSTHETIC': return Icons.IconBridge;
    case 'ORTHO': return Icons.IconOrtho;
    case 'COSMETIC': return Icons.IconVeneer;
    case 'DIAGNOSTIC': return Icons.IconExam;
    case 'PREVENTIVE': return Icons.IconPerio;
    default: return Icons.IconExam;
  }
};
