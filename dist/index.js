"use strict";var Ft=Object.create;var E=Object.defineProperty;var Rt=Object.getOwnPropertyDescriptor;var Nt=Object.getOwnPropertyNames;var _t=Object.getPrototypeOf,qt=Object.prototype.hasOwnProperty;var It=(t,e,r,o)=>{if(e&&typeof e=="object"||typeof e=="function")for(let n of Nt(e))!qt.call(t,n)&&n!==r&&E(t,n,{get:()=>e[n],enumerable:!(o=Rt(e,n))||o.enumerable});return t};var s=(t,e,r)=>(r=t!=null?Ft(_t(t)):{},It(e||!t||!t.__esModule?E(r,"default",{value:t,enumerable:!0}):r,t));var l=s(require("@actions/core")),$=s(require("@actions/github")),L=require("@octokit/request-error");var V=s(require("@actions/core")),x=(o=>(o.All="all",o.Changes="changes",o.None="none",o))(x||{});function B(t){return Object.values(x).indexOf(t)===-1?(V.warning(`Not valid value "${t}" for summary mode, used "changes"`),"changes"):t}var p=s(require("@actions/core")),q=s(require("@actions/github")),G=require("@octokit/request-error");async function D({fileCoverageMode:t,prNumber:e,octokit:r}){if(t==="none")return[];if(!e)return[];try{let o=[];p.startGroup(`Fetching list of changed files for PR#${e} from Github API`);let n=r.paginate.iterator(r.rest.pulls.listFiles,{owner:q.context.repo.owner,repo:q.context.repo.repo,pull_number:e,per_page:100});for await(let i of n){p.info(`Received ${i.data.length} items`);for(let a of i.data)p.debug(`[${a.status}] ${a.filename}`),["added","modified"].includes(a.status)&&o.push(a.filename)}return o}catch(o){if(o instanceof G.RequestError&&(o.status===404||o.status===403))return p.warning(`Couldn't fetch changes of PR due to error:
[${o.name}]
${o.message}`),[];throw o}finally{p.endGroup()}}var P=s(require("node:path")),f=s(require("@actions/core"));var w=s(require("@actions/github"));function At(t){return t.eventName==="pull_request"||t.eventName==="pull_request_target"}function W(){return At(w.context)?w.context.payload.pull_request.head.sha:w.context.eventName==="workflow_run"?w.context.payload.workflow_run.head_commit.id:w.context.sha}var m=s(require("@actions/core")),u=s(require("@actions/github"));async function Q(t){let e=m.getInput("pr-number");if(e==="none"){m.info("prNumber set to 'none'. Comment creation will be skipped!");return}let r=Number(e);if(Number.isSafeInteger(r)&&r!==0)return m.info(`Received pull-request number: ${r}`),r;if(u.context.payload.pull_request)return m.info(`Found pull-request number in the action's "payload.pull_request" context: ${u.context.payload.pull_request.number}`),u.context.payload.pull_request.number;if(u.context.eventName==="push"&&e==="auto"){let o=u.context.payload.head_commit.id;m.info(`Trying to find a pull-request with a head commit matching the SHA found in the action's "payload.head_commit.id" context (${o}) from the GitHub API.`);let n=await Ht(t,o);return n||(m.info("Couldn't find PR using the /commits/:commit_sha/pulls endpoint. Trying by listing all PRs for current repository..."),n=await K(t,o)),n}if(u.context.eventName==="workflow_run"){if(u.context.payload.workflow_run.pull_requests.length>0)return m.info(`Found pull-request number in the action's "payload.workflow_run" context: ${u.context.payload.workflow_run.pull_requests[0].number}`),u.context.payload.workflow_run.pull_requests[0].number;let o=u.context.payload.workflow_run.head_sha;return m.info(`Trying to find a pull-request with a head commit matchin the SHA found in the action's "payload.workflow_run.head_sha" context (${o}) from the GitHub API.`),await K(t,u.context.payload.workflow_run.head_sha)}m.info("No pull-request number found. Comment creation will be skipped!")}async function K(t,e){m.startGroup("Querying REST API for pull-requests.");let r=t.paginate.iterator(t.rest.pulls.list,{owner:u.context.repo.owner,repo:u.context.repo.repo,per_page:30,sort:"updated",direction:"desc"});for await(let{data:o}of r){m.info(`Found ${o.length} pull-requests in this page.`);for(let n of o)if(m.debug(`Comparing: ${n.number} sha: ${n.head.sha} with expected: ${e}.`),n.head.sha===e)return n.number}m.endGroup(),m.info(`Could not find a pull-request for commit "${e}".`)}async function Ht(t,e){m.info("Trying to find pull-request using the /commits/:commit_sha/pulls endpoint...");let{data:r}=await t.rest.repos.listPullRequestsAssociatedWithCommit({owner:u.context.repo.owner,repo:u.context.repo.repo,commit_sha:e});if(r.length>0)return m.info(`Found ${r.length} pull-requests associated with commit "${e}".`),r[0].number}var S=require("node:fs"),I=s(require("node:path")),z=s(require("@actions/core")),X=require("common-tags"),Y=async(t,e)=>{let r=I.default.resolve(t,e);return await S.promises.access(r,S.constants.R_OK),r},Tt=["vitest.config.ts","vitest.config.mts","vitest.config.cts","vitest.config.js","vitest.config.mjs","vitest.config.cjs","vite.config.ts","vite.config.mts","vite.config.cts","vite.config.js","vite.config.mjs","vite.config.cjs","vitest.workspace.ts","vitest.workspace.mts","vitest.workspace.cts","vitest.workspace.js","vitest.workspace.mjs","vitest.workspace.cjs"],Z=async(t,e)=>{try{return e===""?await Promise.any(Tt.map(r=>Y(t,r))):await Y(t,e)}catch{let o=e?I.default.resolve(t,e):`any default location in "${t}"`;return z.warning(X.stripIndent`
          Failed to read vite config file at ${o}.
          Make sure you provide the vite-config-path option if you're using a non-default location or name of your config file.

          Will not include thresholds in the final report.
      `),null}};var tt=require("node:fs"),et=s(require("node:path")),rt=s(require("@actions/core")),Jt=/100"?\s*:\s*true/,Lt=/statements\s*:\s*(\d+)/,Mt=/lines:\s*(\d+)/,Ut=/branches\s*:\s*(\d+)/,jt=/functions\s*:\s*(\d+)/,ot=async t=>{try{let e=et.default.resolve(process.cwd(),t),r=await tt.promises.readFile(e,"utf8");if(r.match(Jt))return{lines:100,branches:100,functions:100,statements:100};let n=r.match(Mt),i=r.match(Ut),a=r.match(jt),c=r.match(Lt);return{lines:n?Number.parseInt(n[1]):void 0,branches:i?Number.parseInt(i[1]):void 0,functions:a?Number.parseInt(a[1]):void 0,statements:c?Number.parseInt(c[1]):void 0}}catch(e){return rt.warning(`Could not read vite config file for thresholds due to an error:
 ${e}`),{}}};var C=s(require("@actions/core"));function nt(){let t=C.getInput("comment-on");if(t==="none")return[];let e=t.split(",").map(n=>n.trim()),r=[],o=[];for(let n of e)n==="pr"||n==="commit"?r.push(n):o.push(n);return r.length===0?(C.warning('No valid options for comment-on found. Falling back to default value "pr".'),r=["pr"],r):(o.length>0&&C.warning(`Invalid options for comment-on: ${o.join(", ")}. Valid options are "pr" and "commit".`),r)}async function it(t){let e=f.getInput("working-directory"),r=f.getInput("file-coverage-mode"),o=B(r),n=P.resolve(e,f.getInput("json-summary-path")),i=P.resolve(e,f.getInput("json-final-path")),a=f.getInput("json-summary-compare-path"),c=null;a&&(c=P.resolve(e,a));let h=f.getInput("name"),v=nt(),g=await Z(e,f.getInput("vite-config-path")),b=g?await ot(g):{},M=W(),k;return v.includes("pr")&&(k=await Q(t)),{fileCoverageMode:o,jsonFinalPath:i,jsonSummaryPath:n,jsonSummaryComparePath:c,name:h,thresholds:b,workingDirectory:e,prNumber:k,commitSHA:M,commentOn:v}}var st=require("node:fs/promises"),at=s(require("node:path")),O=s(require("@actions/core")),A=require("common-tags"),mt=async t=>{let e=at.default.resolve(process.cwd(),t),r=await(0,st.readFile)(e);return JSON.parse(r.toString())},H=async t=>{try{return await mt(t)}catch(e){let r=e instanceof Error?e.stack:"";throw O.setFailed(A.stripIndent`
        Failed to parse the json-summary at path "${t}."
        Make sure to run vitest before this action and to include the "json-summary" reporter.

        Original Error:
        ${r}
    `),e}},ct=async t=>{try{return await mt(t)}catch(e){let r=e instanceof Error?e.stack:"";return O.warning(A.stripIndent`
      Failed to parse JSON Final at path "${t}".
      Line coverage will be empty. To include it, make sure to include the "json" reporter in your vitest execution.

      Original Error:
      ${r}
    `),{}}};var ut=s(require("@actions/core")),lt=s(require("@actions/github")),pt=()=>{let t=ut.getInput("github-token").trim();return lt.getOctokit(t)};var F=s(require("@actions/github")),gt=t=>[F.context.serverUrl,F.context.repo.owner,F.context.repo.repo,"commit",t].join("/");var T=s(require("node:path")),yt=require("common-tags");var R=s(require("@actions/github")),ft=(t,e)=>[R.context.serverUrl,R.context.repo.owner,R.context.repo.repo,"blob",e,t].join("/");var dt=({s:t,statementMap:e})=>Object.keys(e).reduce((n,i)=>{if(t[i]===0){let a=n.at(-1);if(a&&a.end===e[i].start.line-1)return a.end=e[i].end.line,n;n.push({start:e[i].start.line,end:e[i].end.line})}return n},[]);var bt=process.cwd(),wt=({jsonSummary:t,jsonFinal:e,fileCoverageMode:r,pullChanges:o,commitSHA:n})=>{let i=Object.keys(t).filter(g=>g!=="total"),a=g=>{let b=t[g],k=e[g]?dt(e[g]):[],U=T.relative(bt,g),j=ft(U,n);return`
      <tr>
        <td align="left"><a href="${j}">${U}</a></td>
        <td align="right">${b.statements.pct}%</td>
        <td align="right">${b.branches.pct}%</td>
        <td align="right">${b.functions.pct}%</td>
        <td align="right">${b.lines.pct}%</td>
        <td align="left">${Et(k,j)}</td>
      </tr>`},c="",[h,v]=Vt(i,o);return r==="changes"&&h.length===0?"No changed files found.":(h.length>0&&(c+=`
			${ht("Changed Files")} 
			${h.map(a).join("")}
		`),r==="all"&&v.length>0&&(c+=`
			${ht("Unchanged Files")}
			${v.map(a).join("")}
		`),yt.oneLine`
    <table>
      <thead>
        <tr>
         <th align="left">File</th>
         <th align="right">Stmts</th>
         <th align="right">% Branch</th>
         <th align="right">% Funcs</th>
         <th align="right">% Lines</th>
         <th align="left">Uncovered Lines</th>
        </tr>
      </thead>
      <tbody>
      ${c}
      </tbody>
    </table>
  `)};function ht(t){return`
		<tr>
			<td align="left" colspan="6"><b>${t}</b></td>
		</tr>
	`}function Et(t,e){return t.map(r=>{let o=`${r.start}`,n=`#L${r.start}`;return r.start!==r.end&&(o+=`-${r.end}`,n+=`-L${r.end}`),`<a href="${e}${n}" class="text-red">${o}</a>`}).join(", ")}function Vt(t,e){return t.reduce(([r,o],n)=>{let i=T.relative(bt,n);return e.includes(i)?r.push(n):o.push(n),[r,o]},[[],[]])}function vt(t){return t.name&&t.workingDirectory!=="./"?`Coverage Report for ${t.name} (${t.workingDirectory})`:t.name?`Coverage Report for ${t.name}`:t.workingDirectory!=="./"?`Coverage Report for ${t.workingDirectory}`:"Coverage Report"}var xt=require("common-tags");var d={red:"\u{1F534}",green:"\u{1F7E2}",blue:"\u{1F535}",increase:"\u2B06\uFE0F",decrease:"\u2B07\uFE0F",equal:"\u{1F7F0}",target:"\u{1F3AF}"};function Ct(t,e={},r=void 0){return xt.oneLine`
		<table>
			<thead>
				<tr>
				 <th align="center">Status</th>
				 <th align="left">Category</th>
				 <th align="right">Percentage</th>
				 <th align="right">Covered / Total</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					${N({reportNumbers:t.lines,category:"Lines",threshold:e.lines,reportCompareNumbers:r==null?void 0:r.lines})}
				</tr>
				<tr>
					${N({reportNumbers:t.statements,category:"Statements",threshold:e.statements,reportCompareNumbers:r==null?void 0:r.statements})}
				</tr>
				<tr>
					${N({reportNumbers:t.functions,category:"Functions",threshold:e.functions,reportCompareNumbers:r==null?void 0:r.functions})}
				</tr>
				<tr>
					${N({reportNumbers:t.branches,category:"Branches",threshold:e.branches,reportCompareNumbers:r==null?void 0:r.branches})}
				</tr>
			</tbody>
		</table>
	`}function N({reportNumbers:t,category:e,threshold:r,reportCompareNumbers:o}){let n=d.blue,i=`${t.pct}%`;if(r&&(i=`${i} (${d.target} ${r}%)`,n=t.pct>=r?d.green:d.red),o){let a=t.pct-o.pct,c=Bt(a);i=`${i}<br/>${c}`}return`
    <td align="center">${n}</td>
    <td align="left">${e}</td>
		<td align="right">${i}</td>
    <td align="right">${t.covered} / ${t.total}</td>
  `}function Bt(t){return t===0?`${d.equal} <em>\xB10%</em>`:t>0?`${d.increase} <em>+${t.toFixed(2)}%</em>`:`${d.decrease} <em>${t.toFixed(2)}%</em>`}var $t=s(require("@actions/core")),J=s(require("@actions/github")),kt=async({octokit:t,summary:e,commitSha:r})=>{if(!r){$t.info("No commit SHA found. Skipping comment creation.");return}let o=e.stringify();await t.rest.repos.createCommitComment({owner:J.context.repo.owner,repo:J.context.repo.repo,commit_sha:r,body:o})};var Pt=s(require("@actions/core")),y=s(require("@actions/github")),St=(t="root")=>`<!-- vitest-coverage-report-marker-${t} -->`,Ot=async({octokit:t,summary:e,markerPostfix:r,prNumber:o})=>{if(!o){Pt.info("No pull-request-number found. Skipping comment creation.");return}let n=`${e.stringify()}

