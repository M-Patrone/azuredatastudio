/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as az from 'azdata';
import * as azExt from 'az-ext';
import * as loc from '../../../localizedConstants';
import { IconPathHelper, cssStyles, iconSize } from '../../../constants';
import { DashboardPage } from '../../components/dashboardPage';
import { ControllerModel } from '../../../models/controllerModel';
import { PostgresModel } from '../../../models/postgresModel';
import { promptAndConfirmPassword, promptForInstanceDeletion } from '../../../common/utils';
import { ResourceType } from 'arc';

export type PodStatusModel = {
	podName: az.Component,
	type: string,
	status: string
};

export class PostgresOverviewPage extends DashboardPage {

	private propertiesLoading!: az.LoadingComponent;
	private serverGroupNodesLoading!: az.LoadingComponent;
	private kibanaLoading!: az.LoadingComponent;
	private grafanaLoading!: az.LoadingComponent;

	private properties!: az.PropertiesContainerComponent;
	private kibanaLink!: az.HyperlinkComponent;
	private grafanaLink!: az.HyperlinkComponent;
	private deleteButton!: az.ButtonComponent;

	private podStatusTable!: az.DeclarativeTableComponent;
	private podStatusData: PodStatusModel[] = [];

	private readonly _azApi: azExt.IExtension;

	constructor(modelView: az.ModelView, dashboard: az.window.ModelViewDashboard, private _controllerModel: ControllerModel, private _postgresModel: PostgresModel) {
		super(modelView, dashboard);
		this._azApi = vscode.extensions.getExtension(azExt.extension.name)?.exports;

		this.disposables.push(
			this._controllerModel.onRegistrationsUpdated(() => this.eventuallyRunOnInitialized(() => this.handleRegistrationsUpdated())),
			this._postgresModel.onConfigUpdated(() => this.eventuallyRunOnInitialized(() => this.handleConfigUpdated())));
	}

	protected get title(): string {
		return loc.overview;
	}

	protected get id(): string {
		return 'postgres-overview';
	}

	protected get icon(): { dark: string; light: string; } {
		return IconPathHelper.postgres;
	}

