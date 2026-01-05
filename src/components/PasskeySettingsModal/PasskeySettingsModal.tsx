import { MouseEvent } from 'react';
import { Flex, Card, Button, Heading } from '@aws-amplify/ui-react';
import { PasskeyManagement } from '../PasskeyManagement';
import './PasskeySettingsModal.css';

export interface PasskeySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PasskeySettingsModal({
  isOpen,
  onClose,
}: PasskeySettingsModalProps) {
  if (!isOpen) {
    return null;
  }

  const handleOverlayClick = () => {
    onClose();
  };

  const handleContentClick = (e: MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className="passkey-settings-modal-overlay"
      onClick={handleOverlayClick}
      data-testid="modal-overlay"
    >
      <Card
        className="passkey-settings-modal-content"
        variation="elevated"
        onClick={handleContentClick}
        data-testid="modal-content"
      >
        <Flex direction="column" gap="medium">
          <Flex justifyContent="space-between" alignItems="center">
            <Heading level={3}>パスキー設定</Heading>
            <Button onClick={onClose} variation="link" aria-label="閉じる">
              ✕
            </Button>
          </Flex>
          <PasskeyManagement />
        </Flex>
      </Card>
    </div>
  );
}
