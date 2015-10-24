define(function (require, exports, module) {
	"use strict";
	var CommandManager = brackets.getModule('command/CommandManager'),
		EditorManager = brackets.getModule('editor/EditorManager'),
		Menus = brackets.getModule('command/Menus'),
		Dialogs = brackets.getModule("widgets/Dialogs"),
		DocumentManager = brackets.getModule("document/DocumentManager"),
		PreferencesManager = brackets.getModule("preferences/PreferencesManager"),
		MainViewManager = brackets.getModule('view/MainViewManager'),
		cssfier = require('cssfier'),
		editor,
		codeMirror,
		menu,
		command,
		running = false,
		current = {},
		preferences = PreferencesManager.getExtensionPrefs("caferati.cssfier"),
		enable = "caferati.cssfier.enable",
		disable = "caferati.cssfier.disable";

	function setStatus(status) {
		preferences.set("status", status);
		if (status) {
			menu.addMenuItem(disable)
			menu.removeMenuItem(enable);
		} else {
			menu.addMenuItem(enable)
			menu.removeMenuItem(disable);
		}
		Dialogs.showModalDialog("cssfier-modal", "Cssfier", "Cssfier extension is now " + (status ? "enabled" : "disabled") + ".");
	}

	function isFileExt(ext) {
		var fileType = DocumentManager.getCurrentDocument().getLanguage()._id;
		if (fileType.match(new RegExp(ext, "i"))) return fileType.toLowerCase();
		return false;
	}

	function reindent(codeMirror, from, to) {
		codeMirror.operation(function () {
			codeMirror.eachLine(from, to, function (line) {
				codeMirror.indentLine(line.lineNo(), "smart");
			});
		});
	}

	function arrayToText(text){
		var all = "";
		for (var i = 0, l = text.length; i < l; i++) {
			all = all + text[i];
		}
		return all;
	}

	CommandManager.register("Enable cssfier", enable, function () {
		setStatus(true);
	});
	CommandManager.register("Disable cssfier", disable, function () {
		setStatus(false)
	});

	menu = Menus.getMenu(Menus.AppMenuBar.EDIT_MENU);
	menu.addMenuDivider();
	preferences.definePreference("status", "boolean", true);
	preferences.get("status") ? menu.addMenuItem(disable) : menu.addMenuItem(enable);

	$(MainViewManager).on("currentFileChange", function () {
		editor = EditorManager.getCurrentFullEditor();
		if (!editor) {
			return;
		}
		codeMirror = editor._codeMirror;
		codeMirror.on("change", function (codeMirror, change) {
			if (!preferences.get("status")) return;

			if (change.origin !== "paste" || change.origin != "paste" || running || !change.text[0].match(/[<>]/mig)) {
				return;
			}

			var file = isFileExt("scss|less|css"),
				text = change.text,
				from = codeMirror.getCursor(true),
				to = codeMirror.getCursor(false),
				line = codeMirror.getLine(from.line);

			if (!file) {
				return;
			}

			running = true;
			// at least 80ms until the next run.
			setTimeout(function () {
				running = false;
			}, 80);

			text = arrayToText(text);

			if(!text.length){
				return;
			}

			text = cssfier.run(text, file);
			codeMirror.replaceRange(text, change.from, from);
			reindent(codeMirror, change.from.line, change.from.line * 1 + text.match(/\n/mig).length + 1);

		});
	});
});