	protected get container(): az.Component {
		const root = this.modelView.modelBuilder.divContainer().component();
		const content = this.modelView.modelBuilder.divContainer().component();
		root.addItem(content, { CSSStyles: { 'margin': '10px 20px 0px 20px' } });

		// Properties
		this.properties = this.modelView.modelBuilder.propertiesContainer()
			.withProperties<az.PropertiesContainerComponentProperties>({
				propertyItems: this.getProperties()
			}).component();

		this.propertiesLoading = this.modelView.modelBuilder.loadingComponent()
			.withItem(this.properties)
			.withProperties<az.LoadingComponentProperties>({
				loading: !this._controllerModel.registrationsLastUpdated && !this._postgresModel.configLastUpdated
			}).component();

		content.addItem(this.propertiesLoading, { CSSStyles: cssStyles.text });

		// Service endpoints
		const titleCSS = { ...cssStyles.title, 'margin-block-start': '2em', 'margin-block-end': '0' };
		content.addItem(this.modelView.modelBuilder.text().withProperties<az.TextComponentProperties>({
			value: loc.serviceEndpoints,
			CSSStyles: titleCSS
		}).component());

		this.kibanaLink = this.modelView.modelBuilder.hyperlink().component();

		this.grafanaLink = this.modelView.modelBuilder.hyperlink().component();

		this.kibanaLoading = this.modelView.modelBuilder.loadingComponent()
			.withProperties<az.LoadingComponentProperties>(
				{ loading: !this._postgresModel?.configLastUpdated }
			)
			.component();

		this.grafanaLoading = this.modelView.modelBuilder.loadingComponent()
			.withProperties<az.LoadingComponentProperties>(
				{ loading: !this._postgresModel?.configLastUpdated }
			)
			.component();

		this.refreshDashboardLinks();

		this.kibanaLoading.component = this.kibanaLink;
		this.grafanaLoading.component = this.grafanaLink;

		const endpointsTable = this.modelView.modelBuilder.declarativeTable().withProperties<az.DeclarativeTableProperties>({
			width: '100%',
			columns: [
				{
					displayName: loc.name,
					valueType: az.DeclarativeDataType.string,
					isReadOnly: true,
					width: '20%',
					headerCssStyles: cssStyles.tableHeader,
					rowCssStyles: cssStyles.tableRow
				},
				{
					displayName: loc.endpoint,
					valueType: az.DeclarativeDataType.component,
					isReadOnly: true,
					width: '50%',
					headerCssStyles: cssStyles.tableHeader,
					rowCssStyles: {
						...cssStyles.tableRow,
						'overflow': 'hidden',
						'text-overflow': 'ellipsis',
						'white-space': 'nowrap',
						'max-width': '0'
					}
				},
				{
					displayName: loc.description,
					valueType: az.DeclarativeDataType.string,
					isReadOnly: true,
					width: '30%',
					headerCssStyles: cssStyles.tableHeader,
					rowCssStyles: cssStyles.tableRow
				}
			],
			data: [
				[loc.kibanaDashboard, this.kibanaLoading, loc.kibanaDashboardDescription],
				[loc.grafanaDashboard, this.grafanaLoading, loc.grafanaDashboardDescription]]
		}).component();
		content.addItem(endpointsTable);

		// Server Group Nodes
		content.addItem(this.modelView.modelBuilder.text().withProperties<az.TextComponentProperties>({
			value: loc.serverGroupNodes,
			CSSStyles: titleCSS
		}).component());

		this.podStatusTable = this.modelView.modelBuilder.declarativeTable().withProps({
			width: '100%',
			columns: [
				{
					displayName: loc.name,
					valueType: az.DeclarativeDataType.component,
					isReadOnly: true,
					width: '35%',
					headerCssStyles: cssStyles.tableHeader,
					rowCssStyles: {
						...cssStyles.tableRow,
						'overflow': 'hidden',
						'text-overflow': 'ellipsis',
						'white-space': 'nowrap',
						'max-width': '0'
					}
				},
				{
					displayName: loc.type,
					valueType: az.DeclarativeDataType.string,
					isReadOnly: true,
					width: '35%',
					headerCssStyles: cssStyles.tableHeader,
					rowCssStyles: cssStyles.tableRow
				},
				{
					displayName: loc.status,
					valueType: az.DeclarativeDataType.string,
					isReadOnly: true,
					width: '30%',
					headerCssStyles: cssStyles.tableHeader,
					rowCssStyles: cssStyles.tableRow
				}
			],
			data: [this.podStatusData.map(p => [p.podName, p.type, p.status])]
		}).component();



		this.serverGroupNodesLoading = this.modelView.modelBuilder.loadingComponent()
			.withItem(this.podStatusTable)
			.withProperties<az.LoadingComponentProperties>({
				loading: !this._postgresModel.configLastUpdated
			}).component();

		this.refreshServerNodes();

		content.addItem(this.serverGroupNodesLoading, { CSSStyles: cssStyles.text });

		this.initialized = true;
		return root;
	}

