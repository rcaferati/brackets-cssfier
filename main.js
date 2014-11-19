define(function(require, exports, module) {
    "use strict";
    var CommandManager    = brackets.getModule('command/CommandManager'),
        EditorManager     = brackets.getModule('editor/EditorManager'),
        DocumentManager   = brackets.getModule("document/DocumentManager"),
        PreferencesManager = brackets.getModule("preferences/PreferencesManager"),
        cssfier = require('cssfier'),
        editor,
        codeMirror;
    $(DocumentManager).on("currentDocumentChange", function () {
        editor = EditorManager.getCurrentFullEditor();
        if (!editor) {
            return;
        }
        codeMirror = editor._codeMirror;
        codeMirror.on("change", function (codeMirror, change) {
                cssfier.run(codeMirror, change); 
        });
    });
});