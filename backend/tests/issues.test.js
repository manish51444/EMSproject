import request from 'supertest';
import { app } from '../server.js';

describe('Issues API', () => {
    it('should return 401 when getting issues without auth', async () => {
        const res = await request(app).get('/api/issues');
        expect(res.statusCode).toBe(401);
    });
});
