/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Schemas } from 'vs/base/common/network';
import { IDisposable, Disposable, DisposableStore } from 'vs/base/common/lifecycle';
import { parse } from 'vs/base/common/marshalling';
import { isEqual } from 'vs/base/common/resources';
import { assertType } from 'vs/base/common/types';
import { URI } from 'vs/base/common/uri';
import { format } from 'vs/base/common/jsonFormatter';
import { applyEdits } from 'vs/base/common/jsonEdit';
import { ITextModel, ITextBufferFactory, DefaultEndOfLine, ITextBuffer } from 'vs/editor/common/model';
import { IModelService } from 'vs/editor/common/services/modelService';
import { IModeService } from 'vs/editor/common/services/modeService';
import { ITextModelContentProvider, ITextModelService } from 'vs/editor/common/services/resolverService';
import * as nls from 'vs/nls';
import { IConfigurationPropertySchema } from 'vs/platform/configuration/common/configurationRegistry'; // {{SQL CARBON EDIT}} Remove VS Notebook configurations
import { SyncDescriptor } from 'vs/platform/instantiation/common/descriptors';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { LifecyclePhase } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { Registry } from 'vs/platform/registry/common/platform';
import { EditorDescriptor, IEditorRegistry } from 'vs/workbench/browser/editor';
import { Extensions as WorkbenchExtensions, IWorkbenchContribution, IWorkbenchContributionsRegistry } from 'vs/workbench/common/contributions';
import { IEditorInput, IEditorInputSerializer, IEditorInputFactoryRegistry, IEditorInputWithOptions, EditorExtensions } from 'vs/workbench/common/editor';
import { EditorInput } from 'vs/workbench/common/editor/editorInput';
import { NotebookEditor } from 'vs/workbench/contrib/notebook/browser/notebookEditor';
import { NotebookEditorInput } from 'vs/workbench/contrib/notebook/common/notebookEditorInput';
import { INotebookService } from 'vs/workbench/contrib/notebook/common/notebookService';
import { NotebookService } from 'vs/workbench/contrib/notebook/browser/notebookServiceImpl';
import { CellKind, CellUri, UndoRedoPerCell, getCellUndoRedoComparisonKey, IResolvedNotebookEditorModel, NotebookDocumentBackupData, NotebookWorkingCopyTypeIdentifier } from 'vs/workbench/contrib/notebook/common/notebookCommon'; // {{SQL CARBON EDIT}} Remove VS Notebook configurations
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { IUndoRedoService } from 'vs/platform/undoRedo/common/undoRedo';
import { INotebookEditorModelResolverService } from 'vs/workbench/contrib/notebook/common/notebookEditorModelResolverService';
import { NotebookDiffEditorInput } from 'vs/workbench/contrib/notebook/browser/notebookDiffEditorInput';
import { NotebookTextDiffEditor } from 'vs/workbench/contrib/notebook/browser/diff/notebookTextDiffEditor';
import { INotebookEditorWorkerService } from 'vs/workbench/contrib/notebook/common/services/notebookWorkerService';
import { NotebookEditorWorkerServiceImpl } from 'vs/workbench/contrib/notebook/common/services/notebookWorkerServiceImpl';
import { INotebookCellStatusBarService } from 'vs/workbench/contrib/notebook/common/notebookCellStatusBarService';
import { NotebookCellStatusBarService } from 'vs/workbench/contrib/notebook/browser/notebookCellStatusBarServiceImpl';
import { INotebookEditorService } from 'vs/workbench/contrib/notebook/browser/notebookEditorService';
import { NotebookEditorWidgetService } from 'vs/workbench/contrib/notebook/browser/notebookEditorServiceImpl';
import { IJSONContributionRegistry, Extensions as JSONExtensions } from 'vs/platform/jsonschemas/common/jsonContributionRegistry';
import { IJSONSchema, IJSONSchemaMap } from 'vs/base/common/jsonSchema';
import { Event } from 'vs/base/common/event';
import { getFormatedMetadataJSON } from 'vs/workbench/contrib/notebook/browser/diff/diffElementViewModel';
import { NotebookModelResolverServiceImpl } from 'vs/workbench/contrib/notebook/common/notebookEditorModelResolverServiceImpl';
import { INotebookKernelService } from 'vs/workbench/contrib/notebook/common/notebookKernelService';
import { NotebookKernelService } from 'vs/workbench/contrib/notebook/browser/notebookKernelServiceImpl';
import { IWorkingCopyIdentifier } from 'vs/workbench/services/workingCopy/common/workingCopy';
import { EditorOverride } from 'vs/platform/editor/common/editor';
import { IExtensionService } from 'vs/workbench/services/extensions/common/extensions';
import { IWorkingCopyEditorService } from 'vs/workbench/services/workingCopy/common/workingCopyEditorService';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { ILabelService } from 'vs/platform/label/common/label';
import { IWorkingCopyBackupService } from 'vs/workbench/services/workingCopy/common/workingCopyBackup';
import { IEditorGroupsService } from 'vs/workbench/services/editor/common/editorGroupsService';
import { NotebookRendererMessagingService } from 'vs/workbench/contrib/notebook/browser/notebookRendererMessagingServiceImpl';
import { INotebookRendererMessagingService } from 'vs/workbench/contrib/notebook/common/notebookRendererMessagingService';

