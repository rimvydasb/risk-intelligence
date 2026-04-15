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
import {fetchAsmuo, fetchSutartis, fetchPirkimas, fetchSutartisList} from '../client';

function getMockGet(): jest.Mock {
    return (axios.create as jest.Mock).mock.results[0].value.get as jest.Mock;
}

const ARTICLE_HTML = (id: string, from: string, till: string, amount: string, name: string) => `
<article class="result-card card-clickable">
  <a href="/sutartis/${id}"><h3>${name}</h3></a>
  <dd class="galiojimas"><time datetime="${from}"></time> – <time datetime="${till}"></time></dd>
  <span class="amount">${amount}</span>
</article>`;

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

    describe('fetchSutartisList', () => {
        it('scrapes single page of contracts', async () => {
            const html =
                ARTICLE_HTML('ctr-1', '2024-01-01', '2024-06-30', '10 000,00 €', 'IT paslaugos') +
                ARTICLE_HTML('ctr-2', '2024-07-01', '2025-01-31', '5 500,50 €', 'Konsultacijos');
            getMockGet().mockResolvedValueOnce({data: html}); // page 1
            getMockGet().mockResolvedValueOnce({data: '<html></html>'}); // page 2 — empty

            const contracts = await fetchSutartisList('111111111', '222222222');
            expect(contracts).toHaveLength(2);
            expect(contracts[0]).toMatchObject({
                sutartiesUnikalusID: 'ctr-1',
                name: 'IT paslaugos',
                fromDate: '2024-01-01',
                tillDate: '2024-06-30',
                value: 10000,
            });
            expect(contracts[1]).toMatchObject({
                sutartiesUnikalusID: 'ctr-2',
                value: 5500.5,
            });
            expect(getMockGet()).toHaveBeenCalledWith(
                '/?perkanciosiosOrganizacijosKodas=111111111&tiekejoKodas=222222222&page=1',
                {responseType: 'text'},
            );
        });

        it('stops pagination when page returns no articles', async () => {
            getMockGet().mockResolvedValueOnce({data: '<html>no articles</html>'});
            const contracts = await fetchSutartisList('111111111', '222222222');
            expect(contracts).toHaveLength(0);
            expect(getMockGet()).toHaveBeenCalledTimes(1);
        });

        it('handles missing tillDate gracefully', async () => {
            const html = `
<article class="result-card card-clickable">
  <a href="/sutartis/ctr-3"><h3>Only from</h3></a>
  <dd class="galiojimas"><time datetime="2023-03-01"></time></dd>
  <span class="amount">1 000,00 €</span>
</article>`;
            getMockGet().mockResolvedValueOnce({data: html});
            getMockGet().mockResolvedValueOnce({data: '<html></html>'});

            const contracts = await fetchSutartisList('111111111', '222222222');
            expect(contracts[0]).toMatchObject({fromDate: '2023-03-01', tillDate: null});
        });
    });
});
