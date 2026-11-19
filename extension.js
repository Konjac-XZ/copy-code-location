// The module 'vscode' contains the VS Code extensibility API
const vscode = require('vscode');
const LanguageResolver = require('./languageResolver');

const LOCATION_FORMAT_SETTING_KEY = 'locationFormat';
const LEGACY_SHOW_COLUMN_NUMBERS_SETTING_KEY = 'showColumnNumbers';
const LEGACY_OMIT_LINE_NUMBERS_SETTING_KEY = 'omitLineNumbersForCompleteLines';
const LOCATION_FORMAT = Object.freeze({
	LINE: 'line',
	LINE_AND_COLUMN: 'lineAndColumn',
	LINE_AND_COLUMN_FOR_PARTIAL_LINES: 'lineAndColumnForPartialLines'
});

/**
 * Get the path relative to the workspace folder containing the document.
 * Fall back to the absolute path when the document has no workspace folder.
 * @param {vscode.Uri} documentUri - The document URI
 * @returns {string} - The relative path or normalized absolute path
 */
function getRelativePath(documentUri) {
	const workspaceFolder = vscode.workspace.getWorkspaceFolder(documentUri);

	if (!workspaceFolder) {
		return normalizeDisplayPath(documentUri.fsPath);
	}

	return vscode.workspace.asRelativePath(documentUri, false).replace(/\\/g, '/');
}

/**
 * Normalize the path displayed in copied output.
 * @param {string} filePath - The absolute file path
 * @returns {string} - The file path with a normalized Windows drive letter
 */
function normalizeDisplayPath(filePath) {
	return filePath.replace(/^([a-z]):/, (match, driveLetter) => `${driveLetter.toUpperCase()}:`);
}

/**
 * Get the line range string for the selection
 * @param {vscode.Selection} selection - The editor selection
 * @param {boolean} showColumns - Whether to include both one-based columns
 * @param {number} [endColumn] - The one-based inclusive end column
 * @returns {string} A line range, optionally with start and end columns
 */
function getLineRange(selection, showColumns = false, endColumn = Math.max(1, selection.end.character)) {
	// VS Code lines are 0-indexed, we want 1-indexed for display
	const startLine = selection.start.line + 1;
	const endsAtStartOfLaterLine = selection.end.character === 0
		&& selection.end.line > selection.start.line;
	const endLine = endsAtStartOfLaterLine
		? selection.end.line
		: selection.end.line + 1;

	if (showColumns) {
		return `${startLine}:${selection.start.character + 1}-${endLine}:${endColumn}`;
	}

	if (startLine === endLine) {
		return `${startLine}`;
	}

	return `${startLine}-${endLine}`;
}

/**
 * Get the configured number of newlines appended to copied content.
 * @returns {number} A value between 0 and 10
 */
function getTrailingNewlineCount() {
	return vscode.workspace
		.getConfiguration('copy-code-location')
		.get('trailingNewlines', 1);
}

/**
 * Get the selected location format.
 * @returns {string}
 */
function getLocationFormat() {
	return normalizeLocationFormat(vscode.workspace
		.getConfiguration('copy-code-location')
		.get(LOCATION_FORMAT_SETTING_KEY, LOCATION_FORMAT.LINE));
}

/**
 * Upgrade path-only values from the earlier dropdown while keeping line numbers.
 * @param {string} format - The configured format
 * @returns {string}
 */
function normalizeLocationFormat(format) {
	if (format === 'pathForCompleteLines') {
		return LOCATION_FORMAT.LINE;
	}
	if (format === 'pathForCompleteLinesWithColumns') {
		return LOCATION_FORMAT.LINE_AND_COLUMN_FOR_PARTIAL_LINES;
	}
	return format;
}

/**
 * Translate the old pair of settings to an equivalent location format.
 * @param {boolean} showColumns - Whether columns were enabled
 * @param {boolean} omitCompleteLineNumbers - Whether complete lines showed only their path
 * @returns {string}
 */
function getLegacyLocationFormat(showColumns, omitCompleteLineNumbers) {
	if (!showColumns) return LOCATION_FORMAT.LINE;
	return omitCompleteLineNumbers
		? LOCATION_FORMAT.LINE_AND_COLUMN_FOR_PARTIAL_LINES
		: LOCATION_FORMAT.LINE_AND_COLUMN;
}

