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
		settings = JSON.parse(require('text!settings.json')),
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
			cssfier.run(codeMirror, change);
		});
	});
});
