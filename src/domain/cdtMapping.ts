
import { FeeCategory } from '../types';

/**
 * Maps CDT codes to FeeCategories. 
 * This ensures that adjudication logic (dominance, evidence requirements) 
 * is driven by clinical reality rather than simple string starts.
 */
export function getCategoryFromCdtCode(code: string): FeeCategory {
  const c = code.toUpperCase();
  if (c.startsWith('D0')) return 'DIAGNOSTIC';
  if (c.startsWith('D1')) return 'PREVENTIVE';
  if (c.startsWith('D27') || c.startsWith('D29')) return 'PROSTHETIC';
  if (c.startsWith('D2')) return 'RESTORATIVE';
  if (c.startsWith('D3')) return 'ENDODONTIC';
  if (c.startsWith('D4')) return 'PERIO';
  if (c.startsWith('D60') || c.startsWith('D61')) return 'IMPLANT';
  if (c.startsWith('D5') || c.startsWith('D62') || c.startsWith('D67')) return 'PROSTHETIC';
  if (c.startsWith('D7')) return 'SURGICAL';
  if (c.startsWith('D8')) return 'ORTHO';
  if (c.startsWith('D92')) return 'OTHER'; // Anesthesia/Sedation
  if (c.startsWith('D9')) return 'OTHER';
  return 'OTHER';
}
