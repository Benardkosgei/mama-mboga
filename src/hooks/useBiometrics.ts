import { useState, useEffect, useCallback } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_CREDENTIALS_KEY = 'biometric_credentials';
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

export interface BiometricCredentials {
  email: string;
  password: string;
}

export interface UseBiometricsReturn {
  /** Whether the device hardware supports biometrics */
  isSupported: boolean;
  /** Whether the user has enrolled biometrics (fingerprint/face) on the device */
  isEnrolled: boolean;
  /** Whether the user has opted in to biometric login for this app */
  isEnabled: boolean;
  /** Human-readable label, e.g. "Fingerprint" or "Face ID" */
  biometricLabel: string;
  /** Prompt the user to authenticate with biometrics and return stored credentials */
  authenticate: () => Promise<BiometricCredentials | null>;
  /** Save credentials and enable biometric login */
  enableBiometrics: (credentials: BiometricCredentials) => Promise<boolean>;
  /** Remove stored credentials and disable biometric login */
  disableBiometrics: () => Promise<void>;
  /** Re-check hardware/enrollment state */
  refresh: () => Promise<void>;
}

export function useBiometrics(): UseBiometricsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometrics');

  const refresh = useCallback(async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = compatible
        ? await LocalAuthentication.isEnrolledAsync()
        : false;

      setIsSupported(compatible);
      setIsEnrolled(enrolled);

      // Determine the best label based on available types
      if (compatible && enrolled) {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricLabel('Face ID');
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricLabel('Fingerprint');
        } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
          setBiometricLabel('Iris');
        }
      }

      // Check if the user has enabled biometrics in this app
      const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
      setIsEnabled(enabled === 'true' && compatible && enrolled);
    } catch {
      setIsSupported(false);
      setIsEnrolled(false);
      setIsEnabled(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const authenticate = useCallback(async (): Promise<BiometricCredentials | null> => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Sign in with biometrics',
        fallbackLabel: 'Use password',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (!result.success) return null;

      const stored = await SecureStore.getItemAsync(BIOMETRIC_CREDENTIALS_KEY);
      if (!stored) return null;

      return JSON.parse(stored) as BiometricCredentials;
    } catch {
      return null;
    }
  }, []);

  const enableBiometrics = useCallback(
    async (credentials: BiometricCredentials): Promise<boolean> => {
      try {
        // Verify biometrics before saving credentials
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Confirm your identity to enable biometric login',
          cancelLabel: 'Cancel',
          disableDeviceFallback: false,
        });

        if (!result.success) return false;

        await SecureStore.setItemAsync(
          BIOMETRIC_CREDENTIALS_KEY,
          JSON.stringify(credentials)
        );
        await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
        setIsEnabled(true);
        return true;
      } catch {
        return false;
      }
    },
    []
  );

  const disableBiometrics = useCallback(async (): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIALS_KEY);
      await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
      setIsEnabled(false);
    } catch {
      // ignore
    }
  }, []);

  return {
    isSupported,
    isEnrolled,
    isEnabled,
    biometricLabel,
    authenticate,
    enableBiometrics,
    disableBiometrics,
    refresh,
  };
}
