/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/base/common/event';
import { IDisposable } from 'vs/base/common/lifecycle';
import { URI } from 'vs/base/common/uri';
import { localize } from 'vs/nls';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';

export enum WorkspaceTrustScope {
	Local = 0,
	Remote = 1
}

export function workspaceTrustToString(trustState: boolean) {
	if (trustState) {
		return localize('trusted', "Trusted");
	} else {
		return localize('untrusted', "Restricted Mode");
	}
}

export interface WorkspaceTrustRequestButton {
	readonly label: string;
	readonly type: 'ContinueWithTrust' | 'ContinueWithoutTrust' | 'Manage' | 'Cancel'
}

export interface WorkspaceTrustRequestOptions {
	readonly buttons?: WorkspaceTrustRequestButton[];
	readonly message?: string;
}

export const IWorkspaceTrustManagementService = createDecorator<IWorkspaceTrustManagementService>('workspaceTrustManagementService');

export interface IWorkspaceTrustManagementService {
	readonly _serviceBrand: undefined;

	onDidChangeTrust: Event<boolean>;
	onDidChangeTrustedFolders: Event<void>;

	readonly workspaceTrustEnabled: boolean;
	readonly workspaceResolved: Promise<void>;
	readonly workspaceTrustInitialized: Promise<void>;
	acceptsOutOfWorkspaceFiles: boolean;

	isWorkpaceTrusted(): boolean;
	isWorkspaceTrustForced(): boolean;

	canSetParentFolderTrust(): boolean;
	setParentFolderTrust(trusted: boolean): Promise<void>;

	canSetWorkspaceTrust(): boolean;
	setWorkspaceTrust(trusted: boolean): Promise<void>;

	getUriTrustInfo(uri: URI): Promise<IWorkspaceTrustUriInfo>;
	setUrisTrust(uri: URI[], trusted: boolean): Promise<void>;

	getTrustedUris(): URI[];
	setTrustedUris(uris: URI[]): Promise<void>;

	addWorkspaceTrustTransitionParticipant(participant: IWorkspaceTrustTransitionParticipant): IDisposable;
}

export const enum WorkspaceTrustUriResponse {
	Open = 1,
	OpenInNewWindow = 2,
	Cancel = 3
}

export const IWorkspaceTrustRequestService = createDecorator<IWorkspaceTrustRequestService>('workspaceTrustRequestService');

export interface IWorkspaceTrustRequestService {
	readonly _serviceBrand: undefined;

	readonly onDidInitiateWorkspaceTrustRequest: Event<WorkspaceTrustRequestOptions | undefined>;

	requestOpenUris(uris: URI[]): Promise<WorkspaceTrustUriResponse>;
	cancelRequest(): void;
	completeRequest(trusted?: boolean): Promise<void>;
	requestWorkspaceTrust(options?: WorkspaceTrustRequestOptions): Promise<boolean | undefined>;
}

export interface IWorkspaceTrustTransitionParticipant {
	participate(trusted: boolean): Promise<void>;
}

export interface IWorkspaceTrustUriInfo {
	uri: URI,
	trusted: boolean
}

export interface IWorkspaceTrustInfo {
	uriTrustInfo: IWorkspaceTrustUriInfo[]
}
