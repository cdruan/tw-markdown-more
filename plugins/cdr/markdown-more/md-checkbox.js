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

class MarkdownCheckboxWidget extends Widget {
	constructor(parseTreeNode,options) {
		super(parseTreeNode,options);
		this.pos = -1;
	}

	// Render this widget into the DOM
	render(parent,nextSibling) {
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
		/** @type {HTMLElement[]} */
		(this.domNodes).push(this.inputNode);
	}

	execute() {
		/*
		Make a best effort to determine if the title of the storyTiddler matches that of
		the transcluded tiddler. This function may provide inaccurate result if
		the relevant titles contain the "|" character. But TW has a
		Title/BadCharacterWarning that reduces the scenario.
		*/
		const matchTranscludeTitle = (storyTiddlerTitle) => {
			const curTiddlerTitle = this.getVariable("currentTiddler");
			const transclusion = this.getVariable("transclusion");

			if(transclusion === undefined) {return true;}

			if(transclusion.indexOf(`${curTiddlerTitle}|`) === 1) {
				const pos = 2 + curTiddlerTitle.length;
				return (transclusion.indexOf(`${storyTiddlerTitle}|`,pos) === pos);
			}
			return false;
		}

		this.tiddlerTitle = this.getVariable("storyTiddler");

		// Get the parameters from the attributes
		this.pos = parseInt(this.getAttribute("pos"),10);
		if(! Number.isNaN(this.pos) && this.pos < 0) {
			this.pos = NaN;
		}

		this.isChecked = this.getAttribute("checked") !== undefined;
		this.isDisabled = (this.getAttribute("disabled") !== undefined)
			|| Number.isNaN(this.pos)
			|| ! $tw.wiki.getTiddler(this.tiddlerTitle);

		if(!matchTranscludeTitle(this.tiddlerTitle)) {
			this.isDisabled = true;
		}
	}

	// Selectively refreshes the widget if needed. Returns true if the widget or any of its children need re-rendering
	refresh(changedTiddlers) {
		const changedAttributes = this.computeAttributes();
		if(changedAttributes.pos || changedAttributes.checked || changedAttributes.disabled) {
			this.refreshSelf();
			return true;
		}
		return false;
	}

	handleChangeEvent(event) {
		if(this.pos < 0) { return; }

		const text = ($tw.wiki.getTiddlerText(this.tiddlerTitle,"") || "");
		let newText;

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
}

exports["md-checkbox"] = MarkdownCheckboxWidget;

})();
