/*\
title: $:/plugins/cdr/markdown-more/startup.js
type: application/javascript
module-type: startup
\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

// Export name and synchronous status
exports.name = "markdown-more";
exports.after = ["startup"];
exports.before = ["render"];
exports.synchronous = true;

exports.startup = function() {
	var MarkdownParser = $tw.Wiki.parsers["text/markdown"];

	if(!MarkdownParser) { return; }

	var md = MarkdownParser.prototype.md;
	md.use(require("$:/plugins/cdr/markdown-more/markdown-it-checklist.js"))
	  .use(require("$:/plugins/cdr/markdown-more/markdown-it-admonition"))
	  //.use(require("$:/plugins/cdr/markdown-more/markdown-it-toc-done-right"), {placeholder: "\\${toc}"})
	  //.use(require("$:/plugins/cdr/markdown-more/markdown-it-table-of-contents"))
	  ;

	if($tw.wiki.getTiddlerText("$:/config/markdown/toc/enable","no").trim().toLowerCase() === "yes") {
	  md.use(require("$:/plugins/cdr/markdown-more/markdown-it-toc"));
	}
}
})();
