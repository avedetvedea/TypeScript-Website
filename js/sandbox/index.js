var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define(["require", "exports", "./typeAcquisition", "./theme", "./compilerOptions", "./vendor/lzstring.min", "./releases", "./getInitialCode", "./twoslashSupport", "./vendor/typescript-vfs"], function (require, exports, typeAcquisition_1, theme_1, compilerOptions_1, lzstring_min_1, releases_1, getInitialCode_1, twoslashSupport_1, tsvfs) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createTypeScriptSandbox = exports.defaultPlaygroundSettings = void 0;
    lzstring_min_1 = __importDefault(lzstring_min_1);
    tsvfs = __importStar(tsvfs);
    const languageType = (config) => (config.filetype === "js" ? "javascript" : "typescript");
    // Basically android and monaco is pretty bad, this makes it less bad
    // See https://github.com/microsoft/pxt/pull/7099 for this, and the long
    // read is in https://github.com/microsoft/monaco-editor/issues/563
    const isAndroid = navigator && /android/i.test(navigator.userAgent);
    /** Default Monaco settings for playground */
    const sharedEditorOptions = {
        scrollBeyondLastLine: true,
        scrollBeyondLastColumn: 3,
        minimap: {
            enabled: false,
        },
        lightbulb: {
            enabled: true,
        },
        quickSuggestions: {
            other: !isAndroid,
            comments: !isAndroid,
            strings: !isAndroid,
        },
        acceptSuggestionOnCommitCharacter: !isAndroid,
        acceptSuggestionOnEnter: !isAndroid ? "on" : "off",
        accessibilitySupport: !isAndroid ? "on" : "off",
    };
    /** The default settings which we apply a partial over */
    function defaultPlaygroundSettings() {
        const config = {
            text: "",
            domID: "",
            compilerOptions: {},
            acquireTypes: true,
            filetype: "ts",
            supportTwoslashCompilerOptions: false,
            logger: console,
        };
        return config;
    }
    exports.defaultPlaygroundSettings = defaultPlaygroundSettings;
    function defaultFilePath(config, compilerOptions, monaco) {
        const isJSX = compilerOptions.jsx !== monaco.languages.typescript.JsxEmit.None;
        const ext = isJSX && config.filetype !== "d.ts" ? config.filetype + "x" : config.filetype;
        return "input." + ext;
    }
    /** Creates a monaco file reference, basically a fancy path */
    function createFileUri(config, compilerOptions, monaco) {
        return monaco.Uri.file(defaultFilePath(config, compilerOptions, monaco));
    }
    /** Creates a sandbox editor, and returns a set of useful functions and the editor */
    const createTypeScriptSandbox = (partialConfig, monaco, ts) => {
        const config = Object.assign(Object.assign({}, defaultPlaygroundSettings()), partialConfig);
        if (!("domID" in config) && !("elementToAppend" in config))
            throw new Error("You did not provide a domID or elementToAppend");
        const defaultText = config.suppressAutomaticallyGettingDefaultText
            ? config.text
            : (0, getInitialCode_1.getInitialCode)(config.text, document.location);
        // Defaults
        const compilerDefaults = (0, compilerOptions_1.getDefaultSandboxCompilerOptions)(config, monaco);
        // Grab the compiler flags via the query params
        let compilerOptions;
        if (!config.suppressAutomaticallyGettingCompilerFlags) {
            const params = new URLSearchParams(location.search);
            let queryParamCompilerOptions = (0, compilerOptions_1.getCompilerOptionsFromParams)(compilerDefaults, ts, params);
            if (Object.keys(queryParamCompilerOptions).length)
                config.logger.log("[Compiler] Found compiler options in query params: ", queryParamCompilerOptions);
            compilerOptions = Object.assign(Object.assign({}, compilerDefaults), queryParamCompilerOptions);
        }
        else {
            compilerOptions = compilerDefaults;
        }
        const isJSLang = config.filetype === "js";
        // Don't allow a state like allowJs = false
        if (isJSLang) {
            compilerOptions.allowJs = true;
        }
        const language = languageType(config);
        const filePath = createFileUri(config, compilerOptions, monaco);
        const element = "domID" in config ? document.getElementById(config.domID) : config.elementToAppend;
        const model = monaco.editor.createModel(defaultText, language, filePath);
        monaco.editor.defineTheme("sandbox", theme_1.sandboxTheme);
        monaco.editor.defineTheme("sandbox-dark", theme_1.sandboxThemeDark);
        monaco.editor.setTheme("sandbox");
        const monacoSettings = Object.assign({ model }, sharedEditorOptions, config.monacoSettings || {});
        const editor = monaco.editor.create(element, monacoSettings);
        const getWorker = isJSLang
            ? monaco.languages.typescript.getJavaScriptWorker
            : monaco.languages.typescript.getTypeScriptWorker;
        const defaults = isJSLang
            ? monaco.languages.typescript.javascriptDefaults
            : monaco.languages.typescript.typescriptDefaults;
        defaults.setDiagnosticsOptions(Object.assign(Object.assign({}, defaults.getDiagnosticsOptions()), { noSemanticValidation: false, 
            // This is when tslib is not found
            diagnosticCodesToIgnore: [2354] }));
        // In the future it'd be good to add support for an 'add many files'
        const addLibraryToRuntime = (code, path) => {
            defaults.addExtraLib(code, path);
            const uri = monaco.Uri.file(path);
            if (monaco.editor.getModel(uri) === null) {
                monaco.editor.createModel(code, "javascript", uri);
            }
            config.logger.log(`[ATA] Adding ${path} to runtime`);
        };
        const getTwoSlashComplierOptions = (0, twoslashSupport_1.extractTwoSlashComplierOptions)(ts);
        // Auto-complete twoslash comments
        if (config.supportTwoslashCompilerOptions) {
            const langs = ["javascript", "typescript"];
            langs.forEach(l => monaco.languages.registerCompletionItemProvider(l, {
                triggerCharacters: ["@", "/", "-"],
                provideCompletionItems: (0, twoslashSupport_1.twoslashCompletions)(ts, monaco),
            }));
        }
        const textUpdated = () => {
            const code = editor.getModel().getValue();
            if (config.supportTwoslashCompilerOptions) {
                const configOpts = getTwoSlashComplierOptions(code);
                console.log("twoslash", configOpts);
                updateCompilerSettings(configOpts);
            }
            if (config.acquireTypes) {
                (0, typeAcquisition_1.detectNewImportsToAcquireTypeFor)(code, addLibraryToRuntime, window.fetch.bind(window), config);
            }
        };
        // Debounced sandbox features like twoslash and type acquisition to once every second
        let debouncingTimer = false;
        editor.onDidChangeModelContent(_e => {
            if (debouncingTimer)
                return;
            debouncingTimer = true;
            setTimeout(() => {
                debouncingTimer = false;
                textUpdated();
            }, 1000);
        });
        config.logger.log("[Compiler] Set compiler options: ", compilerOptions);
        defaults.setCompilerOptions(compilerOptions);
        // Grab types last so that it logs in a logical way
        if (config.acquireTypes) {
            // Take the code from the editor right away
            const code = editor.getModel().getValue();
            (0, typeAcquisition_1.detectNewImportsToAcquireTypeFor)(code, addLibraryToRuntime, window.fetch.bind(window), config);
        }
        // To let clients plug into compiler settings changes
        let didUpdateCompilerSettings = (opts) => { };
        const updateCompilerSettings = (opts) => {
            const newKeys = Object.keys(opts);
            if (!newKeys.length)
                return;
            // Don't update a compiler setting if it's the same
            // as the current setting
            newKeys.forEach(key => {
                if (compilerOptions[key] == opts[key])
                    delete opts[key];
            });
            if (!Object.keys(opts).length)
                return;
            config.logger.log("[Compiler] Updating compiler options: ", opts);
            compilerOptions = Object.assign(Object.assign({}, compilerOptions), opts);
            defaults.setCompilerOptions(compilerOptions);
            didUpdateCompilerSettings(compilerOptions);
        };
        const updateCompilerSetting = (key, value) => {
            config.logger.log("[Compiler] Setting compiler options ", key, "to", value);
            compilerOptions[key] = value;
            defaults.setCompilerOptions(compilerOptions);
            didUpdateCompilerSettings(compilerOptions);
        };
        const setCompilerSettings = (opts) => {
            config.logger.log("[Compiler] Setting compiler options: ", opts);
            compilerOptions = opts;
            defaults.setCompilerOptions(compilerOptions);
            didUpdateCompilerSettings(compilerOptions);
        };
        const getCompilerOptions = () => {
            return compilerOptions;
        };
        const setDidUpdateCompilerSettings = (func) => {
            didUpdateCompilerSettings = func;
        };
        /** Gets the results of compiling your editor's code */
        const getEmitResult = () => __awaiter(void 0, void 0, void 0, function* () {
            const model = editor.getModel();
            const client = yield getWorkerProcess();
            return yield client.getEmitOutput(model.uri.toString());
        });
        /** Gets the JS  of compiling your editor's code */
        const getRunnableJS = () => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield getEmitResult();
            const firstJS = result.outputFiles.find((o) => o.name.endsWith(".js") || o.name.endsWith(".jsx"));
            return (firstJS && firstJS.text) || "";
        });
        /** Gets the DTS for the JS/TS  of compiling your editor's code */
        const getDTSForCode = () => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield getEmitResult();
            return result.outputFiles.find((o) => o.name.endsWith(".d.ts")).text;
        });
        const getWorkerProcess = () => __awaiter(void 0, void 0, void 0, function* () {
            const worker = yield getWorker();
            // @ts-ignore
            return yield worker(model.uri);
        });
        const getDomNode = () => editor.getDomNode();
        const getModel = () => editor.getModel();
        const getText = () => getModel().getValue();
        const setText = (text) => getModel().setValue(text);
        const setupTSVFS = (fsMapAdditions) => __awaiter(void 0, void 0, void 0, function* () {
            const fsMap = yield tsvfs.createDefaultMapFromCDN(compilerOptions, ts.version, true, ts, lzstring_min_1.default);
            fsMap.set(filePath.path, getText());
            if (fsMapAdditions) {
                fsMapAdditions.forEach((v, k) => fsMap.set(k, v));
            }
            const system = tsvfs.createSystem(fsMap);
            const host = tsvfs.createVirtualCompilerHost(system, compilerOptions, ts);
            const program = ts.createProgram({
                rootNames: [...fsMap.keys()],
                options: compilerOptions,
                host: host.compilerHost,
            });
            return {
                program,
                system,
                host,
                fsMap,
            };
        });
        /**
         * Creates a TS Program, if you're doing anything complex
         * it's likely you want setupTSVFS instead and can pull program out from that
         *
         * Warning: Runs on the main thread
         */
        const createTSProgram = () => __awaiter(void 0, void 0, void 0, function* () {
            const tsvfs = yield setupTSVFS();
            return tsvfs.program;
        });
        const getAST = () => __awaiter(void 0, void 0, void 0, function* () {
            const program = yield createTSProgram();
            program.emit();
            return program.getSourceFile(filePath.path);
        });
        // Pass along the supported releases for the playground
        const supportedVersions = releases_1.supportedReleases;
        textUpdated();
        return {
            /** The same config you passed in */
            config,
            /** A list of TypeScript versions you can use with the TypeScript sandbox */
            supportedVersions,
            /** The monaco editor instance */
            editor,
            /** Either "typescript" or "javascript" depending on your config */
            language,
            /** The outer monaco module, the result of require("monaco-editor")  */
            monaco,
            /** Gets a monaco-typescript worker, this will give you access to a language server. Note: prefer this for language server work because it happens on a webworker . */
            getWorkerProcess,
            /** A copy of require("@typescript/vfs") this can be used to quickly set up an in-memory compiler runs for ASTs, or to get complex language server results (anything above has to be serialized when passed)*/
            tsvfs,
            /** Get all the different emitted files after TypeScript is run */
            getEmitResult,
            /** Gets just the JavaScript for your sandbox, will transpile if in TS only */
            getRunnableJS,
            /** Gets the DTS output of the main code in the editor */
            getDTSForCode,
            /** The monaco-editor dom node, used for showing/hiding the editor */
            getDomNode,
            /** The model is an object which monaco uses to keep track of text in the editor. Use this to directly modify the text in the editor */
            getModel,
            /** Gets the text of the main model, which is the text in the editor */
            getText,
            /** Shortcut for setting the model's text content which would update the editor */
            setText,
            /** Gets the AST of the current text in monaco - uses `createTSProgram`, so the performance caveat applies there too */
            getAST,
            /** The module you get from require("typescript") */
            ts,
            /** Create a new Program, a TypeScript data model which represents the entire project. As well as some of the
             * primitive objects you would normally need to do work with the files.
             *
             * The first time this is called it has to download all the DTS files which is needed for an exact compiler run. Which
             * at max is about 1.5MB - after that subsequent downloads of dts lib files come from localStorage.
             *
             * Try to use this sparingly as it can be computationally expensive, at the minimum you should be using the debounced setup.
             *
             * Accepts an optional fsMap which you can use to add any files, or overwrite the default file.
             *
             * TODO: It would be good to create an easy way to have a single program instance which is updated for you
             * when the monaco model changes.
             */
            setupTSVFS,
            /** Uses the above call setupTSVFS, but only returns the program */
            createTSProgram,
            /** The Sandbox's default compiler options  */
            compilerDefaults,
            /** The Sandbox's current compiler options */
            getCompilerOptions,
            /** Replace the Sandbox's compiler options */
            setCompilerSettings,
            /** Overwrite the Sandbox's compiler options */
            updateCompilerSetting,
            /** Update a single compiler option in the SAndbox */
            updateCompilerSettings,
            /** A way to get callbacks when compiler settings have changed */
            setDidUpdateCompilerSettings,
            /** A copy of lzstring, which is used to archive/unarchive code */
            lzstring: lzstring_min_1.default,
            /** Returns compiler options found in the params of the current page */
            createURLQueryWithCompilerOptions: compilerOptions_1.createURLQueryWithCompilerOptions,
            /** Returns compiler options in the source code using twoslash notation */
            getTwoSlashComplierOptions,
            /** Gets to the current monaco-language, this is how you talk to the background webworkers */
            languageServiceDefaults: defaults,
            /** The path which represents the current file using the current compiler options */
            filepath: filePath.path,
            /** Adds a file to the vfs used by the editor */
            addLibraryToRuntime,
        };
    };
    exports.createTypeScriptSandbox = createTypeScriptSandbox;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zYW5kYm94L3NyYy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBb0RBLE1BQU0sWUFBWSxHQUFHLENBQUMsTUFBcUIsRUFBRSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQTtJQUV4RyxxRUFBcUU7SUFDckUsd0VBQXdFO0lBQ3hFLG1FQUFtRTtJQUNuRSxNQUFNLFNBQVMsR0FBRyxTQUFTLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUE7SUFFbkUsNkNBQTZDO0lBQzdDLE1BQU0sbUJBQW1CLEdBQWtEO1FBQ3pFLG9CQUFvQixFQUFFLElBQUk7UUFDMUIsc0JBQXNCLEVBQUUsQ0FBQztRQUN6QixPQUFPLEVBQUU7WUFDUCxPQUFPLEVBQUUsS0FBSztTQUNmO1FBQ0QsU0FBUyxFQUFFO1lBQ1QsT0FBTyxFQUFFLElBQUk7U0FDZDtRQUNELGdCQUFnQixFQUFFO1lBQ2hCLEtBQUssRUFBRSxDQUFDLFNBQVM7WUFDakIsUUFBUSxFQUFFLENBQUMsU0FBUztZQUNwQixPQUFPLEVBQUUsQ0FBQyxTQUFTO1NBQ3BCO1FBQ0QsaUNBQWlDLEVBQUUsQ0FBQyxTQUFTO1FBQzdDLHVCQUF1QixFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUs7UUFDbEQsb0JBQW9CLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSztLQUNoRCxDQUFBO0lBRUQseURBQXlEO0lBQ3pELFNBQWdCLHlCQUF5QjtRQUN2QyxNQUFNLE1BQU0sR0FBa0I7WUFDNUIsSUFBSSxF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Z0RBQWdEO1lBQ2hELG1CQUFtQjtTQUNwQixDQUFBO0lBQ0gsQ0FBQyxDQUFBO0lBM1RZLFFBQUEsdUJBQXVCLDJCQTJUbkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBkZXRlY3ROZXdJbXBvcnRzVG9BY3F1aXJlVHlwZUZvciB9IGZyb20gXCIuL3R5cGVBY3F1aXNpdGlvblwiXG5pbXBvcnQgeyBzYW5kYm94VGhlbWUsIHNhbmRib3hUaGVtZURhcmsgfSBmcm9tIFwiLi90aGVtZVwiXG5pbXBvcnQgeyBUeXBlU2NyaXB0V29ya2VyIH0gZnJvbSBcIi4vdHNXb3JrZXJcIlxuaW1wb3J0IHtcbiAgZ2V0RGVmYXVsdFNhbmRib3hDb21waWxlck9wdGlvbnMsXG4gIGdldENvbXBpbGVyT3B0aW9uc0Zyb21QYXJhbXMsXG4gIGNyZWF0ZVVSTFF1ZXJ5V2l0aENvbXBpbGVyT3B0aW9ucyxcbn0gZnJvbSBcIi4vY29tcGlsZXJPcHRpb25zXCJcbmltcG9ydCBsenN0cmluZyBmcm9tIFwiLi92ZW5kb3IvbHpzdHJpbmcubWluXCJcbmltcG9ydCB7IHN1cHBvcnRlZFJlbGVhc2VzIH0gZnJvbSBcIi4vcmVsZWFzZXNcIlxuaW1wb3J0IHsgZ2V0SW5pdGlhbENvZGUgfSBmcm9tIFwiLi9nZXRJbml0aWFsQ29kZVwiXG5pbXBvcnQgeyBleHRyYWN0VHdvU2xhc2hDb21wbGllck9wdGlvbnMsIHR3b3NsYXNoQ29tcGxldGlvbnMgfSBmcm9tIFwiLi90d29zbGFzaFN1cHBvcnRcIlxuaW1wb3J0ICogYXMgdHN2ZnMgZnJvbSBcIi4vdmVuZG9yL3R5cGVzY3JpcHQtdmZzXCJcblxudHlwZSBDb21waWxlck9wdGlvbnMgPSBpbXBvcnQoXCJtb25hY28tZWRpdG9yXCIpLmxhbmd1YWdlcy50eXBlc2NyaXB0LkNvbXBpbGVyT3B0aW9uc1xudHlwZSBNb25hY28gPSB0eXBlb2YgaW1wb3J0KFwibW9uYWNvLWVkaXRvclwiKVxuXG4vKipcbiAqIFRoZXNlIGFyZSBzZXR0aW5ncyBmb3IgdGhlIHBsYXlncm91bmQgd2hpY2ggYXJlIHRoZSBlcXVpdmFsZW50IHRvIHByb3BzIGluIFJlYWN0XG4gKiBhbnkgY2hhbmdlcyB0byBpdCBzaG91bGQgcmVxdWlyZSBhIG5ldyBzZXR1cCBvZiB0aGUgcGxheWdyb3VuZFxuICovXG5leHBvcnQgdHlwZSBTYW5kYm94Q29uZmlnID0ge1xuICAvKiogVGhlIGRlZmF1bHQgc291cmNlIGNvZGUgZm9yIHRoZSBwbGF5Z3JvdW5kICovXG4gIHRleHQ6IHN0cmluZ1xuICAvKiogQGRlcHJlY2F0ZWQgKi9cbiAgdXNlSmF2YVNjcmlwdD86IGJvb2xlYW5cbiAgLyoqIFRoZSBkZWZhdWx0IGZpbGUgZm9yIHRoZSBwbGFheWdyb3VuZCAgKi9cbiAgZmlsZXR5cGU6IFwianNcIiB8IFwidHNcIiB8IFwiZC50c1wiXG4gIC8qKiBDb21waWxlciBvcHRpb25zIHdoaWNoIGFyZSBhdXRvbWF0aWNhbGx5IGp1c3QgZm9yd2FyZGVkIG9uICovXG4gIGNvbXBpbGVyT3B0aW9uczogQ29tcGlsZXJPcHRpb25zXG4gIC8qKiBPcHRpb25hbCBtb25hY28gc2V0dGluZ3Mgb3ZlcnJpZGVzICovXG4gIG1vbmFjb1NldHRpbmdzPzogaW1wb3J0KFwibW9uYWNvLWVkaXRvclwiKS5lZGl0b3IuSUVkaXRvck9wdGlvbnNcbiAgLyoqIEFjcXVpcmUgdHlwZXMgdmlhIHR5cGUgYWNxdWlzaXRpb24gKi9cbiAgYWNxdWlyZVR5cGVzOiBib29sZWFuXG4gIC8qKiBTdXBwb3J0IHR3b3NsYXNoIGNvbXBpbGVyIG9wdGlvbnMgKi9cbiAgc3VwcG9ydFR3b3NsYXNoQ29tcGlsZXJPcHRpb25zOiBib29sZWFuXG4gIC8qKiBHZXQgdGhlIHRleHQgdmlhIHF1ZXJ5IHBhcmFtcyBhbmQgbG9jYWwgc3RvcmFnZSwgdXNlZnVsIHdoZW4gdGhlIGVkaXRvciBpcyB0aGUgbWFpbiBleHBlcmllbmNlICovXG4gIHN1cHByZXNzQXV0b21hdGljYWxseUdldHRpbmdEZWZhdWx0VGV4dD86IHRydWVcbiAgLyoqIFN1cHByZXNzIHNldHRpbmcgY29tcGlsZXIgb3B0aW9ucyBmcm9tIHRoZSBjb21waWxlciBmbGFncyBmcm9tIHF1ZXJ5IHBhcmFtcyAqL1xuICBzdXBwcmVzc0F1dG9tYXRpY2FsbHlHZXR0aW5nQ29tcGlsZXJGbGFncz86IHRydWVcbiAgLyoqIExvZ2dpbmcgc3lzdGVtICovXG4gIGxvZ2dlcjoge1xuICAgIGxvZzogKC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkXG4gICAgZXJyb3I6ICguLi5hcmdzOiBhbnlbXSkgPT4gdm9pZFxuICAgIGdyb3VwQ29sbGFwc2VkOiAoLi4uYXJnczogYW55W10pID0+IHZvaWRcbiAgICBncm91cEVuZDogKC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkXG4gIH1cbn0gJiAoXG4gIHwgeyAvKiogdGhlSUQgb2YgYSBkb20gbm9kZSB0byBhZGQgbW9uYWNvIHRvICovIGRvbUlEOiBzdHJpbmcgfVxuICB8IHsgLyoqIHRoZUlEIG9mIGEgZG9tIG5vZGUgdG8gYWRkIG1vbmFjbyB0byAqLyBlbGVtZW50VG9BcHBlbmQ6IEhUTUxFbGVtZW50IH1cbilcblxuY29uc3QgbGFuZ3VhZ2VUeXBlID0gKGNvbmZpZzogU2FuZGJveENvbmZpZykgPT4gKGNvbmZpZy5maWxldHlwZSA9PT0gXCJqc1wiID8gXCJqYXZhc2NyaXB0XCIgOiBcInR5cGVzY3JpcHRcIilcblxuLy8gQmFzaWNhbGx5IGFuZHJvaWQgYW5kIG1vbmFjbyBpcyBwcmV0dHkgYmFkLCB0aGlzIG1ha2VzIGl0IGxlc3MgYmFkXG4vLyBTZWUgaHR0cHM6Ly9naXRodWIuY29tL21pY3Jvc29mdC9weHQvcHVsbC83MDk5IGZvciB0aGlzLCBhbmQgdGhlIGxvbmdcbi8vIHJlYWQgaXMgaW4gaHR0cHM6Ly9naXRodWIuY29tL21pY3Jvc29mdC9tb25hY28tZWRpdG9yL2lzc3Vlcy81NjNcbmNvbnN0IGlzQW5kcm9pZCA9IG5hdmlnYXRvciAmJiAvYW5kcm9pZC9pLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudClcblxuLyoqIERlZmF1bHQgTW9uYWNvIHNldHRpbmdzIGZvciBwbGF5Z3JvdW5kICovXG5jb25zdCBzaGFyZWRFZGl0b3JPcHRpb25zOiBpbXBvcnQoXCJtb25hY28tZWRpdG9yXCIpLmVkaXRvci5JRWRpdG9yT3B0aW9ucyA9IHtcbiAgc2Nyb2xsQmV5b25kTGFzdExpbmU6IHRydWUsXG4gIHNjcm9sbEJleW9uZExhc3RDb2x1bW46IDMsXG4gIG1pbmltYXA6IHtcbiAgICBlbmFibGVkOiBmYWxzZSxcbiAgfSxcbiAgbGlnaHRidWxiOiB7XG4gICAgZW5hYmxlZDogdHJ1ZSxcbiAgfSxcbiAgcXVpY2tTdWdnZXN0aW9uczoge1xuICAgIG90aGVyOiAhaXNBbmRyb2lkLFxuICAgIGNvbW1lbnRzOiAhaXNBbmRyb2lkLFxuICAgIHN0cmluZ3M6ICFpc0FuZHJvaWQsXG4gIH0sXG4gIGFjY2VwdFN1Z2dlc3Rpb25PbkNvbW1pdENoYXJhY3RlcjogIWlzQW5kcm9pZCxcbiAgYWNjZXB0U3VnZ2VzdGlvbk9uRW50ZXI6ICFpc0FuZHJvaWQgPyBcIm9uXCIgOiBcIm9mZlwiLFxuICBhY2Nlc3NpYmlsaXR5U3VwcG9ydDogIWlzQW5kcm9pZCA/IFwib25cIiA6IFwib2ZmXCIsXG59XG5cbi8qKiBUaGUgZGVmYXVsdCBzZXR0aW5ncyB3aGljaCB3ZSBhcHBseSBhIHBhcnRpYWwgb3ZlciAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlZmF1bHRQbGF5Z3JvdW5kU2V0dGluZ3MoKSB7XG4gIGNvbnN0IGNvbmZpZzogU2FuZGJveENvbmZpZyA9IHtcbiAgICB0ZXh0OiBcIlwiLFxuICAgIGRvbUlEOiBcIlwiLFxuICAgIGNvbXBpbGVyT3B0aW9uczoge30sXG4gICAgYWNxdWlyZVR5cGVzOiB0cnVlLFxuICAgIGZpbGV0eXBlOiBcInRzXCIsXG4gICAgc3VwcG9ydFR3b3NsYXNoQ29tcGlsZXJPcHRpb25zOiBmYWxzZSxcbiAgICBsb2dnZXI6IGNvbnNvbGUsXG4gIH1cbiAgcmV0dXJuIGNvbmZpZ1xufVxuXG5mdW5jdGlvbiBkZWZhdWx0RmlsZVBhdGgoY29uZmlnOiBTYW5kYm94Q29uZmlnLCBjb21waWxlck9wdGlvbnM6IENvbXBpbGVyT3B0aW9ucywgbW9uYWNvOiBNb25hY28pIHtcbiAgY29uc3QgaXNKU1ggPSBjb21waWxlck9wdGlvbnMuanN4ICE9PSBtb25hY28ubGFuZ3VhZ2VzLnR5cGVzY3JpcHQuSnN4RW1pdC5Ob25lXG4gIGNvbnN0IGV4dCA9IGlzSlNYICYmIGNvbmZpZy5maWxldHlwZSAhPT0gXCJkLnRzXCIgPyBjb25maWcuZmlsZXR5cGUgKyBcInhcIiA6IGNvbmZpZy5maWxldHlwZVxuICByZXR1cm4gXCJpbnB1dC5cIiArIGV4dFxufVxuXG4vKiogQ3JlYXRlcyBhIG1vbmFjbyBmaWxlIHJlZmVyZW5jZSwgYmFzaWNhbGx5IGEgZmFuY3kgcGF0aCAqL1xuZnVuY3Rpb24gY3JlYXRlRmlsZVVyaShjb25maWc6IFNhbmRib3hDb25maWcsIGNvbXBpbGVyT3B0aW9uczogQ29tcGlsZXJPcHRpb25zLCBtb25hY286IE1vbmFjbykge1xuICByZXR1cm4gbW9uYWNvLlVyaS5maWxlKGRlZmF1bHRGaWxlUGF0aChjb25maWcsIGNvbXBpbGVyT3B0aW9ucywgbW9uYWNvKSlcbn1cblxuLyoqIENyZWF0ZXMgYSBzYW5kYm94IGVkaXRvciwgYW5kIHJldHVybnMgYSBzZXQgb2YgdXNlZnVsIGZ1bmN0aW9ucyBhbmQgdGhlIGVkaXRvciAqL1xuZXhwb3J0IGNvbnN0IGNyZWF0ZVR5cGVTY3JpcHRTYW5kYm94ID0gKFxuICBwYXJ0aWFsQ29uZmlnOiBQYXJ0aWFsPFNhbmRib3hDb25maWc+LFxuICBtb25hY286IE1vbmFjbyxcbiAgdHM6IHR5cGVvZiBpbXBvcnQoXCJ0eXBlc2NyaXB0XCIpXG4pID0+IHtcbiAgY29uc3QgY29uZmlnID0geyAuLi5kZWZhdWx0UGxheWdyb3VuZFNldHRpbmdzKCksIC4uLnBhcnRpYWxDb25maWcgfVxuICBpZiAoIShcImRvbUlEXCIgaW4gY29uZmlnKSAmJiAhKFwiZWxlbWVudFRvQXBwZW5kXCIgaW4gY29uZmlnKSlcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJZb3UgZGlkIG5vdCBwcm92aWRlIGEgZG9tSUQgb3IgZWxlbWVudFRvQXBwZW5kXCIpXG5cbiAgY29uc3QgZGVmYXVsdFRleHQgPSBjb25maWcuc3VwcHJlc3NBdXRvbWF0aWNhbGx5R2V0dGluZ0RlZmF1bHRUZXh0XG4gICAgPyBjb25maWcudGV4dFxuICAgIDogZ2V0SW5pdGlhbENvZGUoY29uZmlnLnRleHQsIGRvY3VtZW50LmxvY2F0aW9uKVxuXG4gIC8vIERlZmF1bHRzXG4gIGNvbnN0IGNvbXBpbGVyRGVmYXVsdHMgPSBnZXREZWZhdWx0U2FuZGJveENvbXBpbGVyT3B0aW9ucyhjb25maWcsIG1vbmFjbylcblxuICAvLyBHcmFiIHRoZSBjb21waWxlciBmbGFncyB2aWEgdGhlIHF1ZXJ5IHBhcmFtc1xuICBsZXQgY29tcGlsZXJPcHRpb25zOiBDb21waWxlck9wdGlvbnNcbiAgaWYgKCFjb25maWcuc3VwcHJlc3NBdXRvbWF0aWNhbGx5R2V0dGluZ0NvbXBpbGVyRmxhZ3MpIHtcbiAgICBjb25zdCBwYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKGxvY2F0aW9uLnNlYXJjaClcbiAgICBsZXQgcXVlcnlQYXJhbUNvbXBpbGVyT3B0aW9ucyA9IGdldENvbXBpbGVyT3B0aW9uc0Zyb21QYXJhbXMoY29tcGlsZXJEZWZhdWx0cywgdHMsIHBhcmFtcylcbiAgICBpZiAoT2JqZWN0LmtleXMocXVlcnlQYXJhbUNvbXBpbGVyT3B0aW9ucykubGVuZ3RoKVxuICAgICAgY29uZmlnLmxvZ2dlci5sb2coXCJbQ29tcGlsZXJdIEZvdW5kIGNvbXBpbGVyIG9wdGlvbnMgaW4gcXVlcnkgcGFyYW1zOiBcIiwgcXVlcnlQYXJhbUNvbXBpbGVyT3B0aW9ucylcbiAgICBjb21waWxlck9wdGlvbnMgPSB7IC4uLmNvbXBpbGVyRGVmYXVsdHMsIC4uLnF1ZXJ5UGFyYW1Db21waWxlck9wdGlvbnMgfVxuICB9IGVsc2Uge1xuICAgIGNvbXBpbGVyT3B0aW9ucyA9IGNvbXBpbGVyRGVmYXVsdHNcbiAgfVxuXG4gIGNvbnN0IGlzSlNMYW5nID0gY29uZmlnLmZpbGV0eXBlID09PSBcImpzXCJcbiAgLy8gRG9uJ3QgYWxsb3cgYSBzdGF0ZSBsaWtlIGFsbG93SnMgPSBmYWxzZVxuICBpZiAoaXNKU0xhbmcpIHtcbiAgICBjb21waWxlck9wdGlvbnMuYWxsb3dKcyA9IHRydWVcbiAgfVxuXG4gIGNvbnN0IGxhbmd1YWdlID0gbGFuZ3VhZ2VUeXBlKGNvbmZpZylcbiAgY29uc3QgZmlsZVBhdGggPSBjcmVhdGVGaWxlVXJpKGNvbmZpZywgY29tcGlsZXJPcHRpb25zLCBtb25hY28pXG4gIGNvbnN0IGVsZW1lbnQgPSBcImRvbUlEXCIgaW4gY29uZmlnID8gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoY29uZmlnLmRvbUlEKSA6IChjb25maWcgYXMgYW55KS5lbGVtZW50VG9BcHBlbmRcblxuICBjb25zdCBtb2RlbCA9IG1vbmFjby5lZGl0b3IuY3JlYXRlTW9kZWwoZGVmYXVsdFRleHQsIGxhbmd1YWdlLCBmaWxlUGF0aClcbiAgbW9uYWNvLmVkaXRvci5kZWZpbmVUaGVtZShcInNhbmRib3hcIiwgc2FuZGJveFRoZW1lKVxuICBtb25hY28uZWRpdG9yLmRlZmluZVRoZW1lKFwic2FuZGJveC1kYXJrXCIsIHNhbmRib3hUaGVtZURhcmspXG4gIG1vbmFjby5lZGl0b3Iuc2V0VGhlbWUoXCJzYW5kYm94XCIpXG5cbiAgY29uc3QgbW9uYWNvU2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHsgbW9kZWwgfSwgc2hhcmVkRWRpdG9yT3B0aW9ucywgY29uZmlnLm1vbmFjb1NldHRpbmdzIHx8IHt9KVxuICBjb25zdCBlZGl0b3IgPSBtb25hY28uZWRpdG9yLmNyZWF0ZShlbGVtZW50LCBtb25hY29TZXR0aW5ncylcblxuICBjb25zdCBnZXRXb3JrZXIgPSBpc0pTTGFuZ1xuICAgID8gbW9uYWNvLmxhbmd1YWdlcy50eXBlc2NyaXB0LmdldEphdmFTY3JpcHRXb3JrZXJcbiAgICA6IG1vbmFjby5sYW5ndWFnZXMudHlwZXNjcmlwdC5nZXRUeXBlU2NyaXB0V29ya2VyXG5cbiAgY29uc3QgZGVmYXVsdHMgPSBpc0pTTGFuZ1xuICAgID8gbW9uYWNvLmxhbmd1YWdlcy50eXBlc2NyaXB0LmphdmFzY3JpcHREZWZhdWx0c1xuICAgIDogbW9uYWNvLmxhbmd1YWdlcy50eXBlc2NyaXB0LnR5cGVzY3JpcHREZWZhdWx0c1xuXG4gIGRlZmF1bHRzLnNldERpYWdub3N0aWNzT3B0aW9ucyh7XG4gICAgLi4uZGVmYXVsdHMuZ2V0RGlhZ25vc3RpY3NPcHRpb25zKCksXG4gICAgbm9TZW1hbnRpY1ZhbGlkYXRpb246IGZhbHNlLFxuICAgIC8vIFRoaXMgaXMgd2hlbiB0c2xpYiBpcyBub3QgZm91bmRcbiAgICBkaWFnbm9zdGljQ29kZXNUb0lnbm9yZTogWzIzNTRdLFxuICB9KVxuXG4gIC8vIEluIHRoZSBmdXR1cmUgaXQnZCBiZSBnb29kIHRvIGFkZCBzdXBwb3J0IGZvciBhbiAnYWRkIG1hbnkgZmlsZXMnXG4gIGNvbnN0IGFkZExpYnJhcnlUb1J1bnRpbWUgPSAoY29kZTogc3RyaW5nLCBwYXRoOiBzdHJpbmcpID0+IHtcbiAgICBkZWZhdWx0cy5hZGRFeHRyYUxpYihjb2RlLCBwYXRoKVxuICAgIGNvbnN0IHVyaSA9IG1vbmFjby5VcmkuZmlsZShwYXRoKVxuICAgIGlmIChtb25hY28uZWRpdG9yLmdldE1vZGVsKHVyaSkgPT09IG51bGwpIHtcbiAgICAgIG1vbmFjby5lZGl0b3IuY3JlYXRlTW9kZWwoY29kZSwgXCJqYXZhc2NyaXB0XCIsIHVyaSlcbiAgICB9XG4gICAgY29uZmlnLmxvZ2dlci5sb2coYFtBVEFdIEFkZGluZyAke3BhdGh9IHRvIHJ1bnRpbWVgKVxuICB9XG5cbiAgY29uc3QgZ2V0VHdvU2xhc2hDb21wbGllck9wdGlvbnMgPSBleHRyYWN0VHdvU2xhc2hDb21wbGllck9wdGlvbnModHMpXG5cbiAgLy8gQXV0by1jb21wbGV0ZSB0d29zbGFzaCBjb21tZW50c1xuICBpZiAoY29uZmlnLnN1cHBvcnRUd29zbGFzaENvbXBpbGVyT3B0aW9ucykge1xuICAgIGNvbnN0IGxhbmdzID0gW1wiamF2YXNjcmlwdFwiLCBcInR5cGVzY3JpcHRcIl1cbiAgICBsYW5ncy5mb3JFYWNoKGwgPT5cbiAgICAgIG1vbmFjby5sYW5ndWFnZXMucmVnaXN0ZXJDb21wbGV0aW9uSXRlbVByb3ZpZGVyKGwsIHtcbiAgICAgICAgdHJpZ2dlckNoYXJhY3RlcnM6IFtcIkBcIiwgXCIvXCIsIFwiLVwiXSxcbiAgICAgICAgcHJvdmlkZUNvbXBsZXRpb25JdGVtczogdHdvc2xhc2hDb21wbGV0aW9ucyh0cywgbW9uYWNvKSxcbiAgICAgIH0pXG4gICAgKVxuICB9XG5cbiAgY29uc3QgdGV4dFVwZGF0ZWQgPSAoKSA9PiB7XG4gICAgY29uc3QgY29kZSA9IGVkaXRvci5nZXRNb2RlbCgpIS5nZXRWYWx1ZSgpXG5cbiAgICBpZiAoY29uZmlnLnN1cHBvcnRUd29zbGFzaENvbXBpbGVyT3B0aW9ucykge1xuICAgICAgY29uc3QgY29uZmlnT3B0cyA9IGdldFR3b1NsYXNoQ29tcGxpZXJPcHRpb25zKGNvZGUpXG4gICAgICBjb25zb2xlLmxvZyhcInR3b3NsYXNoXCIsIGNvbmZpZ09wdHMpXG4gICAgICB1cGRhdGVDb21waWxlclNldHRpbmdzKGNvbmZpZ09wdHMpXG4gICAgfVxuXG4gICAgaWYgKGNvbmZpZy5hY3F1aXJlVHlwZXMpIHtcbiAgICAgIGRldGVjdE5ld0ltcG9ydHNUb0FjcXVpcmVUeXBlRm9yKGNvZGUsIGFkZExpYnJhcnlUb1J1bnRpbWUsIHdpbmRvdy5mZXRjaC5iaW5kKHdpbmRvdyksIGNvbmZpZylcbiAgICB9XG4gIH1cblxuICAvLyBEZWJvdW5jZWQgc2FuZGJveCBmZWF0dXJlcyBsaWtlIHR3b3NsYXNoIGFuZCB0eXBlIGFjcXVpc2l0aW9uIHRvIG9uY2UgZXZlcnkgc2Vjb25kXG4gIGxldCBkZWJvdW5jaW5nVGltZXIgPSBmYWxzZVxuICBlZGl0b3Iub25EaWRDaGFuZ2VNb2RlbENvbnRlbnQoX2UgPT4ge1xuICAgIGlmIChkZWJvdW5jaW5nVGltZXIpIHJldHVyblxuICAgIGRlYm91bmNpbmdUaW1lciA9IHRydWVcbiAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIGRlYm91bmNpbmdUaW1lciA9IGZhbHNlXG4gICAgICB0ZXh0VXBkYXRlZCgpXG4gICAgfSwgMTAwMClcbiAgfSlcblxuICBjb25maWcubG9nZ2VyLmxvZyhcIltDb21waWxlcl0gU2V0IGNvbXBpbGVyIG9wdGlvbnM6IFwiLCBjb21waWxlck9wdGlvbnMpXG4gIGRlZmF1bHRzLnNldENvbXBpbGVyT3B0aW9ucyhjb21waWxlck9wdGlvbnMpXG5cbiAgLy8gR3JhYiB0eXBlcyBsYXN0IHNvIHRoYXQgaXQgbG9ncyBpbiBhIGxvZ2ljYWwgd2F5XG4gIGlmIChjb25maWcuYWNxdWlyZVR5cGVzKSB7XG4gICAgLy8gVGFrZSB0aGUgY29kZSBmcm9tIHRoZSBlZGl0b3IgcmlnaHQgYXdheVxuICAgIGNvbnN0IGNvZGUgPSBlZGl0b3IuZ2V0TW9kZWwoKSEuZ2V0VmFsdWUoKVxuICAgIGRldGVjdE5ld0ltcG9ydHNUb0FjcXVpcmVUeXBlRm9yKGNvZGUsIGFkZExpYnJhcnlUb1J1bnRpbWUsIHdpbmRvdy5mZXRjaC5iaW5kKHdpbmRvdyksIGNvbmZpZylcbiAgfVxuXG4gIC8vIFRvIGxldCBjbGllbnRzIHBsdWcgaW50byBjb21waWxlciBzZXR0aW5ncyBjaGFuZ2VzXG4gIGxldCBkaWRVcGRhdGVDb21waWxlclNldHRpbmdzID0gKG9wdHM6IENvbXBpbGVyT3B0aW9ucykgPT4ge31cblxuICBjb25zdCB1cGRhdGVDb21waWxlclNldHRpbmdzID0gKG9wdHM6IENvbXBpbGVyT3B0aW9ucykgPT4ge1xuICAgIGNvbnN0IG5ld0tleXMgPSBPYmplY3Qua2V5cyhvcHRzKVxuICAgIGlmICghbmV3S2V5cy5sZW5ndGgpIHJldHVyblxuXG4gICAgLy8gRG9uJ3QgdXBkYXRlIGEgY29tcGlsZXIgc2V0dGluZyBpZiBpdCdzIHRoZSBzYW1lXG4gICAgLy8gYXMgdGhlIGN1cnJlbnQgc2V0dGluZ1xuICAgIG5ld0tleXMuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgaWYgKGNvbXBpbGVyT3B0aW9uc1trZXldID09IG9wdHNba2V5XSkgZGVsZXRlIG9wdHNba2V5XVxuICAgIH0pXG5cbiAgICBpZiAoIU9iamVjdC5rZXlzKG9wdHMpLmxlbmd0aCkgcmV0dXJuXG5cbiAgICBjb25maWcubG9nZ2VyLmxvZyhcIltDb21waWxlcl0gVXBkYXRpbmcgY29tcGlsZXIgb3B0aW9uczogXCIsIG9wdHMpXG5cbiAgICBjb21waWxlck9wdGlvbnMgPSB7IC4uLmNvbXBpbGVyT3B0aW9ucywgLi4ub3B0cyB9XG4gICAgZGVmYXVsdHMuc2V0Q29tcGlsZXJPcHRpb25zKGNvbXBpbGVyT3B0aW9ucylcbiAgICBkaWRVcGRhdGVDb21waWxlclNldHRpbmdzKGNvbXBpbGVyT3B0aW9ucylcbiAgfVxuXG4gIGNvbnN0IHVwZGF0ZUNvbXBpbGVyU2V0dGluZyA9IChrZXk6IGtleW9mIENvbXBpbGVyT3B0aW9ucywgdmFsdWU6IGFueSkgPT4ge1xuICAgIGNvbmZpZy5sb2dnZXIubG9nKFwiW0NvbXBpbGVyXSBTZXR0aW5nIGNvbXBpbGVyIG9wdGlvbnMgXCIsIGtleSwgXCJ0b1wiLCB2YWx1ZSlcbiAgICBjb21waWxlck9wdGlvbnNba2V5XSA9IHZhbHVlXG4gICAgZGVmYXVsdHMuc2V0Q29tcGlsZXJPcHRpb25zKGNvbXBpbGVyT3B0aW9ucylcbiAgICBkaWRVcGRhdGVDb21waWxlclNldHRpbmdzKGNvbXBpbGVyT3B0aW9ucylcbiAgfVxuXG4gIGNvbnN0IHNldENvbXBpbGVyU2V0dGluZ3MgPSAob3B0czogQ29tcGlsZXJPcHRpb25zKSA9PiB7XG4gICAgY29uZmlnLmxvZ2dlci5sb2coXCJbQ29tcGlsZXJdIFNldHRpbmcgY29tcGlsZXIgb3B0aW9uczogXCIsIG9wdHMpXG4gICAgY29tcGlsZXJPcHRpb25zID0gb3B0c1xuICAgIGRlZmF1bHRzLnNldENvbXBpbGVyT3B0aW9ucyhjb21waWxlck9wdGlvbnMpXG4gICAgZGlkVXBkYXRlQ29tcGlsZXJTZXR0aW5ncyhjb21waWxlck9wdGlvbnMpXG4gIH1cblxuICBjb25zdCBnZXRDb21waWxlck9wdGlvbnMgPSAoKSA9PiB7XG4gICAgcmV0dXJuIGNvbXBpbGVyT3B0aW9uc1xuICB9XG5cbiAgY29uc3Qgc2V0RGlkVXBkYXRlQ29tcGlsZXJTZXR0aW5ncyA9IChmdW5jOiAob3B0czogQ29tcGlsZXJPcHRpb25zKSA9PiB2b2lkKSA9PiB7XG4gICAgZGlkVXBkYXRlQ29tcGlsZXJTZXR0aW5ncyA9IGZ1bmNcbiAgfVxuXG4gIC8qKiBHZXRzIHRoZSByZXN1bHRzIG9mIGNvbXBpbGluZyB5b3VyIGVkaXRvcidzIGNvZGUgKi9cbiAgY29uc3QgZ2V0RW1pdFJlc3VsdCA9IGFzeW5jICgpID0+IHtcbiAgICBjb25zdCBtb2RlbCA9IGVkaXRvci5nZXRNb2RlbCgpIVxuXG4gICAgY29uc3QgY2xpZW50ID0gYXdhaXQgZ2V0V29ya2VyUHJvY2VzcygpXG4gICAgcmV0dXJuIGF3YWl0IGNsaWVudC5nZXRFbWl0T3V0cHV0KG1vZGVsLnVyaS50b1N0cmluZygpKVxuICB9XG5cbiAgLyoqIEdldHMgdGhlIEpTICBvZiBjb21waWxpbmcgeW91ciBlZGl0b3IncyBjb2RlICovXG4gIGNvbnN0IGdldFJ1bm5hYmxlSlMgPSBhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZ2V0RW1pdFJlc3VsdCgpXG4gICAgY29uc3QgZmlyc3RKUyA9IHJlc3VsdC5vdXRwdXRGaWxlcy5maW5kKChvOiBhbnkpID0+IG8ubmFtZS5lbmRzV2l0aChcIi5qc1wiKSB8fCBvLm5hbWUuZW5kc1dpdGgoXCIuanN4XCIpKVxuICAgIHJldHVybiAoZmlyc3RKUyAmJiBmaXJzdEpTLnRleHQpIHx8IFwiXCJcbiAgfVxuXG4gIC8qKiBHZXRzIHRoZSBEVFMgZm9yIHRoZSBKUy9UUyAgb2YgY29tcGlsaW5nIHlvdXIgZWRpdG9yJ3MgY29kZSAqL1xuICBjb25zdCBnZXREVFNGb3JDb2RlID0gYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGdldEVtaXRSZXN1bHQoKVxuICAgIHJldHVybiByZXN1bHQub3V0cHV0RmlsZXMuZmluZCgobzogYW55KSA9PiBvLm5hbWUuZW5kc1dpdGgoXCIuZC50c1wiKSkhLnRleHRcbiAgfVxuXG4gIGNvbnN0IGdldFdvcmtlclByb2Nlc3MgPSBhc3luYyAoKTogUHJvbWlzZTxUeXBlU2NyaXB0V29ya2VyPiA9PiB7XG4gICAgY29uc3Qgd29ya2VyID0gYXdhaXQgZ2V0V29ya2VyKClcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcmV0dXJuIGF3YWl0IHdvcmtlcihtb2RlbC51cmkpXG4gIH1cblxuICBjb25zdCBnZXREb21Ob2RlID0gKCkgPT4gZWRpdG9yLmdldERvbU5vZGUoKSFcbiAgY29uc3QgZ2V0TW9kZWwgPSAoKSA9PiBlZGl0b3IuZ2V0TW9kZWwoKSFcbiAgY29uc3QgZ2V0VGV4dCA9ICgpID0+IGdldE1vZGVsKCkuZ2V0VmFsdWUoKVxuICBjb25zdCBzZXRUZXh0ID0gKHRleHQ6IHN0cmluZykgPT4gZ2V0TW9kZWwoKS5zZXRWYWx1ZSh0ZXh0KVxuXG4gIGNvbnN0IHNldHVwVFNWRlMgPSBhc3luYyAoZnNNYXBBZGRpdGlvbnM/OiBNYXA8c3RyaW5nLCBzdHJpbmc+KSA9PiB7XG4gICAgY29uc3QgZnNNYXAgPSBhd2FpdCB0c3Zmcy5jcmVhdGVEZWZhdWx0TWFwRnJvbUNETihjb21waWxlck9wdGlvbnMsIHRzLnZlcnNpb24sIHRydWUsIHRzLCBsenN0cmluZylcbiAgICBmc01hcC5zZXQoZmlsZVBhdGgucGF0aCwgZ2V0VGV4dCgpKVxuICAgIGlmIChmc01hcEFkZGl0aW9ucykge1xuICAgICAgZnNNYXBBZGRpdGlvbnMuZm9yRWFjaCgodiwgaykgPT4gZnNNYXAuc2V0KGssIHYpKVxuICAgIH1cblxuICAgIGNvbnN0IHN5c3RlbSA9IHRzdmZzLmNyZWF0ZVN5c3RlbShmc01hcClcbiAgICBjb25zdCBob3N0ID0gdHN2ZnMuY3JlYXRlVmlydHVhbENvbXBpbGVySG9zdChzeXN0ZW0sIGNvbXBpbGVyT3B0aW9ucywgdHMpXG5cbiAgICBjb25zdCBwcm9ncmFtID0gdHMuY3JlYXRlUHJvZ3JhbSh7XG4gICAgICByb290TmFtZXM6IFsuLi5mc01hcC5rZXlzKCldLFxuICAgICAgb3B0aW9uczogY29tcGlsZXJPcHRpb25zLFxuICAgICAgaG9zdDogaG9zdC5jb21waWxlckhvc3QsXG4gICAgfSlcblxuICAgIHJldHVybiB7XG4gICAgICBwcm9ncmFtLFxuICAgICAgc3lzdGVtLFxuICAgICAgaG9zdCxcbiAgICAgIGZzTWFwLFxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgVFMgUHJvZ3JhbSwgaWYgeW91J3JlIGRvaW5nIGFueXRoaW5nIGNvbXBsZXhcbiAgICogaXQncyBsaWtlbHkgeW91IHdhbnQgc2V0dXBUU1ZGUyBpbnN0ZWFkIGFuZCBjYW4gcHVsbCBwcm9ncmFtIG91dCBmcm9tIHRoYXRcbiAgICpcbiAgICogV2FybmluZzogUnVucyBvbiB0aGUgbWFpbiB0aHJlYWRcbiAgICovXG4gIGNvbnN0IGNyZWF0ZVRTUHJvZ3JhbSA9IGFzeW5jICgpID0+IHtcbiAgICBjb25zdCB0c3ZmcyA9IGF3YWl0IHNldHVwVFNWRlMoKVxuICAgIHJldHVybiB0c3Zmcy5wcm9ncmFtXG4gIH1cblxuICBjb25zdCBnZXRBU1QgPSBhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgcHJvZ3JhbSA9IGF3YWl0IGNyZWF0ZVRTUHJvZ3JhbSgpXG4gICAgcHJvZ3JhbS5lbWl0KClcbiAgICByZXR1cm4gcHJvZ3JhbS5nZXRTb3VyY2VGaWxlKGZpbGVQYXRoLnBhdGgpIVxuICB9XG5cbiAgLy8gUGFzcyBhbG9uZyB0aGUgc3VwcG9ydGVkIHJlbGVhc2VzIGZvciB0aGUgcGxheWdyb3VuZFxuICBjb25zdCBzdXBwb3J0ZWRWZXJzaW9ucyA9IHN1cHBvcnRlZFJlbGVhc2VzXG5cbiAgdGV4dFVwZGF0ZWQoKVxuXG4gIHJldHVybiB7XG4gICAgLyoqIFRoZSBzYW1lIGNvbmZpZyB5b3UgcGFzc2VkIGluICovXG4gICAgY29uZmlnLFxuICAgIC8qKiBBIGxpc3Qgb2YgVHlwZVNjcmlwdCB2ZXJzaW9ucyB5b3UgY2FuIHVzZSB3aXRoIHRoZSBUeXBlU2NyaXB0IHNhbmRib3ggKi9cbiAgICBzdXBwb3J0ZWRWZXJzaW9ucyxcbiAgICAvKiogVGhlIG1vbmFjbyBlZGl0b3IgaW5zdGFuY2UgKi9cbiAgICBlZGl0b3IsXG4gICAgLyoqIEVpdGhlciBcInR5cGVzY3JpcHRcIiBvciBcImphdmFzY3JpcHRcIiBkZXBlbmRpbmcgb24geW91ciBjb25maWcgKi9cbiAgICBsYW5ndWFnZSxcbiAgICAvKiogVGhlIG91dGVyIG1vbmFjbyBtb2R1bGUsIHRoZSByZXN1bHQgb2YgcmVxdWlyZShcIm1vbmFjby1lZGl0b3JcIikgICovXG4gICAgbW9uYWNvLFxuICAgIC8qKiBHZXRzIGEgbW9uYWNvLXR5cGVzY3JpcHQgd29ya2VyLCB0aGlzIHdpbGwgZ2l2ZSB5b3UgYWNjZXNzIHRvIGEgbGFuZ3VhZ2Ugc2VydmVyLiBOb3RlOiBwcmVmZXIgdGhpcyBmb3IgbGFuZ3VhZ2Ugc2VydmVyIHdvcmsgYmVjYXVzZSBpdCBoYXBwZW5zIG9uIGEgd2Vid29ya2VyIC4gKi9cbiAgICBnZXRXb3JrZXJQcm9jZXNzLFxuICAgIC8qKiBBIGNvcHkgb2YgcmVxdWlyZShcIkB0eXBlc2NyaXB0L3Zmc1wiKSB0aGlzIGNhbiBiZSB1c2VkIHRvIHF1aWNrbHkgc2V0IHVwIGFuIGluLW1lbW9yeSBjb21waWxlciBydW5zIGZvciBBU1RzLCBvciB0byBnZXQgY29tcGxleCBsYW5ndWFnZSBzZXJ2ZXIgcmVzdWx0cyAoYW55dGhpbmcgYWJvdmUgaGFzIHRvIGJlIHNlcmlhbGl6ZWQgd2hlbiBwYXNzZWQpKi9cbiAgICB0c3ZmcyxcbiAgICAvKiogR2V0IGFsbCB0aGUgZGlmZmVyZW50IGVtaXR0ZWQgZmlsZXMgYWZ0ZXIgVHlwZVNjcmlwdCBpcyBydW4gKi9cbiAgICBnZXRFbWl0UmVzdWx0LFxuICAgIC8qKiBHZXRzIGp1c3QgdGhlIEphdmFTY3JpcHQgZm9yIHlvdXIgc2FuZGJveCwgd2lsbCB0cmFuc3BpbGUgaWYgaW4gVFMgb25seSAqL1xuICAgIGdldFJ1bm5hYmxlSlMsXG4gICAgLyoqIEdldHMgdGhlIERUUyBvdXRwdXQgb2YgdGhlIG1haW4gY29kZSBpbiB0aGUgZWRpdG9yICovXG4gICAgZ2V0RFRTRm9yQ29kZSxcbiAgICAvKiogVGhlIG1vbmFjby1lZGl0b3IgZG9tIG5vZGUsIHVzZWQgZm9yIHNob3dpbmcvaGlkaW5nIHRoZSBlZGl0b3IgKi9cbiAgICBnZXREb21Ob2RlLFxuICAgIC8qKiBUaGUgbW9kZWwgaXMgYW4gb2JqZWN0IHdoaWNoIG1vbmFjbyB1c2VzIHRvIGtlZXAgdHJhY2sgb2YgdGV4dCBpbiB0aGUgZWRpdG9yLiBVc2UgdGhpcyB0byBkaXJlY3RseSBtb2RpZnkgdGhlIHRleHQgaW4gdGhlIGVkaXRvciAqL1xuICAgIGdldE1vZGVsLFxuICAgIC8qKiBHZXRzIHRoZSB0ZXh0IG9mIHRoZSBtYWluIG1vZGVsLCB3aGljaCBpcyB0aGUgdGV4dCBpbiB0aGUgZWRpdG9yICovXG4gICAgZ2V0VGV4dCxcbiAgICAvKiogU2hvcnRjdXQgZm9yIHNldHRpbmcgdGhlIG1vZGVsJ3MgdGV4dCBjb250ZW50IHdoaWNoIHdvdWxkIHVwZGF0ZSB0aGUgZWRpdG9yICovXG4gICAgc2V0VGV4dCxcbiAgICAvKiogR2V0cyB0aGUgQVNUIG9mIHRoZSBjdXJyZW50IHRleHQgaW4gbW9uYWNvIC0gdXNlcyBgY3JlYXRlVFNQcm9ncmFtYCwgc28gdGhlIHBlcmZvcm1hbmNlIGNhdmVhdCBhcHBsaWVzIHRoZXJlIHRvbyAqL1xuICAgIGdldEFTVCxcbiAgICAvKiogVGhlIG1vZHVsZSB5b3UgZ2V0IGZyb20gcmVxdWlyZShcInR5cGVzY3JpcHRcIikgKi9cbiAgICB0cyxcbiAgICAvKiogQ3JlYXRlIGEgbmV3IFByb2dyYW0sIGEgVHlwZVNjcmlwdCBkYXRhIG1vZGVsIHdoaWNoIHJlcHJlc2VudHMgdGhlIGVudGlyZSBwcm9qZWN0LiBBcyB3ZWxsIGFzIHNvbWUgb2YgdGhlXG4gICAgICogcHJpbWl0aXZlIG9iamVjdHMgeW91IHdvdWxkIG5vcm1hbGx5IG5lZWQgdG8gZG8gd29yayB3aXRoIHRoZSBmaWxlcy5cbiAgICAgKlxuICAgICAqIFRoZSBmaXJzdCB0aW1lIHRoaXMgaXMgY2FsbGVkIGl0IGhhcyB0byBkb3dubG9hZCBhbGwgdGhlIERUUyBmaWxlcyB3aGljaCBpcyBuZWVkZWQgZm9yIGFuIGV4YWN0IGNvbXBpbGVyIHJ1bi4gV2hpY2hcbiAgICAgKiBhdCBtYXggaXMgYWJvdXQgMS41TUIgLSBhZnRlciB0aGF0IHN1YnNlcXVlbnQgZG93bmxvYWRzIG9mIGR0cyBsaWIgZmlsZXMgY29tZSBmcm9tIGxvY2FsU3RvcmFnZS5cbiAgICAgKlxuICAgICAqIFRyeSB0byB1c2UgdGhpcyBzcGFyaW5nbHkgYXMgaXQgY2FuIGJlIGNvbXB1dGF0aW9uYWxseSBleHBlbnNpdmUsIGF0IHRoZSBtaW5pbXVtIHlvdSBzaG91bGQgYmUgdXNpbmcgdGhlIGRlYm91bmNlZCBzZXR1cC5cbiAgICAgKlxuICAgICAqIEFjY2VwdHMgYW4gb3B0aW9uYWwgZnNNYXAgd2hpY2ggeW91IGNhbiB1c2UgdG8gYWRkIGFueSBmaWxlcywgb3Igb3ZlcndyaXRlIHRoZSBkZWZhdWx0IGZpbGUuXG4gICAgICpcbiAgICAgKiBUT0RPOiBJdCB3b3VsZCBiZSBnb29kIHRvIGNyZWF0ZSBhbiBlYXN5IHdheSB0byBoYXZlIGEgc2luZ2xlIHByb2dyYW0gaW5zdGFuY2Ugd2hpY2ggaXMgdXBkYXRlZCBmb3IgeW91XG4gICAgICogd2hlbiB0aGUgbW9uYWNvIG1vZGVsIGNoYW5nZXMuXG4gICAgICovXG4gICAgc2V0dXBUU1ZGUyxcbiAgICAvKiogVXNlcyB0aGUgYWJvdmUgY2FsbCBzZXR1cFRTVkZTLCBidXQgb25seSByZXR1cm5zIHRoZSBwcm9ncmFtICovXG4gICAgY3JlYXRlVFNQcm9ncmFtLFxuICAgIC8qKiBUaGUgU2FuZGJveCdzIGRlZmF1bHQgY29tcGlsZXIgb3B0aW9ucyAgKi9cbiAgICBjb21waWxlckRlZmF1bHRzLFxuICAgIC8qKiBUaGUgU2FuZGJveCdzIGN1cnJlbnQgY29tcGlsZXIgb3B0aW9ucyAqL1xuICAgIGdldENvbXBpbGVyT3B0aW9ucyxcbiAgICAvKiogUmVwbGFjZSB0aGUgU2FuZGJveCdzIGNvbXBpbGVyIG9wdGlvbnMgKi9cbiAgICBzZXRDb21waWxlclNldHRpbmdzLFxuICAgIC8qKiBPdmVyd3JpdGUgdGhlIFNhbmRib3gncyBjb21waWxlciBvcHRpb25zICovXG4gICAgdXBkYXRlQ29tcGlsZXJTZXR0aW5nLFxuICAgIC8qKiBVcGRhdGUgYSBzaW5nbGUgY29tcGlsZXIgb3B0aW9uIGluIHRoZSBTQW5kYm94ICovXG4gICAgdXBkYXRlQ29tcGlsZXJTZXR0aW5ncyxcbiAgICAvKiogQSB3YXkgdG8gZ2V0IGNhbGxiYWNrcyB3aGVuIGNvbXBpbGVyIHNldHRpbmdzIGhhdmUgY2hhbmdlZCAqL1xuICAgIHNldERpZFVwZGF0ZUNvbXBpbGVyU2V0dGluZ3MsXG4gICAgLyoqIEEgY29weSBvZiBsenN0cmluZywgd2hpY2ggaXMgdXNlZCB0byBhcmNoaXZlL3VuYXJjaGl2ZSBjb2RlICovXG4gICAgbHpzdHJpbmcsXG4gICAgLyoqIFJldHVybnMgY29tcGlsZXIgb3B0aW9ucyBmb3VuZCBpbiB0aGUgcGFyYW1zIG9mIHRoZSBjdXJyZW50IHBhZ2UgKi9cbiAgICBjcmVhdGVVUkxRdWVyeVdpdGhDb21waWxlck9wdGlvbnMsXG4gICAgLyoqIFJldHVybnMgY29tcGlsZXIgb3B0aW9ucyBpbiB0aGUgc291cmNlIGNvZGUgdXNpbmcgdHdvc2xhc2ggbm90YXRpb24gKi9cbiAgICBnZXRUd29TbGFzaENvbXBsaWVyT3B0aW9ucyxcbiAgICAvKiogR2V0cyB0byB0aGUgY3VycmVudCBtb25hY28tbGFuZ3VhZ2UsIHRoaXMgaXMgaG93IHlvdSB0YWxrIHRvIHRoZSBiYWNrZ3JvdW5kIHdlYndvcmtlcnMgKi9cbiAgICBsYW5ndWFnZVNlcnZpY2VEZWZhdWx0czogZGVmYXVsdHMsXG4gICAgLyoqIFRoZSBwYXRoIHdoaWNoIHJlcHJlc2VudHMgdGhlIGN1cnJlbnQgZmlsZSB1c2luZyB0aGUgY3VycmVudCBjb21waWxlciBvcHRpb25zICovXG4gICAgZmlsZXBhdGg6IGZpbGVQYXRoLnBhdGgsXG4gICAgLyoqIEFkZHMgYSBmaWxlIHRvIHRoZSB2ZnMgdXNlZCBieSB0aGUgZWRpdG9yICovXG4gICAgYWRkTGlicmFyeVRvUnVudGltZSxcbiAgfVxufVxuXG5leHBvcnQgdHlwZSBTYW5kYm94ID0gUmV0dXJuVHlwZTx0eXBlb2YgY3JlYXRlVHlwZVNjcmlwdFNhbmRib3g+XG4iXX0=