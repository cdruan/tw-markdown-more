/*\
title: $:/plugins/cdr/markdown-more/markdown-it-twtable.js
type: application/javascript
module-type: library

Based on markdown-it-table https://github.com/markdown-it/markdown-it/ | MIT License

Extends markdown-it to parse WikiText style tables
\*/

(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
'use strict';

function getLine(state,line) {
	const pos = state.bMarks[line] + state.tShift[line];
	const max = state.eMarks[line];

	return state.src.slice(pos,max);
}


/**
 * Returns an array of columns; last item in the returned array contains the row modifier info or '' if none.
 * Returns null if `str` is not a valid WikiText table row.
 *
 * @returns {string[] | null}
 */
function escapedSplit(str) {
	const result = [];
	const max = str.length;

	let isEscaped = false;
	let current = '';

	// minimum requirement for a table: `||`
	if(max < 2) { return null; }

	if(str.charCodeAt(0) !== 0x7c/* | */) { return null; }

	let pos = 1;
	let ch = str.charCodeAt(pos);
	let lastPos = pos;

	while(pos < max) {
		if(ch === 0x7c/* | */) {
			if(!isEscaped) {
				// pipe separating cells: '|'
				result.push(current + str.substring(lastPos,pos));
				current = '';
				lastPos = pos + 1;
			} else {
				// escaped pipe: '\|'
				current += str.substring(lastPos,pos - 1);
				lastPos = pos;
			}
		}

		isEscaped = (ch === 0x5c/* \ */);
		pos++;

		ch = str.charCodeAt(pos);
	}

	result.push(current + str.substring(lastPos));

	if(result.length < 2) { return null; }

	current = result[result.length - 1];

	const validTypes = 'fhckgw';

	if(current.length > 1 || ! validTypes.includes(current)) { return null; }

	return result;
}

/**
 * @param {TblCell[]} columns
 */
function pushColumnsIntoState(state,lineno,columns) {
	let token = state.push('tr_open','tr',1);
	token.map = [lineno, lineno + 1];

	for(let i = 0; i < columns.length; i++) {
		const cell = columns[i];
		if(cell.inline === null) {
			continue;
		}

		token = state.push(`${cell.tag}_open`,cell.tag,1);
		if(cell.style) {
			token.attrSet('style',cell.style);
		}
		if(cell.colspan > 1) {
			token.attrSet('colspan',cell.colspan);
		}
		if(cell.rowspan > 1) {
			token.attrSet('rowspan',cell.rowspan);
		}
		cell.token = token;

		token = state.push('inline','',0);
		token.content = cell.inline;
		token.children = [];

		state.push(`${cell.tag}_close`,cell.tag,-1);
	}
	state.push('tr_close','tr',-1);
}

/**
 * @param {string[]} columns
 *
 * @returns {ColGrpCell[]}
 */
function processColgroup(columns) {
	const row = [];
	let pendingColSpan = 0;

	for(let i=0; i < columns.length; i++) {
		const col = columns[i];
		/** @type { ColGrpCell } */
		const cell = {
			span: 1,
			content: null
		};

		if(col === '<') {
			pendingColSpan = 0;
			for(let c = row.length - 1; c >= 0; c--) {
				if(row[c] && row[c].content !== null) {
					row[c].span++;
					break;
				}
			}
		} else if(col === '>') {
			pendingColSpan++;
		} else {
			cell.content = col.trim();

			if(pendingColSpan > 0) {
				cell.span += pendingColSpan;
				pendingColSpan = 0;
			}
		}

		row.push(cell);
	}
	return row;
}

/**
 * @param {string[]} columns
 * @param {TblCell[][]} rows
 *
 * @return {TblCell[]}
 */
function processColumns(ishead,columns,rows) {
	let pendingColSpan = 0;
	const row = [];

	for(let i=0; i < columns.length; i++) {
		const col = columns[i];
		/** @type {TblCell} */
		const cell = {
			tag: (ishead ? 'th' : 'td'),
			style: '',
			colspan: 1,
			rowspan: 1,
			inline: null,
			token: null
		};
		let pos = 0;
		let max = col.length;
		let valign;
		let align;
		let style = '';

		if(col === '~') {
			pendingColSpan = 0;
			for(let r = rows.length - 1; r >= 0; r--) {
				const c = rows[r][i];

				if(c && c.inline !== null) {
					c.rowspan++;

					// previous rows may not have been pushed
					if(c.token !== null) {
						c.token.attrSet('rowspan',c.rowspan);
					}
					break;
				}
			}
		} else if(col === '<') {
			pendingColSpan = 0;
			for(let c = row.length - 1; c >= 0; c--) {
				if(row[c] && row[c].inline !== null) {
					row[c].colspan++;
					break;
				}
			}
		} else if(col === '>') {
			pendingColSpan++;
		} else {
			if(pos < max && col.charCodeAt(pos) === 0x5e/* ^ */) {
				valign = 'top';
				pos++;
			}
			if(pos < max && col.charCodeAt(pos) === 0x2c/* , */) {
				valign = 'bottom';
				pos++;
			}
			if(pos < max && col.charCodeAt(pos) === 0x20/* (space) */) {
				align = 'right';
				pos++;
				for(; pos < max; pos++) {
					if(col.charCodeAt(pos) !== 0x20/* (space) */) {
						break;
					}
				}
			}
			if(max - 1 >= pos && col.charCodeAt(max - 1) === 0x20 /* (space) */) {
				align = (align ? 'center' : 'left');
				max--;
			}
			if(pos < max && col.charCodeAt(pos) === 0x21/* ! */) {
				if(cell.tag === 'td') {
					cell.tag = 'th';
					if(! align) {
						align = 'left';
					}
				}
				pos++;
			}

			cell.inline = col.substring(pos,max).trim();
			if(align) {
				style += `text-align:${align};`;
			}
			if(valign) {
				style += `vertical-align:${valign};`;
			}
			cell.style = style;

			if(pendingColSpan > 0) {
				cell.colspan += pendingColSpan;
				pendingColSpan = 0;
			}
		}
		row.push(cell);
	}
	rows.push(row);
	return row;
}

/**
 * @param {StateBlock} state
 * @param {string[]} columns
 * @param {Table} table
 */
function processRow(state,lineno,columns,table) {
	const rowType = columns[columns.length - 1];
	columns.pop();

	let row;
	switch(rowType) {
		case 'h':
			if(table.secToken) {
				if(table.secToken.tag === 'tbody') {
					// @ts-expect-error: map initialized when token is created
					table.secToken.map[1] = lineno;

					// begin a new tbody tag
					state.push('tbody_close','tbody',-1);
					table.secToken = state.push('tbody_open','tbody',1);
					table.secToken.map = [lineno, 0];
					table.rows = [];
				}
			} else {
				// open thead tag
				table.secToken = state.push('thead_open','thead',1);
				table.secToken.map = [lineno, 0];
				table.rows = [];
			}
			row = processColumns(true,columns,table.rows);
			pushColumnsIntoState(state,lineno,row);
			break;
		case 'f':
			row = processColumns(false,columns,table.footer.rows);
			table.footer.maps.push(lineno);
			break;
		case 'c':
			{
				const text = columns.join('|').trim();
				if(table.caption.inlineToken.content === '') {
					table.caption.inlineToken.content = text;
				} else {
					table.caption.inlineToken.content += `<p>${text}</p>`;
				}
			}
			table.caption.openToken.hidden = false;
			table.caption.closeToken.hidden = false;
			break;
		case 'k':
			table.tblToken.attrJoin('class',columns.join(' ').trim());
			break;
		case 'g':
		case 'w':
			if(table.colgrpIdx > 0) {
				const colgroup = processColgroup(columns);
				if(colgroup.length > 0) {
					const groups = [];
					for(let i=0; i < colgroup.length; i++) {
						const c = colgroup[i];

						if(c.content === null) {
							continue;
						}
						const openToken = new state.Token('colgroup_open','colgroup',1);
						const closeToken = new state.Token('colgroup_close','colgroup',-1);

						if(c.span > 1) {
							openToken.attrSet('span',c.span);
						}
						if(c.content !== '') {
							switch (rowType) {
								case "g":
									openToken.attrSet('class',c.content);
									break;
								case "w":
									openToken.attrSet('style',`width:${c.content}`);
									break;
								default:
									break; // shouldn't be reached...
							}
						}

						groups.push(openToken);
						groups.push(closeToken);
					}
					state.tokens.splice(table.colgrpIdx,0,...groups);
				}
				// ignore additional colgroup rows
				table.colgrpIdx = -1
			}
			break;
		default:
			if(table.secToken) {
				if(table.secToken.tag === 'thead') {
					// open a new tbody tag
					// @ts-expect-error: map initialized when token is created
					table.secToken.map[1] = lineno;
					state.push('thead_close','thead',-1);
					table.secToken = state.push('tbody_open','tbody',1);
					table.secToken.map = [lineno, 0];
					table.rows = [];
				}
			} else {
				// open tbody tag
				table.secToken = state.push('tbody_open','tbody',1);
				table.secToken.map = [lineno, 0];
				table.rows = [];
			}
			row = processColumns(false,columns,table.rows);
			pushColumnsIntoState(state,lineno,row);
	}
}

/**
 * - any <thead> not at the top of table are converted to <tbody>
 * - multiple caption tags are merged into one separated by <br>
 * - all tfoot are moved to the end of the table
 *
 * @param {StateBlock} state
 *
 * @returns {boolean}
 */
function twtableRule(state,startLine,endLine,silent) {
	const pos = state.bMarks[startLine] + state.tShift[startLine];

	// if it's indented more than 3 spaces, it should be a code block
	if(state.sCount[startLine] - state.blkIndent >= 4) { return false; }

	if(state.src.charCodeAt(pos) !== 0x7c/* | */) { return false; }

	let lineText = getLine(state,startLine).trim();

	let columns = escapedSplit(lineText);

	if(! columns) { return false; }

	if(silent) {
		return true;
	}

	const oldParentType = state.parentType;
	state.parentType = 'table';

	// use 'blockquote' lists for termination because it's
	// the most similar to tables
	const terminatorRules = state.md.block.ruler.getRules('blockquote');


	const tblToken = state.push('table_open','table',1);
	tblToken.map = [startLine, 0];

	const captionOpenToken = state.push('caption_open','caption',1);
	captionOpenToken.hidden = true;

	const captionInlineToken = state.push('inline','',0);
	captionInlineToken.content = '';
	captionInlineToken.children = [];

	const captionCloseToken = state.push('caption_close','caption',-1);
	captionCloseToken.hidden = true;

	/** @type {Table} */
 	const table = {
		tblToken: tblToken,
		colgrpIdx: state.tokens.length, // token position for colgroup
		caption: { openToken: captionOpenToken, inlineToken: captionInlineToken, closeToken: captionCloseToken },
		secToken: null, // <tbody> or <thead> token
		rows: [], // content of processed rows
		footer: { rows: [], maps: [] },
	};

	processRow(state,startLine,columns,table);

	let nextLine;
	for(nextLine = startLine + 1; nextLine < endLine; nextLine++) {
		if(state.sCount[nextLine] < state.blkIndent) { break }

		let terminate = false;
		for(let i = 0, l = terminatorRules.length; i < l; i++) {
			if(terminatorRules[i](state,nextLine,endLine,true)) {
				terminate = true;
				break;
			}
		}
		if(terminate) { break }

		lineText = getLine(state,nextLine).trim();
		columns = escapedSplit(lineText);

		if(! columns) { break }
		if(!lineText) { break }
		if(state.sCount[nextLine] - state.blkIndent >= 4) { break }

		columns = escapedSplit(lineText)

		if(! columns) { break }
		processRow(state,nextLine,columns,table);
	}

	if(table.secToken) {
		// @ts-expect-error: map initialized when token is created
		table.secToken.map[1] = nextLine;
		state.push(`${table.secToken.tag}_close`,table.secToken.tag,-1);
	}

	if(table.footer.rows.length > 0) {
		const footToken = state.push('tfoot_open','tfoot',1);
		const footer = table.footer;

		let i = 0;
		for(; i < footer.rows.length; i++) {
			pushColumnsIntoState(state,footer.maps[i],footer.rows[i]);
		}
		state.push('tfoot_close','tfoot',-1);
		footToken.map = [footer.maps[0], footer.maps[i-1]];
	}

	state.push('table_close','table',-1);
	tblToken.map[1] = nextLine;

	state.parentType = oldParentType;
	state.line = nextLine;
	return true;
}

function twtablePlugin(md,options) {
	md.block.ruler.after('table','twtable',twtableRule,{
		alt: [ 'paragraph', 'reference' ]
	});
}

module.exports = twtablePlugin;
})();