	protected get toolbarContainer(): az.ToolbarContainer {
		// Reset password
		const resetPasswordButton = this.modelView.modelBuilder.button().withProperties<az.ButtonProperties>({
			label: loc.resetPassword,
			iconPath: IconPathHelper.edit
		}).component();

		this.disposables.push(
			resetPasswordButton.onDidClick(async () => {
				resetPasswordButton.enabled = false;
				try {
					const password = await promptAndConfirmPassword(input => !input ? loc.enterANonEmptyPassword : '');
					if (password) {
						await this._azApi.az.postgres.arcserver.edit(
							this._postgresModel.info.name,
							{
								adminPassword: true,
								noWait: true
							},
							this._postgresModel.controllerModel.info.namespace,
							Object.assign({ 'AZDATA_PASSWORD': password }, this._controllerModel.azAdditionalEnvVars));
						vscode.window.showInformationMessage(loc.passwordReset);
					}
				} catch (error) {
					vscode.window.showErrorMessage(loc.passwordResetFailed(error));
				} finally {
					resetPasswordButton.enabled = true;
				}
			}));

		// Delete service
		this.deleteButton = this.modelView.modelBuilder.button().withProperties<az.ButtonProperties>({
			label: loc.deleteText,
			iconPath: IconPathHelper.delete
		}).component();

		this.disposables.push(
			this.deleteButton.onDidClick(async () => {
				this.deleteButton.enabled = false;
				try {
					if (await promptForInstanceDeletion(this._postgresModel.info.name)) {
						await vscode.window.withProgress(
							{
								location: vscode.ProgressLocation.Notification,
								title: loc.deletingInstance(this._postgresModel.info.name),
								cancellable: false
							},
							async (_progress, _token) => {
								return await this._azApi.az.postgres.arcserver.delete(this._postgresModel.info.name, this._postgresModel.controllerModel.info.namespace, this._controllerModel.azAdditionalEnvVars);
							}
						);
						await this._controllerModel.refreshTreeNode();
						vscode.window.showInformationMessage(loc.instanceDeleted(this._postgresModel.info.name));
						try {
							await this.dashboard.close();
						} catch (err) {
							// Failures closing the dashboard aren't something we need to show users
							console.log('Error closing Arc Postgres dashboard ', err);
						}

					}
				} catch (error) {
					vscode.window.showErrorMessage(loc.instanceDeletionFailed(this._postgresModel.info.name, error));
				} finally {
					this.deleteButton.enabled = true;
				}
			}));

		// Refresh
		const refreshButton = this.modelView.modelBuilder.button().withProperties<az.ButtonProperties>({
			label: loc.refresh,
			iconPath: IconPathHelper.refresh
		}).component();

		this.disposables.push(
			refreshButton.onDidClick(async () => {
				refreshButton.enabled = false;
				try {
					this.propertiesLoading!.loading = true;
					this.serverGroupNodesLoading!.loading = true;
					this.kibanaLoading!.loading = true;
					this.grafanaLoading!.loading = true;

					await Promise.all([
						this._postgresModel.refresh(),
						this._controllerModel.refresh()
					]);
				} catch (error) {
					vscode.window.showErrorMessage(loc.refreshFailed(error));
				}
				finally {
					refreshButton.enabled = true;
				}
			}));

		// Open in Azure portal
		const openInAzurePortalButton = this.modelView.modelBuilder.button().withProperties<az.ButtonProperties>({
			label: loc.openInAzurePortal,
			iconPath: IconPathHelper.openInTab
		}).component();

		this.disposables.push(
			openInAzurePortalButton.onDidClick(async () => {
				const azure = this._controllerModel.controllerConfig?.spec.settings.azure;
				if (azure) {
					vscode.env.openExternal(vscode.Uri.parse(
						`https://portal.azure.com/#resource/subscriptions/${azure.subscription}/resourceGroups/${azure.resourceGroup}/providers/Microsoft.AzureArcData/${ResourceType.postgresInstances}/${this._postgresModel.info.name}`));
				} else {
					vscode.window.showErrorMessage(loc.couldNotFindControllerRegistration);
				}
			}));

		return this.modelView.modelBuilder.toolbarContainer().withToolbarItems([
			{ component: resetPasswordButton },
			{ component: this.deleteButton },
			{ component: refreshButton, toolbarSeparatorAfter: true },
			{ component: openInAzurePortalButton }
		]).component();
	}

