import { describe, it, expect } from 'vitest';
import { extractLinkedIssueNumber, groupTasksWithLinkedPRs } from './githubLinking';
import { UnifiedTask } from '../types/task';

describe('githubLinking utilities', () => {
  it('extracts linked issue numbers from PR body and title keywords', () => {
    expect(extractLinkedIssueNumber('This PR closes #42 cleanly.', 'feat: cool feature')).toBe(42);
    expect(extractLinkedIssueNumber('Fixes #105 and some other stuff', 'fix: bug')).toBe(105);
    expect(extractLinkedIssueNumber('Resolves #999', '')).toBe(999);
    expect(extractLinkedIssueNumber('Closes org/widkanban#88', '', '', 'org/widkanban')).toBe(88);
    // Ignore mismatched repo context
    expect(extractLinkedIssueNumber('Closes other/repo#88', '', '', 'org/widkanban')).toBeNull();
  });

  it('falls back to extracting issue number from branch name', () => {
    expect(extractLinkedIssueNumber('', '', 'feature/issue-77-oauth')).toBe(77);
    expect(extractLinkedIssueNumber('', '', 'fix/123-crash')).toBe(123);
    expect(extractLinkedIssueNumber('', '', 'main')).toBeNull();
  });

  it('groups linked PR into parent issue and deduplicates PR card when grouping is enabled', () => {
    const tasks: UnifiedTask[] = [
      {
        id: 'gh_issue_1',
        title: 'Authentication token refresh issue',
        source: 'github',
        status: 'todo',
        url: 'https://github.com/org/widkanban/issues/50',
        updatedAt: '2026-10-20T00:00:00Z',
        sourceMeta: {
          repo: 'org/widkanban',
          issueNumber: 50,
          isPullRequest: false,
        },
      },
      {
        id: 'gh_pr_2',
        title: 'feat: add token refresh loopback (closes #50)',
        source: 'github',
        status: 'in_progress',
        url: 'https://github.com/org/widkanban/pull/51',
        updatedAt: '2026-10-20T00:00:00Z',
        description: 'Implements OAuth loopback. Closes #50.',
        sourceMeta: {
          repo: 'org/widkanban',
          issueNumber: 51,
          isPullRequest: true,
          branchInfo: {
            headRef: 'feat/token-refresh',
            baseRef: 'main',
            isDraft: false,
            isMerged: false,
            additions: 120,
            deletions: 15,
          },
        },
      },
    ];

    const grouped = groupTasksWithLinkedPRs(tasks, true);
    // PR card should be absorbed, leaving only 1 card
    expect(grouped).toHaveLength(1);
    expect(grouped[0].id).toBe('gh_issue_1');
    expect(grouped[0].sourceMeta?.linkedPR).toBeDefined();
    expect(grouped[0].sourceMeta?.linkedPR?.number).toBe(51);
    expect(grouped[0].sourceMeta?.linkedPR?.reviewStatus).toBe('review_requested');

    // When grouping is disabled, both cards remain
    const ungrouped = groupTasksWithLinkedPRs(tasks, false);
    expect(ungrouped).toHaveLength(2);
  });

  it('automatically sets issue status to done if linked PR is merged', () => {
    const tasks: UnifiedTask[] = [
      {
        id: 'gh_issue_1',
        title: 'Bug report',
        source: 'github',
        status: 'in_progress',
        url: '',
        updatedAt: '',
        sourceMeta: {
          repo: 'org/widkanban',
          issueNumber: 12,
          isPullRequest: false,
        },
      },
      {
        id: 'gh_pr_1',
        title: 'Fix bug (fixes #12)',
        source: 'github',
        status: 'done',
        url: '',
        updatedAt: '',
        sourceMeta: {
          repo: 'org/widkanban',
          issueNumber: 13,
          isPullRequest: true,
          branchInfo: {
            headRef: 'fix/12',
            baseRef: 'main',
            isMerged: true,
          },
        },
      },
    ];

    const grouped = groupTasksWithLinkedPRs(tasks, true);
    expect(grouped).toHaveLength(1);
    expect(grouped[0].status).toBe('done');
    expect(grouped[0].sourceMeta?.linkedPR?.reviewStatus).toBe('merged');
  });
});
