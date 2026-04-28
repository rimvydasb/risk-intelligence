import {parseMcpSseResponse} from '../mcpClient';
import {ViespirkiaiError} from '../types';

const VALID_INNER = {
    darbovietes: [{jarKodas: '302913276', deklaracija: 'abc', pavadinimas: 'CPO LT'}],
    rysiaiSuJa: [],
    sutuoktinioDarbovietes: [],
    total: 1,
    limit: 20,
};

function makeSseText(inner: object): string {
    const outer = {
        jsonrpc: '2.0',
        id: 1,
        result: {
            content: [{type: 'text', text: JSON.stringify(inner)}],
        },
    };
    return `event: message\ndata: ${JSON.stringify(outer)}\n\n`;
}

describe('parseMcpSseResponse', () => {
    it('extracts and returns the inner JSON from result.content[0].text', () => {
        const result = parseMcpSseResponse(makeSseText(VALID_INNER), 'ROBERTAS VYŠNIAUSKAS');
        expect(result.total).toBe(1);
        expect(result.darbovietes?.[0].jarKodas).toBe('302913276');
    });

    it('handles multiple data: lines and picks the one with result.content', () => {
        const progressEvent = JSON.stringify({jsonrpc: '2.0', id: 1, result: {progress: 50}});
        const validEvent = JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            result: {content: [{type: 'text', text: JSON.stringify(VALID_INNER)}]},
        });
        const text = `data: ${progressEvent}\ndata: ${validEvent}\n`;
        const result = parseMcpSseResponse(text, 'TEST');
        expect(result.total).toBe(1);
    });

    it('throws ViespirkiaiError when no valid data line found', () => {
        expect(() => parseMcpSseResponse('data: {"jsonrpc":"2.0"}\n', 'TEST')).toThrow(ViespirkiaiError);
    });

    it('throws ViespirkiaiError when inner text is invalid JSON', () => {
        const outer = JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            result: {content: [{type: 'text', text: 'not-json'}]},
        });
        expect(() => parseMcpSseResponse(`data: ${outer}\n`, 'TEST')).toThrow(ViespirkiaiError);
    });

    it('throws ViespirkiaiError on empty response', () => {
        expect(() => parseMcpSseResponse('', 'TEST')).toThrow(ViespirkiaiError);
    });

    it('skips non-text content blocks', () => {
        const outer = JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            result: {content: [{type: 'image', data: 'base64...'}]},
        });
        expect(() => parseMcpSseResponse(`data: ${outer}\n`, 'TEST')).toThrow(ViespirkiaiError);
    });
});
