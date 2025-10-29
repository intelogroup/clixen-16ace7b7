/**
 * Unit Tests for Calendar Client Module
 * Tests OAuth client functionality with mocked Google APIs
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

// Mock fs module
vi.mock('fs');

// Mock googleapis
const mockCalendar = vi.fn();
const mockOAuth2 = vi.fn();
const mockGetToken = vi.fn();
const mockRefreshAccessToken = vi.fn();
const mockGetTokenInfo = vi.fn();
const mockRevokeToken = vi.fn();
const mockSetCredentials = vi.fn();
const mockGenerateAuthUrl = vi.fn();

vi.mock('googleapis', () => ({
    google: {
        calendar: mockCalendar,
        auth: {
            OAuth2: mockOAuth2
        }
    }
}));

describe('Calendar Client Module', () => {
    let calendarClient;
    
    beforeEach(() => {
        vi.clearAllMocks();
        
        // Mock OAuth2 client
        mockOAuth2.mockImplementation(() => ({
            setCredentials: mockSetCredentials,
            getToken: mockGetToken,
            refreshAccessToken: mockRefreshAccessToken,
            getTokenInfo: mockGetTokenInfo,
            revokeToken: mockRevokeToken,
            generateAuthUrl: mockGenerateAuthUrl
        }));
        
        // Mock credentials.json
        fs.readFileSync.mockImplementation((filePath) => {
            if (filePath.includes('credentials.json')) {
                return JSON.stringify({
                    installed: {
                        client_id: 'test-client-id',
                        client_secret: 'test-client-secret',
                        redirect_uris: ['http://localhost:3000/callback']
                    }
                });
            }
            if (filePath.includes('test@example.com.json')) {
                return JSON.stringify({
                    access_token: 'test-access-token',
                    refresh_token: 'test-refresh-token',
                    expiry_date: Date.now() + 3600000 // 1 hour from now
                });
            }
            throw new Error('File not found');
        });
        
        fs.existsSync.mockReturnValue(true);
        fs.writeFileSync.mockImplementation(() => {});
        fs.unlinkSync.mockImplementation(() => {});
        
        // Import module after mocks are set up
        calendarClient = require('../client');
    });
    
    afterEach(() => {
        vi.resetModules();
    });
    
    describe('buildOauth2Client', () => {
        it('should build OAuth2 client from credentials', () => {
            const client = calendarClient.buildOauth2Client();
            
            expect(mockOAuth2).toHaveBeenCalledWith(
                'test-client-id',
                'test-client-secret',
                'http://localhost:3000/callback'
            );
        });
    });
    
    describe('getCalendarClient', () => {
        it('should get calendar client for valid user', async () => {
            mockCalendar.mockReturnValue({ events: {} });
            
            const client = await calendarClient.getCalendarClient('test@example.com');
            
            expect(fs.readFileSync).toHaveBeenCalled();
            expect(mockSetCredentials).toHaveBeenCalled();
            expect(mockCalendar).toHaveBeenCalled();
        });
        
        it('should throw error if no user email provided', async () => {
            await expect(
                calendarClient.getCalendarClient(null)
            ).rejects.toThrow('No user signed in');
        });
        
        it('should throw error if token file not found', async () => {
            fs.existsSync.mockReturnValue(false);
            
            await expect(
                calendarClient.getCalendarClient('test@example.com')
            ).rejects.toThrow('No token found');
        });
        
        it('should refresh expired token', async () => {
            // Mock expired token
            fs.readFileSync.mockImplementation((filePath) => {
                if (filePath.includes('credentials.json')) {
                    return JSON.stringify({
                        installed: {
                            client_id: 'test-client-id',
                            client_secret: 'test-client-secret',
                            redirect_uris: ['http://localhost:3000/callback']
                        }
                    });
                }
                if (filePath.includes('test@example.com.json')) {
                    return JSON.stringify({
                        access_token: 'expired-token',
                        refresh_token: 'test-refresh-token',
                        expiry_date: Date.now() - 3600000 // Expired 1 hour ago
                    });
                }
            });
            
            mockRefreshAccessToken.mockResolvedValue({
                credentials: {
                    access_token: 'new-access-token',
                    refresh_token: 'new-refresh-token',
                    expiry_date: Date.now() + 3600000
                }
            });
            
            mockCalendar.mockReturnValue({ events: {} });
            
            await calendarClient.getCalendarClient('test@example.com');
            
            expect(mockRefreshAccessToken).toHaveBeenCalled();
            expect(fs.writeFileSync).toHaveBeenCalled();
        });
    });
    
    describe('generateAuthUrl', () => {
        it('should generate authorization URL', () => {
            mockGenerateAuthUrl.mockReturnValue('https://accounts.google.com/auth');
            
            const url = calendarClient.generateAuthUrl();
            
            expect(mockGenerateAuthUrl).toHaveBeenCalledWith({
                access_type: 'offline',
                prompt: 'consent',
                scope: expect.arrayContaining([
                    'https://www.googleapis.com/auth/calendar',
                    'https://www.googleapis.com/auth/calendar.events'
                ])
            });
        });
    });
    
    describe('handleOAuthCallback', () => {
        it('should exchange code for tokens and save', async () => {
            mockGetToken.mockResolvedValue({
                tokens: {
                    access_token: 'new-token',
                    refresh_token: 'new-refresh'
                }
            });
            
            mockGetTokenInfo.mockResolvedValue({
                email: 'test@example.com'
            });
            
            const result = await calendarClient.handleOAuthCallback('auth-code');
            
            expect(mockGetToken).toHaveBeenCalledWith('auth-code');
            expect(mockGetTokenInfo).toHaveBeenCalled();
            expect(fs.writeFileSync).toHaveBeenCalled();
            expect(result.email).toBe('test@example.com');
        });
        
        it('should throw error if no code provided', async () => {
            await expect(
                calendarClient.handleOAuthCallback(null)
            ).rejects.toThrow('Missing authorization code');
        });
    });
    
    describe('hasCredentials', () => {
        it('should return true if token file exists', () => {
            fs.existsSync.mockReturnValue(true);
            
            const result = calendarClient.hasCredentials('test@example.com');
            
            expect(result).toBe(true);
        });
        
        it('should return false if token file does not exist', () => {
            fs.existsSync.mockReturnValue(false);
            
            const result = calendarClient.hasCredentials('test@example.com');
            
            expect(result).toBe(false);
        });
        
        it('should return false if no email provided', () => {
            const result = calendarClient.hasCredentials(null);
            
            expect(result).toBe(false);
        });
    });
    
    describe('revokeAccess', () => {
        it('should revoke token and delete file', async () => {
            mockRevokeToken.mockResolvedValue({});
            
            await calendarClient.revokeAccess('test@example.com');
            
            expect(mockRevokeToken).toHaveBeenCalled();
            expect(fs.unlinkSync).toHaveBeenCalled();
        });
        
        it('should delete file even if revoke fails', async () => {
            mockRevokeToken.mockRejectedValue(new Error('Revoke failed'));
            
            await calendarClient.revokeAccess('test@example.com');
            
            expect(fs.unlinkSync).toHaveBeenCalled();
        });
    });
});
