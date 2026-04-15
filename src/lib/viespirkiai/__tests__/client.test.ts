// axios.create() is called at module init time, so we must intercept via factory.
// The instance mock is captured from mock.results after the module is imported.
import {ViespirkiaiError} from '../types';

jest.mock('axios', () => {
    const mockInstance = {get: jest.fn()};
    return {
        __esModule: true,
        default: {
            create: jest.fn(() => mockInstance),
            isAxiosError: jest.fn() as (err: unknown) => boolean,
        },
    };
});

// Import client AFTER mock is registered so it picks up the mocked axios.create
import axios from 'axios';
import {fetchAsmuo, fetchSutartis, fetchPirkimas} from '../client';

function getMockGet(): jest.Mock {
    return (axios.create as jest.Mock).mock.results[0].value.get as jest.Mock;
}

describe('viespirkiai client', () => {
    beforeEach(() => {
        getMockGet().mockReset();
        (axios.isAxiosError as jest.Mock).mockReset();
    });

    it('fetchAsmuo returns parsed JSON on success', async () => {
        const payload = {jar: {jarKodas: 110053842, pavadinimas: 'Test'}};
        getMockGet().mockResolvedValueOnce({data: payload});

        const result = await fetchAsmuo('110053842');
        expect(result).toEqual(payload);
        expect(getMockGet()).toHaveBeenCalledWith('/asmuo/110053842.json');
    });

    it('fetchSutartis returns parsed JSON on success', async () => {
        const payload = {sutartiesUnikalusID: 'abc-123', verte: 5000};
        getMockGet().mockResolvedValueOnce({data: payload});

        const result = await fetchSutartis('abc-123');
        expect(result).toEqual(payload);
        expect(getMockGet()).toHaveBeenCalledWith('/sutartis/abc-123.json');
    });

    it('fetchPirkimas returns parsed JSON on success', async () => {
        const payload = {pirkimoId: '7346201'};
        getMockGet().mockResolvedValueOnce({data: payload});

        const result = await fetchPirkimas('7346201');
        expect(result).toEqual(payload);
    });

    it('throws ViespirkiaiError with status code on HTTP error', async () => {
        const axiosError = Object.assign(new Error('Request failed'), {
            isAxiosError: true,
            response: {status: 404},
        });
        (axios.isAxiosError as jest.Mock).mockReturnValue(true);
        getMockGet().mockRejectedValueOnce(axiosError);

        await expect(fetchAsmuo('999')).rejects.toThrow(ViespirkiaiError);
        getMockGet().mockRejectedValueOnce(axiosError);
        await expect(fetchAsmuo('999')).rejects.toMatchObject({statusCode: 404});
    });
});
