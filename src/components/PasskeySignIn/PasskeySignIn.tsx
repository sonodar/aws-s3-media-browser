import { useState, FormEvent } from 'react';
import { signIn } from 'aws-amplify/auth';
import {
  Flex,
  TextField,
  Button,
  Text,
  Link,
  Loader,
  Heading,
} from '@aws-amplify/ui-react';

export interface PasskeySignInProps {
  onSuccess: () => void;
  onSwitchToPassword: () => void;
}

export function PasskeySignIn({
  onSuccess,
  onSwitchToPassword,
}: PasskeySignInProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await signIn({
        username: email,
        options: {
          authFlowType: 'USER_AUTH',
          preferredChallenge: 'WEB_AUTHN',
        },
      });

      if (result.nextStep.signInStep === 'DONE') {
        onSuccess();
      }
    } catch {
      setError('サインインに失敗しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex
      as="form"
      direction="column"
      gap="medium"
      padding="large"
      onSubmit={handleSubmit}
    >
      <Heading level={3}>パスキーでサインイン</Heading>

      <TextField
        label="メールアドレス"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
      />

      {error && (
        <Text color="font.error" variation="error">
          {error}
        </Text>
      )}

      <Button
        type="submit"
        variation="primary"
        isLoading={loading}
        isDisabled={loading}
        loadingText="サインイン中..."
      >
        {loading ? <Loader /> : 'パスキーでサインイン'}
      </Button>

      <Flex justifyContent="center">
        <Link onClick={onSwitchToPassword}>パスワードでサインイン</Link>
      </Flex>
    </Flex>
  );
}