	private getProperties(): az.PropertiesContainerItem[] {
		const status = this._postgresModel.config?.status;
		const azure = this._controllerModel.controllerConfig?.spec.settings.azure;

		return [
			{ displayName: loc.resourceGroup, value: azure?.resourceGroup || '-' },
			{ displayName: loc.dataController, value: this._controllerModel.controllerConfig?.metadata.name || '-' },
			{ displayName: loc.region, value: azure?.location || '-' },
			{ displayName: loc.namespace, value: this._postgresModel.config?.metadata.namespace || '-' },
			{ displayName: loc.subscriptionId, value: azure?.subscription || '-' },
			{ displayName: loc.externalEndpoint, value: this._postgresModel.config?.status.primaryEndpoint || '-' },
			{ displayName: loc.status, value: status ? `${status.state} (${status.readyPods} ${loc.podsReady})` : '-' },
			{ displayName: loc.postgresAdminUsername, value: 'postgres' },
			{ displayName: loc.postgresVersion, value: this._postgresModel.engineVersion ?? '-' },
			{ displayName: loc.nodeConfiguration, value: this._postgresModel.scaleConfiguration || '-' }
		];
	}

	private getPodStatus(): PodStatusModel[] {
		let podModels: PodStatusModel[] = [];
		const podStatus = this._postgresModel.config?.status.podsStatus;

		podStatus?.forEach((p: { conditions: any[]; name: any; role: string; }) => {
			// If a condition of the pod has a status of False, pod is not Ready
			const status = p.conditions.find(c => c.status === 'False') ? loc.notReady : loc.ready;

			const podLabelContainer = this.modelView.modelBuilder.flexContainer().withProps({
				CSSStyles: { 'alignItems': 'center', 'height': '15px' }
			}).component();

			const imageComponent = this.modelView.modelBuilder.image().withProps({
				iconPath: IconPathHelper.postgres,
				width: iconSize,
				height: iconSize,
				iconHeight: '15px',
				iconWidth: '15px'
			}).component();

			let podLabel = this.modelView.modelBuilder.text().withProps({
				value: p.name,
			}).component();

			if (p.role.toUpperCase() === loc.worker.toUpperCase()) {
				podLabelContainer.addItem(imageComponent, { CSSStyles: { 'margin-left': '15px', 'margin-right': '0px' } });
				podLabelContainer.addItem(podLabel);
				let pod: PodStatusModel = {
					podName: podLabelContainer,
					type: loc.worker,
					status: status
				};
				podModels.push(pod);
			} else {
				podLabelContainer.addItem(imageComponent, { CSSStyles: { 'margin-right': '0px' } });
				podLabelContainer.addItem(podLabel);
				let pod: PodStatusModel = {
					podName: podLabelContainer,
					type: loc.coordinator,
					status: status
				};
				podModels.unshift(pod);
			}
		});

		return podModels;
	}

	private refreshDashboardLinks(): void {
		if (this._postgresModel.config) {
			const kibanaUrl = this._postgresModel.config.status.logSearchDashboard ?? '';
			this.kibanaLink.label = kibanaUrl;
			this.kibanaLink.url = kibanaUrl;
			this.kibanaLoading.loading = false;

			const grafanaUrl = this._postgresModel.config.status.metricsDashboard ?? '';
			this.grafanaLink.label = grafanaUrl;
			this.grafanaLink.url = grafanaUrl;
			this.grafanaLoading.loading = false;
		}
	}

	private refreshServerNodes(): void {
		if (this._postgresModel.config) {
			this.podStatusData = this.getPodStatus();
			this.podStatusTable.data = this.podStatusData.map(p => [p.podName, p.type, p.status]);
			this.serverGroupNodesLoading.loading = false;
		}
	}

	private handleRegistrationsUpdated() {
		this.properties!.propertyItems = this.getProperties();
		this.propertiesLoading!.loading = false;
	}

	private handleConfigUpdated() {
		this.properties!.propertyItems = this.getProperties();
		this.propertiesLoading!.loading = false;
		this.refreshDashboardLinks();
		this.refreshServerNodes();
	}
}
