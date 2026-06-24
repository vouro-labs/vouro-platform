import axios from 'axios';
import { ProofProvider, ProofInput, ProofValidationResult } from '@vouro/shared';

export class GitHubProofProvider implements ProofProvider {
  constructor(private githubToken?: string) {}

  async validate(input: ProofInput): Promise<ProofValidationResult> {
    if (input.type !== 'github' || !input.github) {
      return { valid: false, source: 'github', checkedAt: new Date().toISOString(), reasons: ['Invalid proof type'] };
    }

    const { repository, pullRequestNumber, expectedWallet } = input.github;

    try {
      const headers = this.githubToken ? { 'Authorization': `token ${this.githubToken}` } : {};

      // Fetch Pull Request details
      const prUrl = `https://api.github.com/repos/${repository}/pulls/${pullRequestNumber}`;
      const response = await axios.get(prUrl, { headers, timeout: 5000 });
      const prData = response.data;

      const reasons: string[] = [];
      let valid = true;

      // Rule checks:
      // 1. Must be merged
      if (!prData.merged) {
        valid = false;
        reasons.push('Pull Request is not merged yet');
      }

      // 2. Fetch commits to check author
      // In production, we'd verify if this github user matches expectedWallet via signed wallet challenge
      const commitsUrl = prData.commits_url;
      const commitsResponse = await axios.get(commitsUrl, { headers, timeout: 5000 });
      const commitsData = commitsResponse.data;

      return {
        valid,
        source: 'github',
        author: prData.user?.login || 'unknown',
        checkedAt: new Date().toISOString(),
        reasons,
        merged: prData.merged,
        commitCount: commitsData.length || 0,
        changedFiles: prData.changed_files || 0,
      };
    } catch (err: any) {
      console.error(`Failed to validate GitHub proof for repository ${repository} PR #${pullRequestNumber}:`, err);
      return {
        valid: false,
        source: 'github',
        checkedAt: new Date().toISOString(),
        reasons: [`GitHub API Error: ${err.message || 'Request failed'}`],
      };
    }
  }
}
