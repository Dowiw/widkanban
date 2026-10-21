import { UnifiedTask, LinkedPRInfo } from '../types/task';

/**
 * Extracts linked issue number from PR body, title, or branch name.
 * Supports:
 * - "closes #42", "fixes #42", "resolves #42", "close #42", "fix #42", "resolve #42"
 * - "owner/repo#42"
 * - branch names like "issue-42", "fix-42", "fix/42", "42-auth-rfc"
 */
export function extractLinkedIssueNumber(
  body?: string,
  title?: string,
  branchName?: string,
  repoContext?: string
): number | null {
  const combinedText = `${title || ''}\n${body || ''}`;

  // Match keyword patterns: closes #123, fixes #123, resolves org/repo#123
  const keywordRegex = /(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+(?:([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)#|#)(\d+)/gi;
  let match: RegExpExecArray | null;

  while ((match = keywordRegex.exec(combinedText)) !== null) {
    const matchedRepo = match[1];
    const issueNum = parseInt(match[2], 10);
    if (!isNaN(issueNum)) {
      if (!matchedRepo || !repoContext || matchedRepo.toLowerCase() === repoContext.toLowerCase()) {
        return issueNum;
      }
    }
  }

  // Branch name fallback: e.g. "issue-42", "fix/42", "42-feat"
  if (branchName) {
    const branchMatch = /(?:^|[/-])(?:issue|fix|feat|bug)?-?(\d+)(?:[/-]|$)/i.exec(branchName);
    if (branchMatch) {
      const issueNum = parseInt(branchMatch[1], 10);
      if (!isNaN(issueNum) && issueNum > 0) {
        return issueNum;
      }
    }
  }

  return null;
}

/**
 * Merges linked PRs into primary Issue cards when grouping is enabled.
 * - Identifies open PRs and their linked issue numbers.
 * - Attaches linkedPR metadata to parent issue card.
 * - Hides the separate PR card to avoid board clutter.
 * - If PR is merged, primary issue status reflects 'done'.
 */
export function groupTasksWithLinkedPRs(
  tasks: UnifiedTask[],
  groupEnabled: boolean = true
): UnifiedTask[] {
  if (!groupEnabled) {
    return tasks;
  }

  // Find all PRs and map them by repo -> issueNumber
  const prMap = new Map<string, UnifiedTask>();
  const absorbedPrIds = new Set<string>();

  for (const t of tasks) {
    if (t.source === 'github' && t.sourceMeta?.isPullRequest && t.sourceMeta.repo) {
      const repo = t.sourceMeta.repo.toLowerCase();
      const linkedIssueNum = extractLinkedIssueNumber(
        t.description,
        t.title,
        t.sourceMeta.branchInfo?.headRef,
        repo
      );

      if (linkedIssueNum) {
        const key = `${repo}#${linkedIssueNum}`;
        prMap.set(key, t);
      }
    }
  }

  const result: UnifiedTask[] = [];

  for (const task of tasks) {
    if (task.source === 'github' && !task.sourceMeta?.isPullRequest && task.sourceMeta?.repo && task.sourceMeta.issueNumber) {
      const key = `${task.sourceMeta.repo.toLowerCase()}#${task.sourceMeta.issueNumber}`;
      const matchingPr = prMap.get(key);

      if (matchingPr) {
        absorbedPrIds.add(matchingPr.id);

        const isMerged = Boolean(matchingPr.sourceMeta?.branchInfo?.isMerged);
        const isDraft = Boolean(matchingPr.sourceMeta?.branchInfo?.isDraft);
        const reviewStatus = isMerged
          ? 'merged'
          : isDraft
          ? 'draft'
          : 'review_requested';

        const linkedPR: LinkedPRInfo = {
          id: matchingPr.id,
          number: matchingPr.sourceMeta?.issueNumber || 0,
          title: matchingPr.title,
          url: matchingPr.url,
          branchInfo: matchingPr.sourceMeta?.branchInfo,
          reviewStatus,
          description: matchingPr.description,
          author: matchingPr.sourceMeta?.author,
          commentsCount: matchingPr.sourceMeta?.commentsCount,
        };

        result.push({
          ...task,
          status: isMerged && task.status !== 'done' ? 'done' : task.status,
          sourceMeta: {
            ...task.sourceMeta,
            linkedPR,
          },
        });
        continue;
      }
    }

    result.push(task);
  }

  // Filter out absorbed PR cards
  return result.filter((t) => !absorbedPrIds.has(t.id));
}