// Editor Contribution
import 'vs/workbench/contrib/notebook/browser/contrib/clipboard/notebookClipboard';
import 'vs/workbench/contrib/notebook/browser/contrib/coreActions';
import 'vs/workbench/contrib/notebook/browser/contrib/find/findController';
import 'vs/workbench/contrib/notebook/browser/contrib/fold/folding';
import 'vs/workbench/contrib/notebook/browser/contrib/format/formatting';
import 'vs/workbench/contrib/notebook/browser/contrib/gettingStarted/notebookGettingStarted';
import 'vs/workbench/contrib/notebook/browser/contrib/layout/layoutActions';
import 'vs/workbench/contrib/notebook/browser/contrib/marker/markerProvider';
import 'vs/workbench/contrib/notebook/browser/contrib/navigation/arrow';
import 'vs/workbench/contrib/notebook/browser/contrib/outline/notebookOutline';
import 'vs/workbench/contrib/notebook/browser/contrib/profile/notebookProfile';
import 'vs/workbench/contrib/notebook/browser/contrib/statusBar/statusBarProviders';
import 'vs/workbench/contrib/notebook/browser/contrib/statusBar/contributedStatusBarItemController';
import 'vs/workbench/contrib/notebook/browser/contrib/statusBar/executionStatusBarItemController';
import 'vs/workbench/contrib/notebook/browser/contrib/status/editorStatus';
import 'vs/workbench/contrib/notebook/browser/contrib/undoRedo/notebookUndoRedo';
import 'vs/workbench/contrib/notebook/browser/contrib/cellOperations/cellOperations';
import 'vs/workbench/contrib/notebook/browser/contrib/viewportCustomMarkdown/viewportCustomMarkdown';
import 'vs/workbench/contrib/notebook/browser/contrib/troubleshoot/layout';

// Diff Editor Contribution
import 'vs/workbench/contrib/notebook/browser/diff/notebookDiffActions';

// Output renderers registration
import 'vs/workbench/contrib/notebook/browser/view/output/transforms/richTransform';
import { editorOptionsRegistry } from 'vs/editor/common/config/editorOptions';

/*--------------------------------------------------------------------------------------------- */

Registry.as<IEditorRegistry>(EditorExtensions.Editors).registerEditor(
	EditorDescriptor.create(
		NotebookEditor,
		NotebookEditor.ID,
		'Notebook Editor'
	),
	[
		new SyncDescriptor(NotebookEditorInput)
	]
);

Registry.as<IEditorRegistry>(EditorExtensions.Editors).registerEditor(
	EditorDescriptor.create(
		NotebookTextDiffEditor,
		NotebookTextDiffEditor.ID,
		'Notebook Diff Editor'
	),
	[
		new SyncDescriptor(NotebookDiffEditorInput)
	]
);

class NotebookDiffEditorSerializer implements IEditorInputSerializer {
	canSerialize(): boolean {
		return true;
	}

	serialize(input: EditorInput): string {
		assertType(input instanceof NotebookDiffEditorInput);
		return JSON.stringify({
			resource: input.resource,
			originalResource: input.originalResource,
			name: input.name,
			originalName: input.originalName,
			textDiffName: input.textDiffName,
			viewType: input.viewType,
		});
	}

