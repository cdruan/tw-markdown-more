/*\
title: $:/plugins/cdr/markdown-more/md-checkbox.js
type: application/javascript
module-type: widget

Interactive checkbox for markdown checklists. Internal use only.
\*/

(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var Widget = require("$:/core/modules/widgets/widget.js").widget;

var MarkdownCheckboxWidget = function(parseTreeNode,options) {
	this.initialise(parseTreeNode,options);
};

/*
Inherit from the base widget class
*/
MarkdownCheckboxWidget.prototype = new Widget();

/*
Render this widget into the DOM
*/
MarkdownCheckboxWidget.prototype.render = function(parent,nextSibling) {
	this.parentDomNode = parent;
	this.computeAttributes();
	this.execute();

	// create our element
	this.inputNode = this.document.createElement("input");
	this.inputNode.setAttribute("type","checkbox");

	if(this.isChecked) {
		this.inputNode.setAttribute("class","checklist-item-checkbox checked");
		this.inputNode.setAttribute("checked","");
	} else {
		this.inputNode.setAttribute("class","checklist-item-checkbox unchecked");
	}
	if(this.isDisabled) {
		this.inputNode.setAttribute("disabled","");
	} else {
		// add event handler
		$tw.utils.addEventListeners(this.inputNode,[
			{
				name: "change",
				handlerObject: this,
				handlerMethod: "handleChangeEvent"
			}
		]);
	}

	// insert into the DOM
	parent.insertBefore(this.inputNode,nextSibling);
	this.domNodes.push(this.inputNode);
};

/*
Make a best effort to determine if the title of the storyTiddler matches that of
the transcluded tiddler. This function may provide inaccurate result if
the relevant titles contain the "|" character. But TW has a
Title/BadCharacterWarning that reduces the scenario.
*/
function matchTranscludeTitle(storyTiddlerTitle) {
	var curTiddlerTitle = this.getVariable("currentTiddler"),
		transclusion = this.getVariable("transclusion");

	if(transclusion === undefined) {return true;}

	if(transclusion.indexOf(curTiddlerTitle + "|") === 1) {
		var pos = 2 + curTiddlerTitle.length;
		return (transclusion.indexOf(storyTiddlerTitle + "|",pos) === pos);
	}
	return false;
}

/*
Compute the internal state of the widget
*/
MarkdownCheckboxWidget.prototype.execute = function() {
	this.tiddlerTitle = this.getVariable("storyTiddler");

	// Get the parameters from the attributes
	this.pos = parseInt(this.getAttribute("pos"));
	if(! isNaN(this.pos) && this.pos < 0) {
		this.pos = NaN;
	}

	this.isChecked = this.getAttribute("checked") !== undefined;
	this.isDisabled = (this.getAttribute("disabled") !== undefined)
		|| isNaN(this.pos)
		|| ! $tw.wiki.getTiddler(this.tiddlerTitle);

	if(!matchTranscludeTitle.call(this,this.tiddlerTitle)) {
		this.isDisabled = true;
	}
};

/*
Selectively refreshes the widget if needed. Returns true if the widget or any of its children needed re-rendering
*/
MarkdownCheckboxWidget.prototype.refresh = function(changedTiddlers) {
	var changedAttributes = this.computeAttributes();
	if(changedAttributes.pos || changedAttributes.checked || changedAttributes.disabled) {
		this.refreshSelf();
		return true;
	}
	return false;
};

MarkdownCheckboxWidget.prototype.handleChangeEvent = function(event) {
	var newText, text = $tw.wiki.getTiddlerText(this.tiddlerTitle);

	if(text.length <= this.pos) {
		return;
	}
	if(this.inputNode.checked) {
		newText = text.substring(0,this.pos) + text.substring(this.pos).replace(/\[ \]/,"[x]");
		$tw.utils.addClass(this.inputNode,"checked");
		$tw.utils.removeClass(this.inputNode,"unchecked");
	} else {
		newText = text.substring(0,this.pos) + text.substring(this.pos).replace(/\[[xX]\]/,"[ ]");
		$tw.utils.addClass(this.inputNode,"unchecked");
		$tw.utils.removeClass(this.inputNode,"checked");
	}
	$tw.wiki.setText(this.tiddlerTitle,"text",null,newText);
	// Trigger an autosave
	$tw.rootWidget.dispatchEvent({type: "tm-auto-save-wiki"});
}

exports["md-checkbox"] = MarkdownCheckboxWidget;

})();
