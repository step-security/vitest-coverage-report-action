import * as core from "@actions/core";
import * as fs from "fs";
import * as github from "@actions/github";
import { RequestError } from "@octokit/request-error";
import axios, { isAxiosError } from "axios";
import { FileCoverageMode } from "./inputs/FileCoverageMode.js";
import { getPullChanges } from "./inputs/getPullChanges.js";
import { type Options, readOptions } from "./inputs/options.js";
import {
	parseVitestJsonFinal,
	parseVitestJsonSummary,
} from "./inputs/parseJsonReports.js";
import { createOctokit, type Octokit } from "./octokit.js";
import { generateCommitSHAUrl } from "./report/generateCommitSHAUrl.js";
import { generateFileCoverageHtml } from "./report/generateFileCoverageHtml.js";
import { generateHeadline } from "./report/generateHeadline.js";
import { generateSummaryTableHtml } from "./report/generateSummaryTableHtml.js";
import type { JsonSummary } from "./types/JsonSummary.js";
import { writeSummaryToCommit } from "./writeSummaryToComment.js";
import { writeSummaryToPR } from "./writeSummaryToPR.js";

type GitHubSummary = typeof core.summary;

async function validateSubscription(): Promise<void> {
  const eventPath = process.env.GITHUB_EVENT_PATH
  let repoPrivate: boolean | undefined

  if (eventPath && fs.existsSync(eventPath)) {
    const eventData = JSON.parse(fs.readFileSync(eventPath, 'utf8'))
    repoPrivate = eventData?.repository?.private
  }

  const upstream = 'davelosert/vitest-coverage-report-action'
  const action = process.env.GITHUB_ACTION_REPOSITORY
  const docsUrl =
    'https://docs.stepsecurity.io/actions/stepsecurity-maintained-actions'

  core.info('')
  core.info('\u001b[1;36mStepSecurity Maintained Action\u001b[0m')
  core.info(`Secure drop-in replacement for ${upstream}`)
  if (repoPrivate === false)
    core.info('\u001b[32m\u2713 Free for public repositories\u001b[0m')
  core.info(`\u001b[36mLearn more:\u001b[0m ${docsUrl}`)
  core.info('')

  if (repoPrivate === false) return

  const serverUrl = process.env.GITHUB_SERVER_URL || 'https://github.com'
  const body: Record<string, string> = {action: action || ''}
  if (serverUrl !== 'https://github.com') body.ghes_server = serverUrl
  try {
    await axios.post(
      `https://agent.api.stepsecurity.io/v1/github/${process.env.GITHUB_REPOSITORY}/actions/maintained-actions-subscription`,
      body,
      {timeout: 3000}
    )
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 403) {
      core.error(
        `\u001b[1;31mThis action requires a StepSecurity subscription for private repositories.\u001b[0m`
      )
      core.error(
        `\u001b[31mLearn how to enable a subscription: ${docsUrl}\u001b[0m`
      )
      process.exit(1)
    }
    core.info('Timeout or API not reachable. Continuing to next step.')
  }
}

const run = async () => {
	await validateSubscription();

	const octokit = createOctokit();

	const options = await readOptions(octokit);
	core.info(`Using options: ${JSON.stringify(options, null, 2)}`);

	const jsonSummary = await parseVitestJsonSummary(options.jsonSummaryPath);

	let jsonSummaryCompare: JsonSummary | undefined;
	if (options.jsonSummaryComparePath) {
		jsonSummaryCompare = await parseVitestJsonSummary(
			options.jsonSummaryComparePath,
		);
	}

	const summary = core.summary
		.addHeading(
			generateHeadline({
				workingDirectory: options.workingDirectory,
				name: options.name,
			}),
			2,
		)
		.addRaw(
			generateSummaryTableHtml(
				jsonSummary.total,
				options.thresholds,
				jsonSummaryCompare?.total,
				options.thresholdIcons,
				options.comparisonDecimalPlaces,
			),
		);

	if (options.fileCoverageMode !== FileCoverageMode.None) {
		const pullChanges = await getPullChanges({
			fileCoverageMode: options.fileCoverageMode,
			prNumber: options.prNumber,
			octokit,
		});

		const jsonFinal = await parseVitestJsonFinal(options.jsonFinalPath);
		const fileTable = generateFileCoverageHtml({
			jsonSummary,
			jsonSummaryCompare,
			jsonFinal,
			fileCoverageMode: options.fileCoverageMode,
			pullChanges,
			commitSHA: options.commitSHA,
			workspacePath: options.fileCoverageRootPath,
			comparisonDecimalPlaces: options.comparisonDecimalPlaces,
			showUncoveredLines: options.showUncoveredLines,
		});

		if (options.fileCoverageExpanded) {
			summary.addRaw(
				`<details open><summary>File Coverage</summary>${fileTable}</details>\n`,
			);
		} else {
			summary.addDetails("File Coverage", fileTable);
		}
	}

	const commitSHAUrl = generateCommitSHAUrl(options.commitSHA);

	summary.addRaw(
		`<em>Generated in workflow <a href=${getWorkflowSummaryURL()}>#${github.context.runNumber}</a> for commit <a href="${commitSHAUrl}">${options.commitSHA.substring(0, 7)}</a> by the <a href="https://github.com/davelosert/vitest-coverage-report-action">Vitest Coverage Report Action</a></em>`,
	);

	if (options.commentOn.includes("pr")) {
		await commentOnPR(octokit, summary, options);
	}

	if (options.commentOn.includes("commit")) {
		await commentOnCommit(octokit, summary, options);
	}

	await summary.write();
};

function handleError(error: unknown, kind: string, permission: string) {
	if (error instanceof RequestError) {
		switch (error.status) {
			case 403:
			case 404:
				core.warning(
					`Couldn't write a comment to the ${kind}. Please make sure your job has the permission '${permission}: write'.\n` +
						`Original Error was: [${error.name}] - ${error.message}`,
				);
				return;
			case 422:
				core.warning(
					`Couldn't write a comment to the ${kind}. Summary was probably too large - See the step summary ${getWorkflowSummaryURL()} instead.\n` +
						`Original Error was: [${error.name}] - ${error.message}`,
				);
				return;
		}
	}
	throw error;
}

async function commentOnPR(
	octokit: Octokit,
	summary: GitHubSummary,
	options: Options,
) {
	try {
		await writeSummaryToPR({
			octokit,
			summary,
			markerPostfix: getMarkerPostfix({
				name: options.name,
				workingDirectory: options.workingDirectory,
			}),
			prNumber: options.prNumber,
		});
	} catch (error) {
		handleError(error, "pull request", "pull-requests");
	}
}

async function commentOnCommit(
	octokit: Octokit,
	summary: GitHubSummary,
	options: Options,
) {
	try {
		await writeSummaryToCommit({
			octokit,
			summary,
			commitSha: options.commitSHA,
		});
	} catch (error) {
		handleError(error, "commit", "contents");
	}
}

function getMarkerPostfix({
	name,
	workingDirectory,
}: {
	name: string;
	workingDirectory: string;
}) {
	if (name) return name;
	if (workingDirectory !== "./") return workingDirectory;
	return "root";
}

function getWorkflowSummaryURL() {
	const { owner, repo } = github.context.repo;
	const { runId } = github.context;
	return `${github.context.serverUrl}/${owner}/${repo}/actions/runs/${runId}`;
}

run()
	.then(() => {
		core.info("Report generated successfully.");
	})
	.catch((err) => {
		core.error(err);
	});