	deserialize(instantiationService: IInstantiationService, raw: string) {
		type Data = { resource: URI, originalResource: URI, name: string, originalName: string, viewType: string, textDiffName: string | undefined, group: number; };
		const data = <Data>parse(raw);
		if (!data) {
			return undefined;
		}
		const { resource, originalResource, name, originalName, textDiffName, viewType } = data;
		if (!data || !URI.isUri(resource) || !URI.isUri(originalResource) || typeof name !== 'string' || typeof originalName !== 'string' || typeof viewType !== 'string') {
			return undefined;
		}

		const input = NotebookDiffEditorInput.create(instantiationService, resource, name, originalResource, originalName,
			textDiffName || nls.localize('diffLeftRightLabel', "{0} ⟷ {1}", originalResource.toString(true), resource.toString(true)),
			viewType);
		return input;
	}

	static canResolveBackup(editorInput: IEditorInput, backupResource: URI): boolean {
		return false;
	}

}
class NotebookEditorSerializer implements IEditorInputSerializer {
	canSerialize(): boolean {
		return true;
	}
	serialize(input: EditorInput): string {
		assertType(input instanceof NotebookEditorInput);
		return JSON.stringify({
			resource: input.resource,
			name: input.getName(),
			viewType: input.viewType,
		});
	}
	deserialize(instantiationService: IInstantiationService, raw: string) {
		type Data = { resource: URI, viewType: string, group: number; };
		const data = <Data>parse(raw);
		if (!data) {
			return undefined;
		}
		const { resource, viewType } = data;
		if (!data || !URI.isUri(resource) || typeof viewType !== 'string') {
			return undefined;
		}

		const input = NotebookEditorInput.create(instantiationService, resource, viewType);
		return input;
	}
}

Registry.as<IEditorInputFactoryRegistry>(EditorExtensions.EditorInputFactories).registerEditorInputSerializer(
	NotebookEditorInput.ID,
	NotebookEditorSerializer
);

Registry.as<IEditorInputFactoryRegistry>(EditorExtensions.EditorInputFactories).registerEditorInputSerializer(
	NotebookDiffEditorInput.ID,
	NotebookDiffEditorSerializer
);

export class NotebookContribution extends Disposable implements IWorkbenchContribution {
	constructor(
		@IUndoRedoService undoRedoService: IUndoRedoService,
		@IConfigurationService configurationService: IConfigurationService,
	) {
		super();

		const undoRedoPerCell = configurationService.getValue<boolean>(UndoRedoPerCell);

		this._register(undoRedoService.registerUriComparisonKeyComputer(CellUri.scheme, {
			getComparisonKey: (uri: URI): string => {
				return getCellUndoRedoComparisonKey(uri, undoRedoPerCell);
			}
		}));
	}
}

class CellContentProvider implements ITextModelContentProvider {

	private readonly _registration: IDisposable;

	constructor(
		@ITextModelService textModelService: ITextModelService,
		@IModelService private readonly _modelService: IModelService,
		@IModeService private readonly _modeService: IModeService,
		@INotebookEditorModelResolverService private readonly _notebookModelResolverService: INotebookEditorModelResolverService,
	) {
		this._registration = textModelService.registerTextModelContentProvider(CellUri.scheme, this);
	}

	dispose(): void {
		this._registration.dispose();
	}

	async provideTextContent(resource: URI): Promise<ITextModel | null> {
		const existing = this._modelService.getModel(resource);
		if (existing) {
			return existing;
		}
		const data = CellUri.parse(resource);
		// const data = parseCellUri(resource);
		if (!data) {
			return null;
		}

		const ref = await this._notebookModelResolverService.resolve(data.notebook);
		let result: ITextModel | null = null;

		for (const cell of ref.object.notebook.cells) {
			if (cell.uri.toString() === resource.toString()) {
				const bufferFactory: ITextBufferFactory = {
					create: (defaultEOL) => {
						const newEOL = (defaultEOL === DefaultEndOfLine.CRLF ? '\r\n' : '\n');
						(cell.textBuffer as ITextBuffer).setEOL(newEOL);
						return { textBuffer: cell.textBuffer as ITextBuffer, disposable: Disposable.None };
					},
					getFirstLineText: (limit: number) => {
						return cell.textBuffer.getLineContent(1).substr(0, limit);
					}
				};
				const language = cell.cellKind === CellKind.Markup ? this._modeService.create('markdown') : (cell.language ? this._modeService.create(cell.language) : this._modeService.createByFilepathOrFirstLine(resource, cell.textBuffer.getLineContent(1)));
				result = this._modelService.createModel(
					bufferFactory,
					language,
					resource
				);
				break;
			}
		}

		if (result) {
			const once = Event.any(result.onWillDispose, ref.object.notebook.onWillDispose)(() => {
				once.dispose();
				ref.dispose();
			});
		}

		return result;
	}
}

