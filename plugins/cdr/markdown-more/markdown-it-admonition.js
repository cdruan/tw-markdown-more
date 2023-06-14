/*\
title: $:/plugins/cdr/markdown-more/markdown-it-admonition.js
type: application/javascript
module-type: library

Adds admonition container:

:::category optional title string
admonition body
:::
\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var categories = {
	note: null,
	info: null,
	todo: null,
	important: null,
	tip: null,
	success: null,
	question: null,
	warning: null,
	caution: null,
	fail: null,
	danger: null,
	error: null,
	bug: null,
	example: null,
	snippet: null,
	abstract: null,
	summary: null,
	quote: null,
	cite: null,
	"see-also": "SEE ALSO"
};

// initialize default title string
for(var c in categories) {
	if(!categories[c]) {
		categories[c] = c.toUpperCase();
	}
};

var AdmMarkerCode;

var AdmHeadingRegEx = /^\s*([a-zA-Z-]+[a-zA-Z])([-+]?)(?:\s*$|\s+(.*?)\s*$)/;
function parseHeading(text) {
	var m = text.match(AdmHeadingRegEx);
	if(m) {
		var cat = m[1].toLowerCase();
		if(categories.hasOwnProperty(cat)) {
			return {
				category: cat,
				state: (m[2] || null),
				title: (m[3] || categories[cat])
			};
		}
	}
	return null;
}

// parse through source from startLine until endLine or markup string
function reachBlockEnd(state,startLine,endLine,markup) {
	var nextLine=startLine;
	var pos, mem, max, haveEndMarker=false;

	for(nextLine = startLine; nextLine < endLine; nextLine++) {
		pos = mem = state.bMarks[nextLine] + state.tShift[nextLine];
		max = state.eMarks[nextLine];

		if(pos < max && state.sCount[nextLine] < state.blkIndent) {
			// non-empty line with negative indent should stop the list:
			// - ```
			//  test
			break;
		}

		if(state.src.charCodeAt(pos) !== AdmMarkerCode) { continue; }

		if(state.sCount[nextLine] - state.blkIndent >= 4) {
			// closing fence should be indented less than 4 spaces
			continue;
		}

		pos = state.skipChars(pos,AdmMarkerCode);

		// closing code fence must be at least as long as the opening one
		if(pos - mem < markup.length) { continue; }

		// make sure tail has spaces only
		if(state.skipSpaces(pos) < max) { continue; }

		// found!
		haveEndMarker = true;
		break;
	}

	if(haveEndMarker) {
		nextLine++;
	}

	return { endLine: nextLine, endMarker: (haveEndMarker ? state.src.slice(mem,pos) : "") };
}

module.exports = function admonitionPlugin(md,options) {
	function admonitionRule(state,startLine,endLine,silent) {
		var pos, params, token, markup,
		start = state.bMarks[startLine] + state.tShift[startLine],
		max = state.eMarks[startLine];

		if(start + 3 > max) { return false; }

		if(state.src.charCodeAt(start) !== AdmMarkerCode) {
		  return false;
		}

		// scan marker length, must be >= 3
		pos = state.skipChars(start,AdmMarkerCode);

		if(pos - start < 3) { return false; }

		markup = state.src.slice(start,pos);
		params = state.src.slice(pos,max);

		// parse heading
		var heading = parseHeading(params);
		if(!heading) { return false; }

		// Since start is found, we can report success here in validation mode
		if(silent) { return true; }

		var loop = reachBlockEnd(state,startLine + 1,endLine,markup);
		var oldParent = state.parentType;
		var oldLineMax = state.lineMax;
		state.parentType = 'admonition';

		var blockTag = heading.state ? 'details' : 'div';
		var titleTag = heading.state ? 'summary' : 'div';

		token = state.push('admonition_open',blockTag,1);
		token.markup = markup;
		token.block  = true;
		token.info   = heading.category;
		token.map    = [ startLine, loop.endLine ];
		token.attrJoin('class','admonition');
		token.attrJoin('class',heading.category);
		if(heading.state === '+') {
			token.attrSet('open','open');
		}

		// admonition title
		token = state.push('admonition_title_open',titleTag,1);
		token.markup = markup;
		token.info   = heading.category;
		token.map    = [ startLine, startLine + 1 ];
		token.attrSet('class','admonition-title');

		token = state.push('inline','',0);
		token.content  = heading.title;
		token.map      = [ startLine, startLine + 1 ];
		token.children = [];

		token = state.push('admonition_title_close',titleTag,-1);
		token.markup = markup;
		token.info   = heading.category;

		token = state.push('admonition_body_open','div',1);
		token.attrSet('class','admonition-body');
		token.map = [ startLine + 1, loop.endLine - (loop.endMarker ? 1 : 0) ];

		// this will prevent lazy continuations from ever going past our end marker
		state.lineMax = token.map[1];
		state.md.block.tokenize(state,token.map[0],token.map[1]);

		token  = state.push('admonition_body_close','div',-1);
		token  = state.push('admonition_close',blockTag,-1);
		token.markup = loop.endMarker;
		token.block  = true;

		state.parentType = oldParent;
		state.lineMax = oldLineMax;
		state.line = loop.endLine;

		return true;
	}

	//var defaults = { marker: ":" };

	options = options || {};

	AdmMarkerCode = (options.maker || ":").charCodeAt(0);

	//options = md.utils.assign({},defaults,options);
	//options.markerCode = options.marker.charCodeAt(0);

	md.block.ruler.before('fence','admonition',admonitionRule,{
		alt: [ 'paragraph', 'reference', 'blockquote', 'list' ]
	});
};
})();