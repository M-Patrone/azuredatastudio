/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IURLService } from 'vs/platform/url/common/url';
import { URI, UriComponents } from 'vs/base/common/uri';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { AbstractURLService } from 'vs/platform/url/common/urlService';
import { Event } from 'vs/base/common/event';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { IOpenerService, IOpener, OpenExternalOptions, OpenInternalOptions, matchesScheme } from 'vs/platform/opener/common/opener';
import { IProductService } from 'vs/platform/product/common/productService';

export interface IURLCallbackProvider {

	/**
	 * Indicates that a Uri has been opened outside of VSCode. The Uri
	 * will be forwarded to all installed Uri handlers in the system.
	 */
	readonly onCallback: Event<URI>;

	/**
	 * Creates a Uri that - if opened in a browser - must result in
	 * the `onCallback` to fire.
	 *
	 * The optional `Partial<UriComponents>` must be properly restored for
	 * the Uri passed to the `onCallback` handler.
	 *
	 * For example: if a Uri is to be created with `scheme:"vscode"`,
	 * `authority:"foo"` and `path:"bar"` the `onCallback` should fire
	 * with a Uri `vscode://foo/bar`.
	 *
	 * If there are additional `query` values in the Uri, they should
	 * be added to the list of provided `query` arguments from the
	 * `Partial<UriComponents>`.
	 */
	create(options?: Partial<UriComponents>): URI;
}

class BrowserURLOpener implements IOpener {

	constructor(
		private urlService: IURLService,
		private productService: IProductService
	) { }

	async open(resource: string | URI, options?: OpenInternalOptions | OpenExternalOptions): Promise<boolean> {
		if (!matchesScheme(resource, this.productService.urlProtocol)) {
			return false;
		}

		if (typeof resource === 'string') {
			resource = URI.parse(resource);
		}

		return this.urlService.open(resource, { trusted: true });
	}
}

export class BrowserURLService extends AbstractURLService {

	private provider: IURLCallbackProvider | undefined;

	constructor(
		@IWorkbenchEnvironmentService environmentService: IWorkbenchEnvironmentService,
		@IOpenerService openerService: IOpenerService,
		@IProductService productService: IProductService
	) {
		super();

		this.provider = environmentService.options?.urlCallbackProvider;

		if (this.provider) {
			this._register(this.provider.onCallback(uri => this.open(uri, { trusted: true })));
		}

		this._register(openerService.registerOpener(new BrowserURLOpener(this, productService)));
	}

	create(options?: Partial<UriComponents>): URI {
		if (this.provider) {
			return this.provider.create(options);
		}

		return URI.parse('unsupported://');
	}
}

registerSingleton(IURLService, BrowserURLService, true);
