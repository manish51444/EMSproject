import request from 'supertest';
import { app } from '../server.js';
import User from '../models/User.js';

describe('Auth API', () => {
    const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123!',
        role: 'developer',
        organizationName: 'Test Org',
    };

    it('should register a new user', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send(userData);

        expect(res.statusCode).toEqual(201);
        expect(res.body.name).toEqual(userData.name);
        expect(res.body.organization).toBeDefined();
    });

    it('should login the user', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: userData.email,
                password: userData.password
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('token');
        expect(res.body.organization).toBeDefined();
    });

    it('should fail login with wrong password', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: userData.email,
                password: 'WrongPassword123!'
            });

        expect(res.statusCode).toEqual(401);
    });

    it('should reject reset-password when token param is too short', async () => {
        const res = await request(app)
            .put('/api/auth/reset-password/short')
            .send({ password: 'NewPassword123!' });
        expect(res.statusCode).toEqual(400);
        expect(res.body.message).toBeDefined();
    });
});