class CellInfoContentProvider {
	private readonly _disposables: IDisposable[] = [];

	constructor(
		@ITextModelService textModelService: ITextModelService,
		@IModelService private readonly _modelService: IModelService,
		@IModeService private readonly _modeService: IModeService,
		@ILabelService private readonly _labelService: ILabelService,
		@INotebookEditorModelResolverService private readonly _notebookModelResolverService: INotebookEditorModelResolverService,
	) {
		this._disposables.push(textModelService.registerTextModelContentProvider(Schemas.vscodeNotebookCellMetadata, {
			provideTextContent: this.provideMetadataTextContent.bind(this)
		}));

		this._disposables.push(textModelService.registerTextModelContentProvider(Schemas.vscodeNotebookCellOutput, {
			provideTextContent: this.provideOutputTextContent.bind(this)
		}));

		this._disposables.push(this._labelService.registerFormatter({
			scheme: Schemas.vscodeNotebookCellMetadata,
			formatting: {
				label: '${path} (metadata)',
				separator: '/'
			}
		}));

		this._disposables.push(this._labelService.registerFormatter({
			scheme: Schemas.vscodeNotebookCellOutput,
			formatting: {
				label: '${path} (output)',
				separator: '/'
			}
		}));
	}

	dispose(): void {
		this._disposables.forEach(d => d.dispose());
	}

	async provideMetadataTextContent(resource: URI): Promise<ITextModel | null> {
		const existing = this._modelService.getModel(resource);
		if (existing) {
			return existing;
		}

		const data = CellUri.parseCellUri(resource, Schemas.vscodeNotebookCellMetadata);
		if (!data) {
			return null;
		}

		const ref = await this._notebookModelResolverService.resolve(data.notebook);
		let result: ITextModel | null = null;

		const mode = this._modeService.create('json');

		for (const cell of ref.object.notebook.cells) {
			if (cell.handle === data.handle) {
				const metadataSource = getFormatedMetadataJSON(ref.object.notebook, cell.metadata, cell.language);
				result = this._modelService.createModel(
					metadataSource,
					mode,
					resource
				);
				break;
			}
		}

		if (result) {
			const once = result.onWillDispose(() => {
				once.dispose();
				ref.dispose();
			});
		}

		return result;
	}

	async provideOutputTextContent(resource: URI): Promise<ITextModel | null> {
		const existing = this._modelService.getModel(resource);
		if (existing) {
			return existing;
		}

		const data = CellUri.parseCellUri(resource, Schemas.vscodeNotebookCellOutput);
		if (!data) {
			return null;
		}

		const ref = await this._notebookModelResolverService.resolve(data.notebook);
		let result: ITextModel | null = null;

		const mode = this._modeService.create('json');

		for (const cell of ref.object.notebook.cells) {
			if (cell.handle === data.handle) {
				const content = JSON.stringify(cell.outputs);
				const edits = format(content, undefined, {});
				const outputSource = applyEdits(content, edits);
				result = this._modelService.createModel(
					outputSource,
					mode,
					resource
				);
				break;
			}
		}

		if (result) {
			const once = result.onWillDispose(() => {
				once.dispose();
				ref.dispose();
			});
		}

		return result;
	}
}

class RegisterSchemasContribution extends Disposable implements IWorkbenchContribution {
	constructor() {
		super();
		this.registerMetadataSchemas();
	}

