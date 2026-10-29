import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PermissionsReviewModal } from './PermissionsReviewModal';
import { CredentialInspectionReport } from '../types/task';

describe('PermissionsReviewModal', () => {
  const validReport: CredentialInspectionReport = {
    providers: [
      {
        provider: 'microsoft',
        isValid: true,
        userName: 'Dev Admin',
        userEmail: 'admin@tenant.onmicrosoft.com',
        avatarUrl: undefined,
        accountType: 'Microsoft 365 Account',
        permissions: [
          {
            scope: 'Tasks.ReadWrite',
            description: 'Read, create, update, and complete tasks in Microsoft To Do and Planner',
            isRequired: true,
            isGranted: true,
            featureImpact: undefined,
          },
          {
            scope: 'User.Read',
            description: 'Sign in and read user profile and account details',
            isRequired: true,
            isGranted: true,
            featureImpact: undefined,
          },
          {
            scope: 'EduAssignments.ReadBasic',
            description: 'Read class homework, assignments, and due dates in Teams for Education',
            isRequired: false,
            isGranted: false,
            featureImpact: 'Teams for Education assignments disabled (normal for personal or business accounts).',
          },
        ],
        allRequiredGranted: true,
      },
    ],
    canProceed: true,
  };

  const invalidReport: CredentialInspectionReport = {
    providers: [
      {
        provider: 'github',
        isValid: false,
        errorMessage: 'Invalid, expired, or revoked GitHub Personal Access Token (401 Unauthorized)',
        userName: undefined,
        userEmail: undefined,
        avatarUrl: undefined,
        accountType: undefined,
        permissions: [],
        allRequiredGranted: false,
      },
    ],
    canProceed: false,
  };

  it('renders nothing when not open or report is null', () => {
    const { container: c1 } = render(
      <PermissionsReviewModal
        isOpen={false}
        report={validReport}
        onConfirm={async () => {}}
        onCancel={() => {}}
        isSaving={false}
      />
    );
    expect(c1.firstChild).toBeNull();

    const { container: c2 } = render(
      <PermissionsReviewModal
        isOpen={true}
        report={null}
        onConfirm={async () => {}}
        onCancel={() => {}}
        isSaving={false}
      />
    );
    expect(c2.firstChild).toBeNull();
  });

  it('renders provider identity and permission scopes correctly', () => {
    render(
      <PermissionsReviewModal
        isOpen={true}
        report={validReport}
        onConfirm={async () => {}}
        onCancel={() => {}}
        isSaving={false}
      />
    );

    expect(screen.getByText('Review Permissions & Identity')).toBeInTheDocument();
    expect(screen.getByText('Dev Admin')).toBeInTheDocument();
    expect(screen.getByText('admin@tenant.onmicrosoft.com')).toBeInTheDocument();
    expect(screen.getByText('Tasks.ReadWrite')).toBeInTheDocument();
    expect(screen.getByText('EduAssignments.ReadBasic')).toBeInTheDocument();
    expect(screen.getByText(/Teams for Education assignments disabled/)).toBeInTheDocument();
  });

  it('enables Confirm & Save and calls onConfirm when report can proceed', async () => {
    const onConfirmMock = vi.fn().mockResolvedValue(undefined);
    render(
      <PermissionsReviewModal
        isOpen={true}
        report={validReport}
        onConfirm={onConfirmMock}
        onCancel={() => {}}
        isSaving={false}
      />
    );

    const confirmBtn = screen.getByRole('button', { name: /Confirm & Save/i });
    expect(confirmBtn).not.toBeDisabled();

    fireEvent.click(confirmBtn);
    expect(onConfirmMock).toHaveBeenCalledTimes(1);
  });

  it('disables Confirm & Save when report cannot proceed due to validation failure', () => {
    const onConfirmMock = vi.fn();
    render(
      <PermissionsReviewModal
        isOpen={true}
        report={invalidReport}
        onConfirm={onConfirmMock}
        onCancel={() => {}}
        isSaving={false}
      />
    );

    expect(screen.getByText(/Cannot Proceed/i)).toBeInTheDocument();
    expect(screen.getByText(/Invalid, expired, or revoked GitHub/i)).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /Confirm & Save/i });
    expect(confirmBtn).toBeDisabled();
    fireEvent.click(confirmBtn);
    expect(onConfirmMock).not.toHaveBeenCalled();
  });

  it('calls onCancel when Back / Edit button is clicked', () => {
    const onCancelMock = vi.fn();
    render(
      <PermissionsReviewModal
        isOpen={true}
        report={validReport}
        onConfirm={async () => {}}
        onCancel={onCancelMock}
        isSaving={false}
      />
    );

    const backBtn = screen.getByRole('button', { name: /Back \/ Edit/i });
    fireEvent.click(backBtn);
    expect(onCancelMock).toHaveBeenCalledTimes(1);
  });
});

