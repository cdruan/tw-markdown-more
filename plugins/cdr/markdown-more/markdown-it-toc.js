/*\
title: $:/plugins/cdr/markdown-more/markdown-it-toc.js
type: application/javascript
module-type: library

Adds a table of content section
\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var escapeHtml;

// TOC tree node: { level: n, text: s, id: n, children:[] }
function tocScan(state,maxDepth) {
	var root = { level: 0, text: '', id: null, children: [] };
	var stack = [ root ];

	var id = 0, i, level, token, curDepth = 0, curLevel = 0;
	for(i=0; i < state.tokens.length; i++) {
		if(state.tokens[i].level > 0) { continue; }
		if(state.tokens[i].type !== 'heading_open') { continue; }

		token = state.tokens[i];
		level = parseInt(token.tag.substring(1));

		if(level > 3) { continue; }

		if(level > curLevel) {
			if(curDepth >= maxDepth) { continue; }
			if(curLevel > 0 && level > curLevel + 1) { continue;}
		}

		if(state.tokens[i + 1].type !== 'inline') { continue; }

		var inlineTokens = state.tokens[i+1].children.filter(function(token) {
			return !['link_open','link_close','html_inline'].includes(token.type);
		});
		var headingText = state.md.renderer.renderInline(inlineTokens,state.md.options);
		var node = { level: level, text: headingText, id: id++, children: [] };

		// search level's parent
		while(curDepth > 0 && level <= stack[stack.length - 1].level) {
			stack.pop();
			curDepth--;
		}
		stack[stack.length - 1].children.push(node);
		stack.push(node);
		curDepth++;
		token.anchor = '#topic' + node.id;
		token.attrJoin('class','anchor-item');
		curLevel = level;
	}
	if(root.children.length > 0) {
		state.env.toc = root;
	}
}

function tocRenderTree(nodes, depth) {
	if(!nodes || nodes.length <= 0) {
		return '';
	}
	var s = (depth > 1 ? '\n' : '') + '<ol class="tc-toc toc-level' + depth + '">\n';
	var i;
	for(i=0; i < nodes.length; i++) {
		s += '<li class="toc-item"><a class="tc-tiddlylink" href=<<qualify "##topic' + nodes[i].id
			+ '">>><span>' + nodes[i].text + '</span></a>'
			+ tocRenderTree(nodes[i].children, depth + 1)
			+ '</li>\n';
	}
	return s + '</ol>\n';
}

function tocRender(tokens,idx,options,env) {
	if(!env.toc || env.toc.children.length === 0) {
		return '';
	}

	return '<div class="md-aside">\n<nav class="table-of-contents">\n'
		+ tocRenderTree(env.toc.children, 1)
		+ '</nav>\n</div>\n';
}

module.exports = function tocPlugin(md,options) {
	options = md.utils.assign(Object.create(null),{
		depth: 3
	}, options);

	escapeHtml = md.utils.escapeHtml;

	// insert 'toc' token automatically and enclose markdown
	// text into a <div> container
	md.core.ruler.before('block','prologue',function(state) {
		if(state.inlineMode) { return; }

		var token;
		token = new state.Token('html_block','',0);
		token.content = '<div class="md-container">\n';
		state.tokens.push(token);

		token = new state.Token('toc','nav',0);
		token.block = true;
		state.tokens.push(token);

		token = new state.Token('html_block','',0);
		token.content = '<div class="md-main">\n';
		state.tokens.push(token);
	});

	// close off main <div> container and starts scanning
	// for toc content
	md.core.ruler.push('epilogue', function(state) {
		if(state.inlineMode) { return; }

		var token = new state.Token('html_block','',0);		
		token.content = '</div>\n</div>\n';
		state.tokens.push(token);

		tocScan(state,options.depth);
	});

	md.renderer.rules.toc = tocRender;

	// adds anchor id to heading elements if available
	md.renderer.rules.heading_open = function(tokens,idx,options,env,slf) {
		var s = '<' + tokens[idx].tag + slf.renderAttrs(tokens[idx]);

		if(tokens[idx].anchor) {
			s += ' id=<<qualify "' + tokens[idx].anchor + '">>';
		}
		return s + '>';
	}
}
})();