	private registerMetadataSchemas(): void {
		const jsonRegistry = Registry.as<IJSONContributionRegistry>(JSONExtensions.JSONContribution);
		const metadataSchema: IJSONSchema = {
			properties: {
				['language']: {
					type: 'string',
					description: 'The language for the cell'
				},
				['inputCollapsed']: {
					type: 'boolean',
					description: `Whether a code cell's editor is collapsed`
				},
				['outputCollapsed']: {
					type: 'boolean',
					description: `Whether a code cell's outputs are collapsed`
				}
			},
			// patternProperties: allSettings.patternProperties,
			additionalProperties: true,
			allowTrailingCommas: true,
			allowComments: true
		};

		jsonRegistry.registerSchema('vscode://schemas/notebook/cellmetadata', metadataSchema);
	}
}

class NotebookEditorManager implements IWorkbenchContribution {

	private readonly _disposables = new DisposableStore();

	constructor(
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
		@IEditorService private readonly _editorService: IEditorService,
		@INotebookEditorModelResolverService private readonly _notebookEditorModelService: INotebookEditorModelResolverService,
		@INotebookService notebookService: INotebookService,
		@IEditorGroupsService editorGroups: IEditorGroupsService,
	) {

		// OPEN notebook editor for models that have turned dirty without being visible in an editor
		type E = IResolvedNotebookEditorModel;
		this._disposables.add(Event.debounce<E, E[]>(
			this._notebookEditorModelService.onDidChangeDirty,
			(last, current) => !last ? [current] : [...last, current],
			100
		)(this._openMissingDirtyNotebookEditors, this));

		// CLOSE notebook editor for models that have no more serializer
		this._disposables.add(notebookService.onWillRemoveViewType(e => {
			for (const group of editorGroups.groups) {
				const staleInputs = group.editors.filter(input => input instanceof NotebookEditorInput && input.viewType === e);
				group.closeEditors(staleInputs);
			}
		}));
	}

	dispose(): void {
		this._disposables.dispose();
	}

	private _openMissingDirtyNotebookEditors(models: IResolvedNotebookEditorModel[]): void {
		const result: IEditorInputWithOptions[] = [];
		for (let model of models) {
			if (model.isDirty() && !this._editorService.isOpened({ resource: model.resource, typeId: NotebookEditorInput.ID })) {
				result.push({
					editor: NotebookEditorInput.create(this._instantiationService, model.resource, model.viewType),
					options: { inactive: true, preserveFocus: true, pinned: true, override: EditorOverride.DISABLED }
				});
			}
		}
		if (result.length > 0) {
			this._editorService.openEditors(result);
		}
	}
}

class SimpleNotebookWorkingCopyEditorHandler extends Disposable implements IWorkbenchContribution {

	constructor(
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
		@IWorkingCopyEditorService private readonly _workingCopyEditorService: IWorkingCopyEditorService,
		@IExtensionService private readonly _extensionService: IExtensionService
	) {
		super();

		this._installHandler();
	}

	private async _installHandler(): Promise<void> {
		await this._extensionService.whenInstalledExtensionsRegistered();

		this._register(this._workingCopyEditorService.registerHandler({
			handles: workingCopy => typeof this._getViewType(workingCopy) === 'string',
			isOpen: (workingCopy, editor) => editor instanceof NotebookEditorInput && editor.viewType === this._getViewType(workingCopy),
			createEditor: workingCopy => NotebookEditorInput.create(this._instantiationService, workingCopy.resource, this._getViewType(workingCopy)!)
		}));
	}

	private _getViewType(workingCopy: IWorkingCopyIdentifier): string | undefined {
		return NotebookWorkingCopyTypeIdentifier.parse(workingCopy.typeId);
	}
}

class ComplexNotebookWorkingCopyEditorHandler extends Disposable implements IWorkbenchContribution {

	constructor(
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
		@IWorkingCopyEditorService private readonly _workingCopyEditorService: IWorkingCopyEditorService,
		@IExtensionService private readonly _extensionService: IExtensionService,
		@IWorkingCopyBackupService private readonly _workingCopyBackupService: IWorkingCopyBackupService
	) {
		super();

		this._installHandler();
	}

