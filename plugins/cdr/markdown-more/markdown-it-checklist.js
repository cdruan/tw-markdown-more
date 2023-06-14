/*\
title: $:/plugins/cdr/markdown-more/markdown-it-checklist.js
type: application/javascript
module-type: library

Adds checklist syntax:

```
- [ ] task 1
- [x] task 2
```
\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var CheckBoxRegEx = /^\[([xX ])\]\s+/g;

// token[idx] is the first inline token of a list item
function processListItemStart(state,tokens,idx) {
	var tok = tokens[idx]; // inline token
	var blockState = state.md.blockState;

	if(tok.children.length <= 0) { return; }

	var text = tok.children[0].content;

	CheckBoxRegEx.lastIndex = 0;
	var match = CheckBoxRegEx.exec(text);

	if(match) {
		var checked = false;
		if(match[1] === " ") {
			tokens[idx - 2].attrSet("class","checklist-item unchecked");
		} else {
			tokens[idx - 2].attrSet("class","checklist-item checked");
			checked = true;
		}
		tok.children[0].content = text.substring(CheckBoxRegEx.lastIndex);
		var inputToken = new state.Token('checkbox','$md-checkbox',0);
		inputToken.attrSet("class","checklist-item-checkbox");
		inputToken.attrSet("type","checkbox");
		inputToken.attrSet("pos",blockState.bMarks[tokens[idx].map[0]]);
		if(checked) {
			inputToken.attrSet("checked","");
		}
		tok.children.unshift(inputToken);
	}
}

function isListItemStart(tokens,idx) {
	return tokens[idx].type === "inline" &&
		tokens[idx - 1].type == "paragraph_open" &&
		tokens[idx - 2].type === "list_item_open";
}

function processLists(state) {
	var tokens = state.tokens;

	for(var idx = 2; idx < tokens.length; idx++) {
		if(isListItemStart(tokens,idx)) {
			processListItemStart(state,tokens,idx);
		}
	}
	delete state.md.blockState;
}

function checklistPlugin(md,options) {
	md.core.ruler.after('inline','checklist',processLists,options);

	// insert a dummy rule in order to preserve block processing's state object
	md.block.ruler.before('table','_dummy_',function(state,startLine,endLine,silent) {
		state.md.blockState = state;
		return false;
	});
}

module.exports = checklistPlugin;
})();