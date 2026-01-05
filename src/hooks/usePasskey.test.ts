import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { usePasskey } from './usePasskey';
import {
  listWebAuthnCredentials,
  associateWebAuthnCredential,
  deleteWebAuthnCredential,
} from 'aws-amplify/auth';

vi.mock('aws-amplify/auth', () => ({
  listWebAuthnCredentials: vi.fn(),
  associateWebAuthnCredential: vi.fn(),
  deleteWebAuthnCredential: vi.fn(),
}));

describe('usePasskey', () => {
  const mockCredentials = [
    {
      credentialId: 'cred-1',
      friendlyCredentialName: 'My MacBook',
      relyingPartyId: 'localhost',
      createdAt: new Date('2024-01-01T00:00:00Z'),
    },
    {
      credentialId: 'cred-2',
      friendlyCredentialName: 'My iPhone',
      relyingPartyId: 'localhost',
      createdAt: new Date('2024-01-02T00:00:00Z'),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (listWebAuthnCredentials as Mock).mockResolvedValue({
      credentials: mockCredentials,
      nextToken: undefined,
    });
  });

  describe('initial state', () => {
    it('should fetch credentials on mount', async () => {
      const { result } = renderHook(() => usePasskey());

      // Initially loading
      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(listWebAuthnCredentials).toHaveBeenCalled();
      expect(result.current.credentials).toHaveLength(2);
      expect(result.current.error).toBeNull();
    });
  });

  describe('listWebAuthnCredentials', () => {
    it('should handle pagination with nextToken', async () => {
      const page1 = {
        credentials: [mockCredentials[0]],
        nextToken: 'token-1',
      };
      const page2 = {
        credentials: [mockCredentials[1]],
        nextToken: undefined,
      };

      (listWebAuthnCredentials as Mock)
        .mockResolvedValueOnce(page1)
        .mockResolvedValueOnce(page2);

      const { result } = renderHook(() => usePasskey());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(listWebAuthnCredentials).toHaveBeenCalledTimes(2);
      expect(result.current.credentials).toHaveLength(2);
    });

    it('should handle errors', async () => {
      const error = new Error('Failed to fetch');
      (listWebAuthnCredentials as Mock).mockRejectedValue(error);

      const { result } = renderHook(() => usePasskey());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe(error);
      expect(result.current.credentials).toHaveLength(0);
    });
  });

  describe('registerPasskey', () => {
    it('should register a new passkey and refresh the list', async () => {
      (associateWebAuthnCredential as Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => usePasskey());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.registerPasskey();
      });

      expect(associateWebAuthnCredential).toHaveBeenCalled();
      // Should refresh credentials after registration
      expect(listWebAuthnCredentials).toHaveBeenCalledTimes(2);
    });

    it('should set registering state during registration', async () => {
      let resolveRegistration: () => void;
      const registrationPromise = new Promise<void>((resolve) => {
        resolveRegistration = resolve;
      });
      (associateWebAuthnCredential as Mock).mockReturnValue(registrationPromise);

      const { result } = renderHook(() => usePasskey());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.registering).toBe(false);

      act(() => {
        result.current.registerPasskey();
      });

      await waitFor(() => {
        expect(result.current.registering).toBe(true);
      });

      await act(async () => {
        resolveRegistration!();
        await registrationPromise;
      });

      await waitFor(() => {
        expect(result.current.registering).toBe(false);
      });
    });

    it('should handle registration errors', async () => {
      const error = new Error('Registration failed');
      (associateWebAuthnCredential as Mock).mockRejectedValue(error);

      const { result } = renderHook(() => usePasskey());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.registerPasskey();
      });

      expect(result.current.error).toBe(error);
    });
  });

  describe('deletePasskey', () => {
    it('should delete a passkey and refresh the list', async () => {
      (deleteWebAuthnCredential as Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => usePasskey());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.deletePasskey('cred-1');
      });

      expect(deleteWebAuthnCredential).toHaveBeenCalledWith({
        credentialId: 'cred-1',
      });
      // Should refresh credentials after deletion
      expect(listWebAuthnCredentials).toHaveBeenCalledTimes(2);
    });

    it('should handle deletion errors', async () => {
      const error = new Error('Deletion failed');
      (deleteWebAuthnCredential as Mock).mockRejectedValue(error);

      const { result } = renderHook(() => usePasskey());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.deletePasskey('cred-1');
      });

      expect(result.current.error).toBe(error);
    });
  });

  describe('refreshCredentials', () => {
    it('should manually refresh the credentials list', async () => {
      const { result } = renderHook(() => usePasskey());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(listWebAuthnCredentials).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.refreshCredentials();
      });

      expect(listWebAuthnCredentials).toHaveBeenCalledTimes(2);
    });
  });
});
