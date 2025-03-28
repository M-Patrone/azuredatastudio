/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { IssueReporterModel } from 'vs/code/electron-sandbox/issue/issueReporterModel';
import { normalizeGitHubUrl } from 'vs/platform/issue/common/issueReporterUtil';
import { IssueType } from 'vs/platform/issue/common/issue';

suite('IssueReporter', () => {

	test('sets defaults to include all data', () => {
		const issueReporterModel = new IssueReporterModel();
		assert.deepStrictEqual(issueReporterModel.getData(), {
			allExtensions: [],
			includeSystemInfo: true,
			includeWorkspaceInfo: true,
			includeProcessInfo: true,
			includeExtensions: true,
			includeExperiments: true,
			issueType: 0
		});
	});

	test('serializes model skeleton when no data is provided', () => {	// {{SQL CARBON EDIT}} modify test for ads
		const issueReporterModel = new IssueReporterModel({});
		assert.strictEqual(issueReporterModel.serialize(),
			`
Issue Type: <b>Bug</b>

undefined

Azure Data Studio version: undefined
OS version: undefined
Restricted Mode: No

Extensions: none
<!-- generated by issue reporter -->`);
	});

	test('serializes GPU information when data is provided', () => { // {{SQL CARBON EDIT}} modify test for ads
		const issueReporterModel = new IssueReporterModel({
			issueType: 0,
			systemInfo: {
				os: 'Darwin',
				cpus: 'Intel(R) Core(TM) i7-7700HQ CPU @ 2.80GHz (8 x 2800)',
				memory: '16.00GB',
				vmHint: '0%',
				processArgs: '',
				screenReader: 'no',
				remoteData: [],
				gpuStatus: {
					'2d_canvas': 'enabled',
					'checker_imaging': 'disabled_off'
				}
			}
		});
		assert.strictEqual(issueReporterModel.serialize(),
			`
Issue Type: <b>Bug</b>

undefined

Azure Data Studio version: undefined
OS version: undefined
Restricted Mode: No

<details>
<summary>System Info</summary>

|Item|Value|
|---|---|
|CPUs|Intel(R) Core(TM) i7-7700HQ CPU @ 2.80GHz (8 x 2800)|
|GPU Status|2d_canvas: enabled<br>checker_imaging: disabled_off|
|Load (avg)|undefined|
|Memory (System)|16.00GB|
|Process Argv||
|Screen Reader|no|
|VM|0%|
</details>Extensions: none
<!-- generated by issue reporter -->`);
	});

	test.skip('serializes experiment info when data is provided', () => { // {{SQL CARBON EDIT}} skip test
		const issueReporterModel = new IssueReporterModel({
			issueType: 0,
			systemInfo: {
				os: 'Darwin',
				cpus: 'Intel(R) Core(TM) i7-7700HQ CPU @ 2.80GHz (8 x 2800)',
				memory: '16.00GB',
				vmHint: '0%',
				processArgs: '',
				screenReader: 'no',
				remoteData: [],
				gpuStatus: {
					'2d_canvas': 'enabled',
					'checker_imaging': 'disabled_off'
				}
			},
			experimentInfo: 'vsliv695:30137379\nvsins829:30139715'
		});
		assert.strictEqual(issueReporterModel.serialize(),
			`
Issue Type: <b>Bug</b>

undefined

VS Code version: undefined
OS version: undefined
Restricted Mode: No

<details>
<summary>System Info</summary>

|Item|Value|
|---|---|
|CPUs|Intel(R) Core(TM) i7-7700HQ CPU @ 2.80GHz (8 x 2800)|
|GPU Status|2d_canvas: enabled<br>checker_imaging: disabled_off|
|Load (avg)|undefined|
|Memory (System)|16.00GB|
|Process Argv||
|Screen Reader|no|
|VM|0%|
</details>Extensions: none<details>
<summary>A/B Experiments</summary>

\`\`\`
vsliv695:30137379
vsins829:30139715
\`\`\`

</details>

<!-- generated by issue reporter -->`);
	});

	test.skip('serializes Linux environment information when data is provided', () => { // {{SQL CARBON EDIT}} skip test
		const issueReporterModel = new IssueReporterModel({
			issueType: 0,
			systemInfo: {
				os: 'Darwin',
				cpus: 'Intel(R) Core(TM) i7-7700HQ CPU @ 2.80GHz (8 x 2800)',
				memory: '16.00GB',
				vmHint: '0%',
				processArgs: '',
				screenReader: 'no',
				remoteData: [],
				gpuStatus: {},
				linuxEnv: {
					desktopSession: 'ubuntu',
					xdgCurrentDesktop: 'ubuntu',
					xdgSessionDesktop: 'ubuntu:GNOME',
					xdgSessionType: 'x11'
				}
			}
		});
		assert.strictEqual(issueReporterModel.serialize(),
			`
Issue Type: <b>Bug</b>

undefined

VS Code version: undefined
OS version: undefined
Restricted Mode: No

<details>
<summary>System Info</summary>

|Item|Value|
|---|---|
|CPUs|Intel(R) Core(TM) i7-7700HQ CPU @ 2.80GHz (8 x 2800)|
|GPU Status||
|Load (avg)|undefined|
|Memory (System)|16.00GB|
|Process Argv||
|Screen Reader|no|
|VM|0%|
|DESKTOP_SESSION|ubuntu|
|XDG_CURRENT_DESKTOP|ubuntu|
|XDG_SESSION_DESKTOP|ubuntu:GNOME|
|XDG_SESSION_TYPE|x11|
</details>Extensions: none
<!-- generated by issue reporter -->`);
	});

	test.skip('serializes remote information when data is provided', () => {  // {{SQL CARBON EDIT}} skip test
		const issueReporterModel = new IssueReporterModel({
			issueType: 0,
			systemInfo: {
				os: 'Darwin',
				cpus: 'Intel(R) Core(TM) i7-7700HQ CPU @ 2.80GHz (8 x 2800)',
				memory: '16.00GB',
				vmHint: '0%',
				processArgs: '',
				screenReader: 'no',
				gpuStatus: {
					'2d_canvas': 'enabled',
					'checker_imaging': 'disabled_off'
				},
				remoteData: [
					{
						hostName: 'SSH: Pineapple',
						machineInfo: {
							os: 'Linux x64 4.18.0',
							cpus: 'Intel(R) Xeon(R) CPU E5-2673 v4 @ 2.30GHz (2 x 2294)',
							memory: '8GB',
							vmHint: '100%'
						}
					}
				]
			}
		});
		assert.strictEqual(issueReporterModel.serialize(),
			`
Issue Type: <b>Bug</b>

undefined

VS Code version: undefined
OS version: undefined
Restricted Mode: No
Remote OS version: Linux x64 4.18.0

<details>
<summary>System Info</summary>

|Item|Value|
|---|---|
|CPUs|Intel(R) Core(TM) i7-7700HQ CPU @ 2.80GHz (8 x 2800)|
|GPU Status|2d_canvas: enabled<br>checker_imaging: disabled_off|
|Load (avg)|undefined|
|Memory (System)|16.00GB|
|Process Argv||
|Screen Reader|no|
|VM|0%|

|Item|Value|
|---|---|
|Remote|SSH: Pineapple|
|OS|Linux x64 4.18.0|
|CPUs|Intel(R) Xeon(R) CPU E5-2673 v4 @ 2.30GHz (2 x 2294)|
|Memory (System)|8GB|
|VM|100%|
</details>Extensions: none
<!-- generated by issue reporter -->`);
	});

	test.skip('escapes backslashes in processArgs', () => {
		const issueReporterModel = new IssueReporterModel({
			issueType: 0,
			systemInfo: {
				os: 'Darwin',
				cpus: 'Intel(R) Core(TM) i7-7700HQ CPU @ 2.80GHz (8 x 2800)',
				memory: '16.00GB',
				vmHint: '0%',
				processArgs: '\\\\HOST\\path',
				screenReader: 'no',
				remoteData: [],
				gpuStatus: {}
			}
		});
		assert.strictEqual(issueReporterModel.serialize(),
			`
Issue Type: <b>Bug</b>

undefined

VS Code version: undefined
OS version: undefined
Restricted Mode: No

<details>
<summary>System Info</summary>

|Item|Value|
|---|---|
|CPUs|Intel(R) Core(TM) i7-7700HQ CPU @ 2.80GHz (8 x 2800)|
|GPU Status||
|Load (avg)|undefined|
|Memory (System)|16.00GB|
|Process Argv|\\\\\\\\HOST\\\\path|
|Screen Reader|no|
|VM|0%|
</details>Extensions: none
<!-- generated by issue reporter -->`);
	});

	test('should normalize GitHub urls', () => {
		[
			'https://github.com/repo',
			'https://github.com/repo/',
			'https://github.com/repo.git',
			'https://github.com/repo/issues',
			'https://github.com/repo/issues/',
			'https://github.com/repo/issues/new',
			'https://github.com/repo/issues/new/'
		].forEach(url => {
			assert.strictEqual('https://github.com/repo', normalizeGitHubUrl(url));
		});
	});

	test('should have support for filing on extensions for bugs, performance issues, and feature requests', () => {
		[
			IssueType.Bug,
			IssueType.FeatureRequest,
			IssueType.PerformanceIssue
		].forEach(type => {
			const issueReporterModel = new IssueReporterModel({
				issueType: type,
				fileOnExtension: true
			});

			assert.strictEqual(issueReporterModel.fileOnExtension(), true);
		});
	});
});
