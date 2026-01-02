import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from './Header';

describe('Header', () => {
  it('should render app title', () => {
    render(
      <Header
        currentPath=""
        onBack={vi.fn()}
        onSignOut={vi.fn()}
      />
    );

    expect(screen.getByText('S3 Media Browser')).toBeInTheDocument();
  });

  it('should show back button when currentPath is not empty', () => {
    render(
      <Header
        currentPath="folder1"
        onBack={vi.fn()}
        onSignOut={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /戻る/ })).toBeInTheDocument();
  });

  it('should hide back button when currentPath is empty', () => {
    render(
      <Header
        currentPath=""
        onBack={vi.fn()}
        onSignOut={vi.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: /戻る/ })).not.toBeInTheDocument();
  });

  it('should call onBack when back button is clicked', () => {
    const onBack = vi.fn();
    render(
      <Header
        currentPath="folder1"
        onBack={onBack}
        onSignOut={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /戻る/ }));

    expect(onBack).toHaveBeenCalled();
  });

  it('should show sign out button', () => {
    render(
      <Header
        currentPath=""
        onBack={vi.fn()}
        onSignOut={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /サインアウト/ })).toBeInTheDocument();
  });

  it('should call onSignOut when sign out button is clicked', () => {
    const onSignOut = vi.fn();
    render(
      <Header
        currentPath=""
        onBack={vi.fn()}
        onSignOut={onSignOut}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /サインアウト/ }));

    expect(onSignOut).toHaveBeenCalled();
  });

  it('should display current folder name in breadcrumb', () => {
    render(
      <Header
        currentPath="folder1/folder2"
        onBack={vi.fn()}
        onSignOut={vi.fn()}
      />
    );

    expect(screen.getByText('folder2')).toBeInTheDocument();
  });
});
