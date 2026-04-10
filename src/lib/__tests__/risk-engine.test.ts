import { RiskEngine } from '../risk-engine';

// ── Prisma mock ───────────────────────────────────────────────────────────────
// Create mock fns inside the factory to avoid SWC hoisting TDZ issues,
// then expose them on the mock module so tests can access via require().

jest.mock('@prisma/client', () => {
    const findUnique = jest.fn();
    const count = jest.fn();
    return {
        PrismaClient: jest.fn().mockImplementation(() => ({
            company: {
                findUnique,
                update: jest.fn().mockResolvedValue({}),
            },
            courtRecord: { count },
        })),
        __mocks: { findUnique, count },
    };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { __mocks: _pm } = require('@prisma/client');
const mockFindUnique = _pm.findUnique as jest.Mock;
const mockCount = _pm.count as jest.Mock;

// ── helpers ───────────────────────────────────────────────────────────────────

function makeCompany(overrides: Record<string, any> = {}) {
    return {
        jarKodas: 'TEST001',
        name: 'Test UAB',
        employeeCount: 10,
        avgSalary: 2000,
        registeredAt: new Date('2015-01-01'),
        contracts: [],
        sodraHistory: [{}], // non-empty = has SODRA data
        ...overrides,
    };
}

function makeContract(overrides: Record<string, any> = {}) {
    return {
        contractId: 'C1',
        value: 100_000,
        signedAt: new Date('2020-06-01'),
        status: 'Įvykdyta',
        ...overrides,
    };
}

beforeEach(() => {
    mockFindUnique.mockReset();
    mockCount.mockReset();
});

// ── calculateDisplayScore ─────────────────────────────────────────────────────

describe('calculateDisplayScore', () => {
    it('returns 0 for riskScore 0', () => {
        expect(RiskEngine.calculateDisplayScore(0)).toBe(0);
    });

    it('returns log2(101)*10 for riskScore 100', () => {
        expect(RiskEngine.calculateDisplayScore(100)).toBeCloseTo(Math.log2(101) * 10, 5);
    });
});

// ── getRiskFlags ──────────────────────────────────────────────────────────────

describe('getRiskFlags', () => {
    it('returns no flags for a healthy company', async () => {
        mockFindUnique.mockResolvedValue(makeCompany({
            contracts: [makeContract()],
        }));
        const flags = await RiskEngine.getRiskFlags('TEST001');
        expect(flags).toHaveLength(0);
    });

    it('flags CRITICAL_WORKFORCE when employeeCount < 2', async () => {
        mockFindUnique.mockResolvedValue(makeCompany({ employeeCount: 1, contracts: [] }));
        const flags = await RiskEngine.getRiskFlags('TEST001');
        expect(flags.find(f => f.id === 'CRITICAL_WORKFORCE')).toBeDefined();
        expect(flags.find(f => f.id === 'CRITICAL_WORKFORCE')?.score).toBe(50);
    });

    it('does NOT flag CRITICAL_WORKFORCE when employeeCount === 2', async () => {
        mockFindUnique.mockResolvedValue(makeCompany({ employeeCount: 2, contracts: [] }));
        const flags = await RiskEngine.getRiskFlags('TEST001');
        expect(flags.find(f => f.id === 'CRITICAL_WORKFORCE')).toBeUndefined();
    });

    it('flags DISPROPORTIONATE_VALUE when employees < 5 and value > 500k', async () => {
        mockFindUnique.mockResolvedValue(makeCompany({
            employeeCount: 3,
            contracts: [makeContract({ value: 600_000 })],
        }));
        const flags = await RiskEngine.getRiskFlags('TEST001');
        expect(flags.find(f => f.id === 'DISPROPORTIONATE_VALUE')).toBeDefined();
        expect(flags.find(f => f.id === 'DISPROPORTIONATE_VALUE')?.score).toBe(30);
    });

    it('does NOT flag DISPROPORTIONATE_VALUE when value <= 500k', async () => {
        mockFindUnique.mockResolvedValue(makeCompany({
            employeeCount: 3,
            contracts: [makeContract({ value: 500_000 })],
        }));
        const flags = await RiskEngine.getRiskFlags('TEST001');
        expect(flags.find(f => f.id === 'DISPROPORTIONATE_VALUE')).toBeUndefined();
    });

    it('flags FRESHLY_REGISTERED when company < 6 months old at first contract', async () => {
        const registeredAt = new Date('2020-01-01');
        const signedAt = new Date('2020-04-01'); // 3 months later
        mockFindUnique.mockResolvedValue(makeCompany({
            registeredAt,
            contracts: [makeContract({ signedAt })],
        }));
        const flags = await RiskEngine.getRiskFlags('TEST001');
        expect(flags.find(f => f.id === 'FRESHLY_REGISTERED')).toBeDefined();
        expect(flags.find(f => f.id === 'FRESHLY_REGISTERED')?.score).toBe(80);
    });

    it('does NOT flag FRESHLY_REGISTERED when company is 7 months old at first contract', async () => {
        const registeredAt = new Date('2020-01-01');
        const signedAt = new Date('2020-08-01'); // 7 months later
        mockFindUnique.mockResolvedValue(makeCompany({
            registeredAt,
            contracts: [makeContract({ signedAt })],
        }));
        const flags = await RiskEngine.getRiskFlags('TEST001');
        expect(flags.find(f => f.id === 'FRESHLY_REGISTERED')).toBeUndefined();
    });

    it('flags NON_ADVERTISED_WIN when contract status contains mvp keyword', async () => {
        mockFindUnique.mockResolvedValue(makeCompany({
            contracts: [makeContract({ status: 'MVP neskelbiamos derybos' })],
        }));
        const flags = await RiskEngine.getRiskFlags('TEST001');
        expect(flags.find(f => f.id === 'NON_ADVERTISED_WIN')).toBeDefined();
        expect(flags.find(f => f.id === 'NON_ADVERTISED_WIN')?.score).toBe(80);
    });

    it('flags NO_SODRA_DATA when sodraHistory is empty and contracts exist', async () => {
        mockFindUnique.mockResolvedValue(makeCompany({
            sodraHistory: [],
            contracts: [makeContract()],
        }));
        const flags = await RiskEngine.getRiskFlags('TEST001');
        expect(flags.find(f => f.id === 'NO_SODRA_DATA')).toBeDefined();
        expect(flags.find(f => f.id === 'NO_SODRA_DATA')?.score).toBe(40);
    });

    it('does NOT flag NO_SODRA_DATA when company has no contracts either', async () => {
        mockFindUnique.mockResolvedValue(makeCompany({ sodraHistory: [], contracts: [] }));
        const flags = await RiskEngine.getRiskFlags('TEST001');
        expect(flags.find(f => f.id === 'NO_SODRA_DATA')).toBeUndefined();
    });

    it('returns empty array for unknown companyId', async () => {
        mockFindUnique.mockResolvedValue(null);
        const flags = await RiskEngine.getRiskFlags('UNKNOWN');
        expect(flags).toHaveLength(0);
    });
});

// ── getSubstanceRatio ─────────────────────────────────────────────────────────

describe('getSubstanceRatio', () => {
    it('returns null when no employee or salary data', async () => {
        mockFindUnique.mockResolvedValue(makeCompany({ employeeCount: null, avgSalary: null, contracts: [] }));
        const ratio = await RiskEngine.getSubstanceRatio('TEST001');
        expect(ratio).toBeNull();
    });

    it('computes correct ratio', async () => {
        // 10 employees × €2000/mo × 12 = €240k annual payroll
        // 1 contract of €480k → ratio = 2
        mockFindUnique.mockResolvedValue(makeCompany({
            employeeCount: 10,
            avgSalary: 2000,
            contracts: [makeContract({ value: 480_000 })],
        }));
        const ratio = await RiskEngine.getSubstanceRatio('TEST001');
        expect(ratio).toBeCloseTo(2, 5);
    });
});
