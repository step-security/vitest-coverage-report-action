import * as core from "@actions/core";
import * as github from "@actions/github";
import { RequestError } from "@octokit/request-error";
import { FileCoverageMode } from "./inputs/FileCoverageMode.js";
import { getPullChanges } from "./inputs/getPullChanges.js";
import { readOptions } from "./inputs/options.js";
import {
	parseVitestJsonFinal,
	parseVitestJsonSummary,
} from "./inputs/parseJsonReports.js";
import { createOctokit } from "./octokit.js";
import { generateFileCoverageHtml } from "./report/generateFileCoverageHtml.js";
import { generateHeadline } from "./report/generateHeadline.js";
import { generateSummaryTableHtml } from "./report/generateSummaryTableHtml.js";
import type { JsonSummary } from "./types/JsonSummary.js";
import { writeSummaryToPR } from "./writeSummaryToPR.js";
import axios, {isAxiosError} from 'axios'

async function validateSubscription(): Promise<void> {
	const API_URL = `https://agent.api.stepsecurity.io/v1/github/${process.env.GITHUB_REPOSITORY}/actions/subscription`
  
	try {
	  await axios.get(API_URL, {timeout: 3000})
	} catch (error) {
	  if (isAxiosError(error) && error.response) {
		core.error(
		  'Subscription is not valid. Reach out to support@stepsecurity.io'
		)
		process.exit(1)
	  } else {
		core.info('Timeout or API not reachable. Continuing to next step.')
	  }
	}
  }

const run = async () => {
	await validateSubscription()
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

	const tableData = generateSummaryTableHtml(
		jsonSummary.total,
		options.thresholds,
		jsonSummaryCompare?.total,
	);

	const summary = core.summary
		.addHeading(
			generateHeadline({
				workingDirectory: options.workingDirectory,
				name: options.name,
			}),
			2,
		)
		.addRaw(tableData);

	if (options.fileCoverageMode !== FileCoverageMode.None) {
		const pullChanges = await getPullChanges({
			fileCoverageMode: options.fileCoverageMode,
			prNumber: options.prNumber,
		});

		const jsonFinal = await parseVitestJsonFinal(options.jsonFinalPath);
		const fileTable = generateFileCoverageHtml({
			jsonSummary,
			jsonFinal,
			fileCoverageMode: options.fileCoverageMode,
			pullChanges,
			commitSHA: options.commitSHA,
		});
		summary.addDetails("File Coverage", fileTable);
	}

	summary.addRaw(
		`<em>Generated in workflow <a href=${getWorkflowSummaryURL()}>#${github.context.runNumber}</a> for commit ${options.commitSHA.substring(0, 7)} by the <a href="https://github.com/davelosert/vitest-coverage-report-action">Vitest Coverage Report Action</a></em>
			`,
	);

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
		if (
			error instanceof RequestError &&
			(error.status === 404 || error.status === 403)
		) {
			core.warning(
				`Couldn't write a comment to the pull-request. Please make sure your job has the permission 'pull-request: write'.
							 Original Error was: [${error.name}] - ${error.message}
							`,
			);
		} else {
			// Rethrow to handle it in the catch block of the run()-call.
			throw error;
		}
	}

	await summary.write();
};

function getMarkerPostfix({
	name,
	workingDirectory,
}: { name: string; workingDirectory: string }) {
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
