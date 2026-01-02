import { useMemo } from 'react';
import {
  createAmplifyAuthAdapter,
  createStorageBrowser,
} from '@aws-amplify/ui-react-storage/browser';
import '@aws-amplify/ui-react-storage/styles.css';

export function StorageBrowser() {
  const { StorageBrowser: Browser } = useMemo(
    () =>
      createStorageBrowser({
        config: createAmplifyAuthAdapter(),
      }),
    []
  );

  return <Browser />;
}
