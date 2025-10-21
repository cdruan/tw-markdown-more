/*\
title: $:/plugins/cdr/markdown-more/toc-widget.js
type: application/javascript
module-type: widget

Creates a table of contents section from the content within the widget.
\*/

(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var Widget = require("$:/core/modules/widgets/widget.js").widget;

var TocWidget = function(parseTreeNode,options) {
	this.initialise(parseTreeNode,options);
}

/*
Inherit from the base widget class
*/
TocWidget.prototype = new Widget();

/*
Render this widget into the DOM
*/
TocWidget.prototype.render = function(parent,nextSibling) {
	this.parentDomNode = parent;
	this.computeAttributes();
	this.execute();

	var toc = [],
		qualifier = this.getStateQualifier(),
		bodyNode = this.document.createElement("div");

	this.renderChildren(bodyNode,nextSibling);

	if(this.enableTOC) {
		toc = scanTOC(bodyNode,this.depth,qualifier);
	}

	if(toc.length > 0) {
		var domNode = this.document.createElement("div"),
			sideNode = this.document.createElement("div"),
			navNode = this.document.createElement("nav");

		domNode.className  = "md-container";
		bodyNode.className = "md-main";
		sideNode.classList = "md-aside";
		navNode.className  = "table-of-contents";

		renderTOC.call(this,navNode,toc,1);

		sideNode.appendChild(navNode);
		domNode.appendChild(sideNode);
		domNode.appendChild(bodyNode);
		parent.insertBefore(domNode,nextSibling);
		this.domNodes.push(domNode);
	} else {
		while (bodyNode.childNodes.length > 0) {
			parent.insertBefore(bodyNode.childNodes[0],nextSibling);
  		}
	}
};

/*
Compute the internal state of the widget
*/
TocWidget.prototype.execute = function() {
	this.depth = parseInt(this.getAttribute("depth",3));
	if(isNaN(this.depth) || this.depth < 0) {
		this.depth = 0;
	}
	this.enableTOC = this.getAttribute("enable","yes") === "yes";

	// Construct the child widgets
	this.makeChildWidgets();
};

TocWidget.prototype.refresh = function(changedTiddlers) {
	var changedAttributes = this.computeAttributes(),
		refresh = this.refreshChildren(changedTiddlers) || Object.keys(changedAttributes).length;

	if(refresh) {
		this.refreshSelf();
	}
	return refresh;
}

function scanTOC(startNode,maxDepth,qualifier) {
	var layout = [], // list of H<n> objects,
		state = { id: 0, curLevel: 0, curDepth: 0 },
		stack = [startNode], node;

	// pre-order traversal of DOM tree
  	while(stack.length > 0) {
		node = stack.pop();

		if(isHeading(node.tagName)) {
			processHnNode(node,layout,state,maxDepth,qualifier);
		} else if(node.classList.contains("md-container")) {
			// encounters a nested TOC
			var mainNode = node.querySelector(":scope > .md-main");
			if(mainNode) {
				var sibling = node.nextSibling;
				while(mainNode.childNodes.length > 0) {
					stack.push(mainNode.lastChild);
					node.parentNode.insertBefore(mainNode.lastChild,sibling);
					sibling = (sibling ? sibling.previousSibling : node.parentNode.lastChild);
				}
				node.parentNode.removeChild(node);
				continue;
			}
		}

		for(var i=node.children.length-1; i >= 0; i--) {
			stack.push(node.children[i]);
		}
  	}
	return layout;
}

function isHeading(tag) {
	if(tag.length != 2 || tag[0] !== "H") { return false; }

	var n = parseInt(tag[1]);
	return n >= 1 && n <= 6;
}

// maxDepth is how many nested levels to display. If h2 is the first heading in the body,
// then it will be considered at depth 1.
// level corresponds to h<n>.
function processHnNode(node,layout,state,maxDepth,qualifier) {
	var level = parseInt(node.tagName[1]);

	if(level > state.curLevel) {
		if(state.curDepth >= maxDepth) { return; }

		// allow first level TOC to be H2, H3, etc.
		if(state.curLevel == 0) {
			state.curLevel = level - 1;
		} else if(state.curDepth + level - state.curLevel > maxDepth) {
			return;
		}
	}
	var anchor = "#topic" + state.id++ + "-" + qualifier,
		heading = { level: level, text: node.textContent, anchor: anchor };

	$tw.utils.addClass(node,"anchor-item");
	node.setAttribute("id",anchor);

	state.curDepth += level - state.curLevel;
	state.curLevel = level;
	layout.push(heading);
}

function renderTOC(navNode,toc) {
	if(!toc || toc.length <= 0) {
		return;
	}

	var stack = [ {domNode: navNode, level: 0} ], node;
	var listNode,itemNode, linkNode, spanNode;
	for(let i=0; i < toc.length; i++) {
		let entry = toc[i];

		while(stack.length > 0 && stack.at(-1).level >= entry.level) {
			stack.pop();
		}

		let top = stack.at(-1), prevLevel, parent;
		prevLevel = top.level;
		parent = top.domNode;

		while(entry.level > prevLevel) {
			if(prevLevel == 0){
				// allow initial top level heading to be any h<n>
				prevLevel = entry.level;
			} else {
				prevLevel+=1;
			}
			listNode = this.document.createElement("ol");
			$tw.utils.addClass(listNode,"toc-list");
			parent.appendChild(listNode);

			node = { domNode: listNode, level: prevLevel };
			stack.push(node);
			parent = listNode;
		}
		// create an list item
		itemNode = this.document.createElement("li");
		itemNode.className = "toc-item";
		parent.appendChild(itemNode);

		linkNode = this.document.createElement("a");
		linkNode.className = "tc-tiddlylink";
		linkNode.setAttribute("href","#"+toc[i].anchor);
		itemNode.appendChild(linkNode);

		spanNode = this.document.createElement("span");
		spanNode.textContent = toc[i].text;
		linkNode.appendChild(spanNode);
	}
}

exports["toc"] = TocWidget;
})();