	private async _installHandler(): Promise<void> {
		await this._extensionService.whenInstalledExtensionsRegistered();

		this._register(this._workingCopyEditorService.registerHandler({
			handles: workingCopy => workingCopy.resource.scheme === Schemas.vscodeNotebook,
			isOpen: (workingCopy, editor) => editor instanceof NotebookEditorInput && isEqual(URI.from({ scheme: Schemas.vscodeNotebook, path: editor.resource.toString() }), workingCopy.resource),
			createEditor: async workingCopy => {
				// TODO this is really bad and should adopt the `typeId`
				// for backups instead of storing that information in the
				// backup.
				// But since complex notebooks are deprecated, not worth
				// pushing for it and should eventually delete this code
				// entirely.
				const backup = await this._workingCopyBackupService.resolve<NotebookDocumentBackupData>(workingCopy);
				if (!backup?.meta) {
					throw new Error(`No backup found for Notebook editor: ${workingCopy.resource}`);
				}

				return NotebookEditorInput.create(this._instantiationService, workingCopy.resource, backup.meta.viewType, { startDirty: true });
			}
		}));
	}
}

const workbenchContributionsRegistry = Registry.as<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench);
workbenchContributionsRegistry.registerWorkbenchContribution(NotebookContribution, LifecyclePhase.Starting);
workbenchContributionsRegistry.registerWorkbenchContribution(CellContentProvider, LifecyclePhase.Starting);
workbenchContributionsRegistry.registerWorkbenchContribution(CellInfoContentProvider, LifecyclePhase.Starting);
workbenchContributionsRegistry.registerWorkbenchContribution(RegisterSchemasContribution, LifecyclePhase.Starting);
workbenchContributionsRegistry.registerWorkbenchContribution(NotebookEditorManager, LifecyclePhase.Ready);
workbenchContributionsRegistry.registerWorkbenchContribution(SimpleNotebookWorkingCopyEditorHandler, LifecyclePhase.Ready);
workbenchContributionsRegistry.registerWorkbenchContribution(ComplexNotebookWorkingCopyEditorHandler, LifecyclePhase.Ready);

registerSingleton(INotebookService, NotebookService);
registerSingleton(INotebookEditorWorkerService, NotebookEditorWorkerServiceImpl);
registerSingleton(INotebookEditorModelResolverService, NotebookModelResolverServiceImpl, true);
registerSingleton(INotebookCellStatusBarService, NotebookCellStatusBarService, true);
registerSingleton(INotebookEditorService, NotebookEditorWidgetService, true);
registerSingleton(INotebookKernelService, NotebookKernelService, true);
registerSingleton(INotebookRendererMessagingService, NotebookRendererMessagingService, true);

const schemas: IJSONSchemaMap = {};
function isConfigurationPropertySchema(x: IConfigurationPropertySchema | { [path: string]: IConfigurationPropertySchema; }): x is IConfigurationPropertySchema {
	return (typeof x.type !== 'undefined' || typeof x.anyOf !== 'undefined');
}
for (const editorOption of editorOptionsRegistry) {
	const schema = editorOption.schema;
	if (schema) {
		if (isConfigurationPropertySchema(schema)) {
			schemas[`editor.${editorOption.name}`] = schema;
		} else {
			for (let key in schema) {
				if (Object.hasOwnProperty.call(schema, key)) {
					schemas[key] = schema[key];
				}
			}
		}
	}
}