/** Move explicitly configured legacy values to the single-choice setting. */
async function migrateLocationFormatSettings() {
	const configuration = vscode.workspace.getConfiguration('copy-code-location');
	const formatInspection = configuration.inspect(LOCATION_FORMAT_SETTING_KEY);
	const columnsInspection = configuration.inspect(LEGACY_SHOW_COLUMN_NUMBERS_SETTING_KEY);
	const omitInspection = configuration.inspect(LEGACY_OMIT_LINE_NUMBERS_SETTING_KEY);

	for (const [scope, target] of [
		['globalValue', vscode.ConfigurationTarget.Global],
		['workspaceValue', vscode.ConfigurationTarget.Workspace]
	]) {
		const configuredFormat = formatInspection?.[scope];
		const showColumns = columnsInspection?.[scope];
		const omitCompleteLineNumbers = omitInspection?.[scope];

		if (configuredFormat === undefined
			&& showColumns === undefined && omitCompleteLineNumbers === undefined) {
			continue;
		}

		if (configuredFormat !== undefined) {
			const upgradedFormat = normalizeLocationFormat(configuredFormat);
			if (upgradedFormat !== configuredFormat) {
				await configuration.update(LOCATION_FORMAT_SETTING_KEY, upgradedFormat, target);
			}
		} else {
			const inheritedColumns = scope === 'workspaceValue'
				? columnsInspection?.globalValue
				: undefined;
			const inheritedOmission = scope === 'workspaceValue'
				? omitInspection?.globalValue
				: undefined;
			await configuration.update(
				LOCATION_FORMAT_SETTING_KEY,
				getLegacyLocationFormat(
					showColumns ?? inheritedColumns ?? false,
					omitCompleteLineNumbers ?? inheritedOmission ?? false
				),
				target
			);
		}

		if (showColumns !== undefined) {
			await configuration.update(LEGACY_SHOW_COLUMN_NUMBERS_SETTING_KEY, undefined, target);
		}
		if (omitCompleteLineNumbers !== undefined) {
			await configuration.update(LEGACY_OMIT_LINE_NUMBERS_SETTING_KEY, undefined, target);
		}
	}
}

/**
 * Append a configured number of trailing newlines to content.
 * @param {string} content - The content to extend
 * @param {number} newlineCount - Number of newlines to append
 * @returns {string} The content with trailing newlines
 */
function appendTrailingNewlines(content, newlineCount) {
	return content + '\n'.repeat(newlineCount);
}

/**
 * Get a Markdown code fence that cannot be closed by the selected content.
 * @param {string} content - The code that will be enclosed by the fence
 * @returns {string} A backtick fence with at least three characters
 */
