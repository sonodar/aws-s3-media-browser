import { Authenticator } from '@aws-amplify/ui-react';
import { StorageBrowser } from './StorageBrowser';
import '@aws-amplify/ui-react/styles.css';

function App() {
  return (
    <Authenticator hideSignUp>
      {({ signOut }) => (
        <div>
          <header style={{ padding: '1rem', borderBottom: '1px solid #ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ margin: 0, fontSize: '1.5rem' }}>S3 Media Browser</h1>
            <button onClick={signOut} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>
              Sign out
            </button>
          </header>
          <StorageBrowser />
        </div>
      )}
    </Authenticator>
  );
}

export default App;