${St(r)}`,i=await Gt(t,St(r),o);i?await t.rest.issues.updateComment({owner:y.context.repo.owner,repo:y.context.repo.repo,comment_id:i.id,body:n}):await t.rest.issues.createComment({owner:y.context.repo.owner,repo:y.context.repo.repo,issue_number:o,body:n})};async function Gt(t,e,r){let o=t.paginate.iterator(t.rest.issues.listComments,{owner:y.context.repo.owner,repo:y.context.repo.repo,issue_number:r});for await(let{data:n}of o){let i=n.find(a=>{var c;return(c=a.body)==null?void 0:c.includes(e)});if(i)return i}}var _=s(require("axios"));async function Dt(){let t=`https://agent.api.stepsecurity.io/v1/github/${process.env.GITHUB_REPOSITORY}/actions/subscription`;try{await _.default.get(t,{timeout:3e3})}catch(e){(0,_.isAxiosError)(e)&&e.response?(l.error("Subscription is not valid. Reach out to support@stepsecurity.io"),process.exit(1)):l.info("Timeout or API not reachable. Continuing to next step.")}}var Wt=async()=>{await Dt();let t=pt(),e=await it(t);l.info(`Using options: ${JSON.stringify(e,null,2)}`);let r=await H(e.jsonSummaryPath),o;e.jsonSummaryComparePath&&(o=await H(e.jsonSummaryComparePath));let n=l.summary.addHeading(vt({workingDirectory:e.workingDirectory,name:e.name}),2).addRaw(Ct(r.total,e.thresholds,o==null?void 0:o.total));if(e.fileCoverageMode!=="none"){let a=await D({fileCoverageMode:e.fileCoverageMode,prNumber:e.prNumber,octokit:t}),c=await ct(e.jsonFinalPath),h=wt({jsonSummary:r,jsonFinal:c,fileCoverageMode:e.fileCoverageMode,pullChanges:a,commitSHA:e.commitSHA});n.addDetails("File Coverage",h)}let i=gt(e.commitSHA);n.addRaw(`<em>Generated in workflow <a href=${zt()}>#${$.context.runNumber}</a> for commit <a href="${i}">${e.commitSHA.substring(0,7)}</a> by the <a href="https://github.com/davelosert/vitest-coverage-report-action">Vitest Coverage Report Action</a></em>`),e.commentOn.includes("pr")&&await Kt(t,n,e),e.commentOn.includes("commit")&&await Qt(t,n,e),await n.write()};async function Kt(t,e,r){try{await Ot({octokit:t,summary:e,markerPostfix:Yt({name:r.name,workingDirectory:r.workingDirectory}),prNumber:r.prNumber})}catch(o){if(o instanceof L.RequestError&&(o.status===404||o.status===403))l.warning(`Couldn't write a comment to the pull request. Please make sure your job has the permission 'pull-request: write'.
                 Original Error was: [${o.name}] - ${o.message}`);else throw o}}async function Qt(t,e,r){try{await kt({octokit:t,summary:e,commitSha:r.commitSHA})}catch(o){if(o instanceof L.RequestError&&(o.status===404||o.status===403))l.warning(`Couldn't write a comment to the commit. Please make sure your job has the permission 'contents: read'.
                 Original Error was: [${o.name}] - ${o.message}`);else throw o}}function Yt({name:t,workingDirectory:e}){return t||(e!=="./"?e:"root")}function zt(){let{owner:t,repo:e}=$.context.repo,{runId:r}=$.context;return`${$.context.serverUrl}/${t}/${e}/actions/runs/${r}`}Wt().then(()=>{l.info("Report generated successfully.")}).catch(t=>{l.error(t)});
//# sourceMappingURL=index.js.map