function getCodeFence(content) {
	const backtickSequences = content.match(/`+/g) || [];
	const longestSequenceLength = backtickSequences.reduce(
		(longest, sequence) => Math.max(longest, sequence.length),
		2
	);

	return '`'.repeat(longestSequenceLength + 1);
}

/**
 * Replace empty selections with their current lines and remove exact duplicate
 * ranges while preserving VS Code's selection order.
 * @param {vscode.TextDocument} document - The active document
 * @param {readonly vscode.Selection[]} selections - The editor selections
 * @returns {vscode.Selection[]} The effective ranges to copy
 */
function getCopySelections(document, selections) {
	const seenRanges = new Set();
	const copySelections = [];

	for (const originalSelection of selections) {
		let selection = originalSelection;

		if (selection.isEmpty) {
			const currentLine = document.lineAt(selection.active.line);
			selection = new vscode.Selection(currentLine.range.start, currentLine.range.end);
		}

		const rangeKey = [
			selection.start.line,
			selection.start.character,
			selection.end.line,
			selection.end.character
		].join(':');

		if (!seenRanges.has(rangeKey)) {
			seenRanges.add(rangeKey);
			copySelections.push(selection);
		}
	}

	return copySelections;
}

/**
 * Check whether the selected text contains only complete lines.
 * @param {vscode.TextDocument} document - The active document
 * @param {vscode.Selection} selection - The effective selection
 * @returns {boolean}
 */
function isCompleteLineSelection(document, selection) {
	return selection.start.character === 0
		&& (selection.end.character === document.lineAt(selection.end.line).text.length
			|| (selection.end.line > selection.start.line && selection.end.character === 0));
}

/**
 * Format one or more selected snippets as independent Markdown code blocks.
 * @param {string} displayPath - The path displayed above every snippet
 * @param {string} languageId - The Markdown language identifier
 * @param {{selection: vscode.Selection, text: string, endColumn?: number, isCompleteLine?: boolean}[]} snippets - Snippets to format
 * @param {number} trailingNewlineCount - Newlines appended to the complete output
 * @param {string} locationFormat - The selected location format
 * @returns {string} The complete clipboard content
 */
function buildCopiedContent(displayPath, languageId, snippets, trailingNewlineCount, locationFormat = LOCATION_FORMAT.LINE) {
	const format = normalizeLocationFormat(locationFormat);
	const blocks = snippets.map(({ selection, text, endColumn, isCompleteLine }) => {
		const showColumns = format === LOCATION_FORMAT.LINE_AND_COLUMN
			|| (format === LOCATION_FORMAT.LINE_AND_COLUMN_FOR_PARTIAL_LINES && !isCompleteLine);
		const location = `${displayPath}:${getLineRange(selection, showColumns, endColumn)}`;
		const codeFence = getCodeFence(text);
		return `${location}\n${codeFence}${languageId}\n${text}\n${codeFence}`;
	});

	return appendTrailingNewlines(blocks.join('\n\n'), trailingNewlineCount);
}

/**
 * Copy code with a configurable path and location label.
 * @param {boolean} useAbsolutePath - Whether to use absolute path or relative path
 */
async function copyCodeWithPath(useAbsolutePath) {
	const editor = vscode.window.activeTextEditor;

	if (!editor) {
		vscode.window.showWarningMessage('No active editor');
		return;
	}

	const document = editor.document;
	const filePath = document.uri.fsPath;
	const selections = getCopySelections(document, editor.selections);

	// Determine the path to use
	const untitledName = document.uri.path.split(/[\\/]/).pop() || 'Untitled';
	const displayPath = document.isUntitled
		? `[unsaved] ${untitledName}`
		: useAbsolutePath
			? normalizeDisplayPath(filePath)
			: getRelativePath(document.uri);

	// Resolve language identifier for syntax highlighting in markdown
	const languageId = document.isUntitled
		? document.languageId
		: LanguageResolver.resolve(filePath);
	const snippets = selections.map(selection => ({
		selection,
		text: document.getText(selection),
		isCompleteLine: isCompleteLineSelection(document, selection),
		endColumn: selection.end.character === 0
			&& selection.end.line > selection.start.line
			? Math.max(1, document.lineAt(selection.end.line - 1).text.length)
			: Math.max(1, selection.end.character)
	}));
	const locationFormat = getLocationFormat();

	// Format the output
	const formattedContent = buildCopiedContent(
		displayPath,
		languageId,
		snippets,
		getTrailingNewlineCount(),
		locationFormat
	);

	// Copy to clipboard
	await vscode.env.clipboard.writeText(formattedContent);

	// Show subtle status bar notification
	const pathType = document.isUntitled
		? 'unsaved label'
		: useAbsolutePath ? 'absolute path' : 'relative path';
	const selectionCount = selections.length;
	const selectionLabel = selectionCount === 1 ? '' : ` ${selectionCount} selections`;
	vscode.window.setStatusBarMessage(
		`$(check) Copied${selectionLabel} with ${pathType}`,
		2000
	);
}

async function pasteAsCodeBlock() {
	const editor = vscode.window.activeTextEditor;

	if (!editor) {
		vscode.window.showWarningMessage('No active editor');
		return;
	}

	const clipboardText = await vscode.env.clipboard.readText();

	if (!clipboardText) {
		vscode.window.showWarningMessage('Clipboard is empty');
		return;
	}

	const wrappedContent = `\`\`\`\n${clipboardText}\n\`\`\``;

	await editor.edit(editBuilder => {
		if (editor.selection.isEmpty) {
			editBuilder.insert(editor.selection.active, wrappedContent);
		} else {
			editBuilder.replace(editor.selection, wrappedContent);
		}
	});

	vscode.window.setStatusBarMessage('$(check) Pasted as code block', 2000);
}

/**
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {
	await migrateLocationFormatSettings();

	// Register relative path copy command
	const copyRelativeDisposable = vscode.commands.registerCommand(
		'copy-code-location.copyRelative',
		() => copyCodeWithPath(false)
	);

	// Register absolute path copy command
	const copyAbsoluteDisposable = vscode.commands.registerCommand(
		'copy-code-location.copyAbsolute',
		() => copyCodeWithPath(true)
	);

	context.subscriptions.push(copyRelativeDisposable);
	context.subscriptions.push(copyAbsoluteDisposable);

	const pasteCodeBlockDisposable = vscode.commands.registerCommand(
		'copy-code-location.pasteCodeBlock',
		() => pasteAsCodeBlock()
	);
	context.subscriptions.push(pasteCodeBlockDisposable);
}

function deactivate() { }

module.exports = {
	activate,
	deactivate,
	normalizeDisplayPath,
	getLineRange,
	appendTrailingNewlines,
	getCodeFence,
	getCopySelections,
	isCompleteLineSelection,
	getLegacyLocationFormat,
	normalizeLocationFormat,
	buildCopiedContent
};