/* {{SQL CARBON EDIT}} Remove VS Notebook configurations
const editorOptionsCustomizationSchema: IConfigurationPropertySchema = {
	description: nls.localize('notebook.editorOptions.experimentalCustomization', 'Settings for code editors used in notebooks. This can be used to customize most editor.* settings.'),
	default: {},
	allOf: [
		{
			properties: schemas,
		}
		// , {
		// 	patternProperties: {
		// 		'^\\[.*\\]$': {
		// 			type: 'object',
		// 			default: {},
		// 			properties: schemas
		// 		}
		// 	}
		// }
	]
};

const configurationRegistry = Registry.as<IConfigurationRegistry>(Extensions.Configuration);
configurationRegistry.registerConfiguration({
	id: 'notebook',
	order: 100,
	title: nls.localize('notebookConfigurationTitle', "Notebook"),
	type: 'object',
	properties: {
		[DisplayOrderKey]: {
			description: nls.localize('notebook.displayOrder.description', "Priority list for output mime types"),
			type: ['array'],
			items: {
				type: 'string'
			},
			default: []
		},
		[CellToolbarLocation]: {
			description: nls.localize('notebook.cellToolbarLocation.description', "Where the cell toolbar should be shown, or whether it should be hidden."),
			type: 'object',
			additionalProperties: {
				markdownDescription: nls.localize('notebook.cellToolbarLocation.viewType', "Configure the cell toolbar position for for specific file types"),
				type: 'string',
				enum: ['left', 'right', 'hidden']
			},
			default: {
				'default': 'right'
			},
			tags: ['notebookLayout']
		},
		[ShowCellStatusBar]: {
			description: nls.localize('notebook.showCellStatusbar.description', "Whether the cell status bar should be shown."),
			type: 'string',
			enum: ['hidden', 'visible', 'visibleAfterExecute'],
			enumDescriptions: [
				nls.localize('notebook.showCellStatusbar.hidden.description', "The cell status bar is always hidden."),
				nls.localize('notebook.showCellStatusbar.visible.description', "The cell status bar is always visible."),
				nls.localize('notebook.showCellStatusbar.visibleAfterExecute.description', "The cell status bar is hidden until the cell has executed. Then it becomes visible to show the execution status.")],
			default: 'visible',
			tags: ['notebookLayout']
		},
		[NotebookTextDiffEditorPreview]: {
			description: nls.localize('notebook.diff.enablePreview.description', "Whether to use the enhanced text diff editor for notebook."),
			type: 'boolean',
			default: true
		},
		[ExperimentalUseMarkdownRenderer]: {
			description: nls.localize('notebook.experimental.useMarkdownRenderer.description', "Enable/disable using the new extensible markdown renderer."),
			type: 'boolean',
			default: true
		},
		[CellToolbarVisibility]: {
			markdownDescription: nls.localize('notebook.cellToolbarVisibility.description', "Whether the cell toolbar should appear on hover or click."),
			type: 'string',
			enum: ['hover', 'click'],
			default: 'click',
			tags: ['notebookLayout']
		},
		[UndoRedoPerCell]: {
			description: nls.localize('notebook.undoRedoPerCell.description', "Whether to use separate undo/redo stack for each cell."),
			type: 'boolean',
			default: false
		},
		[CompactView]: {
			description: nls.localize('notebook.compactView.description', "Control whether the notebook editor should be rendered in a compact form. "),
			type: 'boolean',
			default: true,
			tags: ['notebookLayout']
		},
		[FocusIndicator]: {
			description: nls.localize('notebook.focusIndicator.description', "Control whether to render the focus indicator as cell borders or a highlight bar on the left gutter"),
			type: 'string',
			enum: ['border', 'gutter'],
			default: 'gutter',
			tags: ['notebookLayout']
		},
		[InsertToolbarLocation]: {
			description: nls.localize('notebook.insertToolbarPosition.description', "Control where the insert cell actions should be rendered."),
			type: 'string',
			enum: ['betweenCells', 'notebookToolbar', 'both', 'hidden'],
			default: 'both',
			tags: ['notebookLayout']
		},
		[GlobalToolbar]: {
			description: nls.localize('notebook.globalToolbar.description', "Control whether to render a global toolbar inside the notebook editor."),
			type: 'boolean',
			default: true,
			tags: ['notebookLayout']
		},
		[ConsolidatedOutputButton]: {
			description: nls.localize('notebook.consolidatedOutputButton.description', "Control whether outputs action should be rendered in the output toolbar."),
			type: 'boolean',
			default: true,
			tags: ['notebookLayout']
		},
		[ShowFoldingControls]: {
			description: nls.localize('notebook.showFoldingControls.description', "Controls when the folding controls are shown."),
			type: 'string',
			enum: ['always', 'mouseover'],
			default: 'mouseover',
			tags: ['notebookLayout']
		},
		[DragAndDropEnabled]: {
			description: nls.localize('notebook.dragAndDrop.description', "Control whether the notebook editor should allow moving cells through drag and drop."),
			type: 'boolean',
			default: true,
			tags: ['notebookLayout']
		},
		[ConsolidatedRunButton]: {
			description: nls.localize('notebook.consolidatedRunButton.description', "Control whether extra actions are shown in a dropdown next to the run button."),
			type: 'boolean',
			default: true,
			tags: ['notebookLayout']
		},
		[NotebookCellEditorOptionsCustomizations]: editorOptionsCustomizationSchema
	}
});
*/
