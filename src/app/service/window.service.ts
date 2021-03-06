import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { getWindow } from 'ssr-window';
import { environment } from 'src/environments/environment';

@Injectable({
	providedIn: 'root'
})

export class WindowRef {
	domain = environment.origin;

	constructor(
		@Inject(DOCUMENT) private document: Document
	) { }

	getNativeWindow(): Window | null {
		return _window();
	}

	getNativeDocument(): Document {
		return this.document;
	}

	copyValueToClipboard(value: string): void {
		const selectionBox = document.createElement('textarea');
		selectionBox.style.position = 'fixed';
		selectionBox.style.left = '0';
		selectionBox.style.top = '0';
		selectionBox.style.opacity = '0';
		selectionBox.value = value;
		document.body.appendChild(selectionBox);
		selectionBox.focus();
		selectionBox.select();
		document.execCommand('copy');
		document.body.removeChild(selectionBox);

		return undefined;
	}
}

function _window(): Window {
	return getWindow();
}
