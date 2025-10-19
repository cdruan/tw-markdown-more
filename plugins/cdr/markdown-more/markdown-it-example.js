/*\
title: $:/plugins/cdr/markdown-more/markdown-it-example.js
type: application/javascript
module-type: library

Adds example syntax:

```
-> example sentence  // comment
```
\*/

(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

function examplePlugin(md,options) {
	function exampleRule(state,startLine,endLine,silent) {
		var token, ch,
		markup = '->',
		pos = state.bMarks[startLine] + state.tShift[startLine],
		max = state.eMarks[startLine];

  		// if it's indented more than 3 spaces, it should be a code block
  		if(state.sCount[startLine] - state.blkIndent >= 4) { return false; }

		if(pos+1 >= max) { return false; }

		if(state.src.charCodeAt(pos++) !== markup.charCodeAt(0)) { return false; }

		if(state.src.charCodeAt(pos++) !== markup.charCodeAt(1)) { return false; }

		if(pos < max) {
			ch = state.src.charCodeAt(pos);
			if(ch !== 0x09 /* TAB */ && ch !== 0x20 /* space */) { return false; }
		}
		
		if(silent) {
			return true;
		}

		var terminatorRules = state.md.block.ruler.getRules('paragraph');
		var oldParentType = state.parentType;
		state.parentType = 'paragraph';

		// jump line-by-line until empty one or EOF
		var nextLine = startLine + 1;
		for(; nextLine < endLine && !state.isEmpty(nextLine); nextLine++) {
			// this would be a code block normally, but after paragraph
   	 		// it's considered a lazy continuation regardless of what's there
    		if(state.sCount[nextLine] - state.blkIndent > 3) { continue; }
			
			// quirk for blockquotes, this line should already be checked by that rule
    		if(state.sCount[nextLine] < 0) { continue; }

			// Some tags can terminate paragraph without empty line.
			let terminate = false;
			for (let i = 0;i < terminatorRules.length;i++) {
				if (terminatorRules[i](state, nextLine, endLine, true)) {
					terminate = true;
					break;
				}
			}
			if (terminate) { break; } 
		}

		var content = state.src.slice(pos + 1,state.eMarks[startLine] + 1) + state.getLines(startLine + 1, nextLine, state.blkIndent, false);
		var comment = null;
		var i = content.indexOf('//');
		if(i != -1) {
			comment = content.slice(i+2).trim();
			content = content.slice(0,i).trim();
		}

		state.line = nextLine;
		state.parentType = oldParentType;

		token = state.push('example_open','div',1);
		token.attrSet('class','md-example-container');
		token.block  = true;
		token.markup = markup;
		token.map = [ startLine, state.line ];

		token = state.push('example_text_open','span',1);
		token.attrSet('class','md-example-text');
		token.map = [ startLine, nextLine ];

		token = state.push('inline','',0);
  		token.content  = content;
  		token.map      = [ startLine, state.line ];
  		token.children = [];

		token = state.push('example_text_close','span',-1);

		if(comment) {
			token = state.push('example_comment_open','span',1);
			token.attrSet('class','md-example-comment');
			token.map = [ startLine, state.line ];

			token = state.push('inline','',0);
			token.content  = comment;
			token.map      = [ startLine, state.line ];
			token.children = [];

			token = state.push('example_comment_close','span',-1);		
		}
		
		token = state.push('example_close','div',-1);
		token.block  = true;
		token.markup = markup;

		return true;
	}

	md.block.ruler.after('heading','example',exampleRule,{
		alt: [ 'paragraph', 'reference', 'blockquote' ]
	});
}

module.exports = examplePlugin;
})();