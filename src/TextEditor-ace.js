import {html, css} from "./HelperFunctions.js"
import "../extern/ace.js"
import "../extern/ace-lang-tools.js"
import "./mode-vdm.js"

const styling = css`
#editor { 
    position: absolute;
    top: 15px;
    right: 0;
    bottom: 0;
    left: 0;
}
.top-line {
    font-family: monospace;
    margin-left: 50px;
}
.editor-container{
}
`

/**
 * @param {string} text
 */
function getTopLine(text){
    return "TODO: generate top line";
}

/**
 * @param {string} text
 */
function unStripText(text){
    let currentLine = 0;

    return [getTopLine(text)].concat(text.split("\n")).map((line) => {
        if(line[0] == "#" || line.trim() == ""){
            return line;
        }
        else{
            let newLine = currentLine.toString() + " " + line;
            currentLine++;
            return newLine;
        }
    }).join("\n");
}

function calculateLineNumber(file, absLineNum){
    const lines = file.split("\n");
    let currentCalcLineNum = 1;
    let currentAbsLineNum = 0;

    for(let line of lines){
        const trimmedLine = line.trim();

        if(trimmedLine[0] == "#" || trimmedLine == ""){
            if (currentAbsLineNum == absLineNum){
                return "";
            }
        }
        else{
            if (currentAbsLineNum == absLineNum){
                return currentCalcLineNum;
            }
            currentCalcLineNum++;
        }
        currentAbsLineNum++;
    }
}

export default class TextEditor extends HTMLElement {
    constructor(){
        super();
        this.root = this.attachShadow({mode: "open"});
        this.root.appendChild(this.template());
        this.editor = ace.edit(this.root.getElementById("editor"));
        //this.topLineEditor = ace.edit(this.root.getElementById("top-line-editor"));
        this.lastEditorChange = Date.now();
        this.lastEditorChangeTimeout = null;
        this.errorWebWorker = new Worker("./src/worker-vdm.js");
        this.errorWebWorker.onmessage = message => this.webWorkerMessage(message);

        this.setupAce();
    }

    setupAce(){
        // @ts-ignore
        this.editor.renderer.attachToShadowRoot();
        this.editor.focus();
        this.editor.session.setMode("ace/mode/vdm");
        // @ts-ignore
        ace.config.set('basePath', './src')

        this.editor.session.on("change", () => {
            this.editorChange();
        })

        let VDMNumberRenderer = {
            getText: (session, row) => {
                return calculateLineNumber(this.rawValue, row) + "";
            },
            getWidth: (session, lastLineNumber, config) => {
                // This is not really correct, as we have empty lines
                // TODO: could make this correct
                return (config.lastRow + 1).toString().length * config.characterWidth;
            }
        };

        // @ts-ignore
        this.editor.session.gutterRenderer = VDMNumberRenderer;

        var langTools = ace.require("ace/ext/language_tools");

        this.editor.setOptions({enableBasicAutocompletion: true, enableLiveAutocompletion: true});

        var testCompleter = {
            getCompletions: function(editor, session, pos, prefix, callback) {
                if (prefix.length === 0) { callback(null, []); return }
                callback(null, [
                    {
                        name: "Test AC",
                        value: "SIGMAA",
                        score: 20,
                        meta: "Complete"
                    }
                ])
            }
        }
        langTools.addCompleter(testCompleter);
    }

    webWorkerMessage(message) {
        if(message.data.type == "lint"){
            this.editor.getSession().setAnnotations(message.data.errors);
        }
    }

    editorChange() {
        const TIMEOUT = 1000;
        clearTimeout(this.lastEditorChangeTimeout);
        this.lastEditorChangeTimeout = setTimeout(() => {
            if(Date.now() - this.lastEditorChange >= TIMEOUT){
                this.errorWebWorker.postMessage({
                    type: "text_change",
                    text: this.value
                })
                
            }
        }, TIMEOUT + 100);

        this.lastEditorChange = Date.now();
    }

    get rawValue() {
        return this.editor.getValue();
    }

    get value(){
        return unStripText(this.editor.getValue());
    }

    stripText(text){
        return text.split("\n").map(x => {
            const match = x.match(/^[0-9]+ +/);
            if (match !== null){
                const numMatchLength = match[0].length;
                return x.slice(numMatchLength);
            }
            else{
                return x;
            }

        }).slice(1).join("\n");
    }

    set value(newValue){
        this.editor.setValue(this.stripText(newValue), -1); // use -1 move the cursor to the start of the file
    }

    template(){
        return html`
            <style>
                ${styling}
            </style>
            <div class="editor-container">
                <div class="top-line">INITIALIZE_TRIM IP(IP8) BEAM(BEAM1,BEAM2) PLANE(SEPARATION,CROSSING) UNITS(SIGMA)</div>
                <div id="editor"></div>
            </div>
        `
    }
}
customElements.define('text-editor', TextEditor);