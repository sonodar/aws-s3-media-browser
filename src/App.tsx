import { Authenticator } from '@aws-amplify/ui-react';
import { MediaBrowser } from './components/MediaBrowser';
import '@aws-amplify/ui-react/styles.css';

function App() {
  return (
    <Authenticator hideSignUp>
      {({ signOut }) => (
        <MediaBrowser onSignOut={signOut ?? (() => {})} />
      )}
    </Authenticator>
  );
}

export default App;
