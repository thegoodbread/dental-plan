
import { evaluateVisitCompleteness } from './CompletenessEngine';
import { TreatmentPlanItem, Visit, VisitType } from '../types';
import { SoapSection, AssignedRisk } from './dentalTypes';

// Declarations for test runner globals (jest/mocha)
declare var describe: any;
declare var it: any;
declare var expect: any;

// Mocks
const mockVisit = (updates?: Partial<Visit>): Visit => ({
  id: 'v1',
  treatmentPlanId: 'tp1',
  date: '2024-01-01',
  provider: 'Dr. Test',
  // FIX: Added required providerId
  providerId: 'p1',
  visitType: 'restorative',
  attachedProcedureIds: [],
  createdAt: '2024-01-01',
  chiefComplaint: 'Pain on lower right',
  hpi: 'Started 2 days ago',
  radiographicFindings: 'Radiolucency on distal of #30',
  ...updates
});

const mockItem = (code: string, updates?: Partial<TreatmentPlanItem>): TreatmentPlanItem => ({
  id: 'i1',
  treatmentPlanId: 'tp1',
  feeScheduleEntryId: 'f1',
  procedureCode: code,
  procedureName: 'Test Proc',
  unitType: 'PER_TOOTH',
  category: 'RESTORATIVE',
  itemType: 'PROCEDURE',
  baseFee: 100,
  units: 1,
  grossFee: 100,
  discount: 0,
  netFee: 100,
  sortOrder: 1,
  procedureStatus: 'COMPLETED',
  ...updates
});

const mockRisk: AssignedRisk = {
  id: 'r1',
  isActive: true,
  riskLibraryItemId: 'rl1',
  severitySnapshot: 'COMMON',
  // ... minimal required fields
} as any;

describe('CompletenessEngine', () => {
  it('should score 100 for a perfectly documented restorative visit', () => {
    const visit = mockVisit();
    const item = mockItem('D2391', {
      selectedTeeth: [30],
      surfaces: ['O'],
      diagnosisCodes: ['K02.9']
    });
    
    const result = evaluateVisitCompleteness(visit, [item], [], [mockRisk]);
    expect(result.score).toBe(100);
    expect(result.missing).toHaveLength(0);
  });

  it('should fail if radiographic findings missing for restorative', () => {
    const visit = mockVisit({ radiographicFindings: undefined });
    const item = mockItem('D2391', {
      selectedTeeth: [30],
      surfaces: ['O'],
      diagnosisCodes: ['K02.9']
    });

    const result = evaluateVisitCompleteness(visit, [item], [], [mockRisk]);
    expect(result.score).toBeLessThan(100);
    expect(result.missing).toContain('D2391: Radiographic findings required.');
  });

  it('should fail if surfaces missing for restorative', () => {
    const visit = mockVisit();
    const item = mockItem('D2392', {
      selectedTeeth: [30],
      surfaces: [], // Missing
      diagnosisCodes: ['K02.9']
    });

    const result = evaluateVisitCompleteness(visit, [item], [], [mockRisk]);
    expect(result.missing).toContain('D2392: Surfaces missing.');
  });

  it('should fail crown if no consent risks', () => {
    const visit = mockVisit();
    const item = mockItem('D2740', {
      selectedTeeth: [30],
      diagnosisCodes: ['K02.9'],
      documentation: { hasXray: true }
    });

    const result = evaluateVisitCompleteness(visit, [item], [], []); // No risks
    expect(result.missing).toContain('D2740: Consent risks required.');
  });

  it('should pass no-procedure visit if noted', () => {
    const visit = mockVisit();
    const soap: SoapSection[] = [{ id: 's1', type: 'PLAN', title: 'Plan', content: 'No procedures performed today.', lastEditedAt: '' }];
    
    const result = evaluateVisitCompleteness(visit, [], soap, []);
    expect(result.score).toBe(100);
  });
});
