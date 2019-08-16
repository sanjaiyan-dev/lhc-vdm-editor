// @ts-check
import { css, joinFilePaths, preventSelectCSS, NO_FILES_TEXT, getRelativePath } from "../HelperFunctions.js";
import { NoPathExistsError, default as GitLab, FileAlreadyExistsError } from "../GitLab.js";
import './IPCampaignSelectors.js';
import "./CreateFileWindow.js";
import './FolderTriangle.js';
import "./ContextMenu.js"
import { MyHyperHTMLElement } from "./MyHyperHTMLElement.js";

const styling = css`
* {
    font-family: sans-serif;
    border-radius: 2px;
}
#file-browser {
    border: 1px solid #a2a2a2;
    padding: 3px;
    background-color: #d6d6d6;
    overflow: hidden;
}
#folder-name {
    font-weight: bold;
    padding: 3px;
}

.item {
    background-color: #ededed;
    padding: 3px;
    font-size: 14px;
    cursor: pointer;
    overflow: hidden;
    white-space: nowrap;
}

.no-files-item {
    cursor: default;
}

.item-open {
    font-weight: bold;
}

#file-browser .item:nth-of-type(2n) {
    background-color: white;
}

.folder-name {
    padding-left: 14px;
}

.folder-content{
    margin-left: 15px;
}

* {
    ${preventSelectCSS}
}

.folder-content > div {
    border-bottom: 1px solid grey;
}
`

export default class FileBrowser extends MyHyperHTMLElement {
    constructor() {
        super();
        this.root = this.attachShadow({ mode: "open" });
        this.openFile = null;
        /** @type GitLab */
        this.gitlab = null;
        /** @type {HTMLDivElement} */
        this.myContextMenu = null;
        this.isCommitted = true;
        this.fileStructure = Promise.resolve({
            files: [],
            folders: new Map()
        })

        document.body.addEventListener("mousedown", /**@type MouseEvent*/event => {
            if (this.myContextMenu !== null && !(event.composedPath().includes(this.myContextMenu))) {
                this.myContextMenu = null;
                this.render();
            }
        });
    }

    // We need this to be not implemented by MyHyperHTMLElement, as we want render to be called in init
    connectedCallback(){}

    /**
     * Initialise the FileBrowser with the GitLab instance and the openFile
     * 
     * @param {GitLab} gitlab
     * @param {string} openFile The current open file, as path relative to the current explored folder
     */
    async init(gitlab, openFile) {
        this.gitlab = gitlab;
        this.openFile = openFile;

        this.campaigns = (await this.gitlab.listCampaigns()).reverse();
        this.ip = "IP1";
        this.campaign = this.campaigns[0];

        this.setFileStructure(this.ip, this.campaign);

        this.render();
        
        await this.fileStructure;
    }

    refresh() {
        this.setFileStructure(this.ip, this.campaign);
    }

    /**
     * @param {string} ip
     * @param {string} campaign
     */
    setFileStructure(ip, campaign) {
        this.fileStructure = (async () => {
            try {
                return await this.gitlab.listFiles(`${campaign}/${ip}`);
            }
            catch (error) {
                if (error instanceof NoPathExistsError) {
                    return { files: [NO_FILES_TEXT], folders: new Map() };
                }
                else {
                    throw error;
                }
            }
        })()
    }

    async onDeleteButtonPressed(filePath, isFolder, markAsPending) {
        try {
            if (!confirm(`Are you sure you want to delete the file ${filePath}?`)) return;

            markAsPending();

            if (isFolder) {
                await this.gitlab.deleteFolder(filePath);
            } else {
                await this.gitlab.deleteFile(filePath);
            }
            this.refresh();

            if (this.openFile == filePath) {
                this.dispatchEvent(new CustomEvent("open-file", {
                    detail: null
                }));

                this.openFile = null;
            }
        }
        finally {
            this.myContextMenu = null;
            this.render();
        }
    }

    async onRenameButtonPressed(filePath, isFolder, markAsPending) {
        try {
            if (!this.isCommitted) {
                alert("Cannot rename a file without committing the current changes");
                return;
            }

            const newName = prompt(`What do you want to rename ${filePath.split("/").slice(2).join('/')} to? (including sub-folder path)`);
            if (newName == null) return;

            if (newName.includes(" ")) {
                alert("Invalid name, paths cannot contain spaces");
                return;
            }

            markAsPending();

            if (isFolder) {
                await this.gitlab.renameFolder(filePath, newName);
            } else {
                await this.gitlab.renameFile(filePath, newName);
            }
            this.refresh();

            if (this.openFile == filePath) {
                const fullNewName = `${this.campaign}/${this.ip}/${newName}`;

                this.dispatchEvent(new CustomEvent("open-file", {
                    detail: fullNewName
                }));

                this.openFile = fullNewName;
            }
        }
        finally {
            this.myContextMenu = null;
            this.render();
        }
    }

    /**
     * @param {MouseEvent} event
     * @param {string} filePath This is the full file path to the file.
     * @param {boolean} isFolder
     */
    onContextMenu(event, filePath, isFolder) {
        this.myContextMenu = wire()`
            <context-menu 
                x=${event.clientX}
                y=${event.clientY}
                buttons=${[
                {
                    name: "Delete",
                    pendingMessage: "Deleting ...",
                    onActivate: (markAsPending) => this.onDeleteButtonPressed(filePath, isFolder, markAsPending)
                },
                {
                    name: "Rename",
                    pendingMessage: "Renaming ...",
                    onActivate: (markAsPending) => this.onRenameButtonPressed(filePath, isFolder, markAsPending)
                },
            ]}
            ></context-menu>
        `
        this.render();

        event.preventDefault();
    }

    /**
     * @param {string} source
     * @param {string} ip
     * @param {string} campaign
     * @param {string[]} files
     */
    async tryCopyFolder(source, ip, campaign, files = []) {
        if (!confirm(`Are you sure you want to copy files from the campaign "${campaign}" and interaction point "${ip}"?`)) {
            return;
        }

        const fromFolder = campaign + "/" + ip;
        const toFolder = source;

        let toFolderContents
        let fromFolderContents

        try {
            toFolderContents = (await this.gitlab.listFiles(toFolder, true, false)).map(x => getRelativePath(x, fromFolder));
        } catch (error) {
            if (error instanceof NoPathExistsError) toFolderContents = []
            else throw error
        }
        try {
            fromFolderContents = (await this.gitlab.listFiles(fromFolder, true, false)).map(x => getRelativePath(x, fromFolder));
            const commonFileNames = fromFolderContents.filter(x => toFolderContents.includes(x));
            if (commonFileNames.length != 0) {
                alert(`Note:\n"${commonFileNames.join(", ")}"\nare in common with the source and destination folders, and will not be copied.`)
            }
            await this.gitlab.copyFilesFromFolder(
                fromFolder,
                toFolder, // remove the end slash from the folder name
                files
            )
        }
        catch (error) {
            if (error instanceof NoPathExistsError) {
                alert(`The campaign "${campaign}" and interaction point "${ip}" has no files.`);
                return;
            }
            else throw error;
        }
    }

    /**
     * @param {{ files: string[]; folders: Map<string, any>, isFolderOpen?: boolean }} fileStructure
     * @param {string} ip
     * @param {string} campaign
     */
    getFileUI(fileStructure, ip, campaign) {
        /**
         * @param {{ files: string[]; folders: Map<string, any>, isFolderOpen?: boolean }} _structure
         */
        const getElementFromStructure = (_structure, prefix = "") => {
            return wire(fileStructure, prefix)`
                <div>
                    ${_structure.files.map(fileName => {
                const fullFilePath = joinFilePaths(prefix, fileName);
                const isOpenFile = fullFilePath == this.openFile;

                return wire()`<div
                            onclick=${() => {
                                if(fileName == NO_FILES_TEXT) return;
                                this.onFileClick(fullFilePath);
                                this.render();
                            }}
                            oncontextmenu=${event => {
                                if(fileName == NO_FILES_TEXT) return; 
                                this.onContextMenu(event, fullFilePath, false);
                            }}
                            class="${isOpenFile?"item-open":""} item ${fileName == NO_FILES_TEXT?"no-files-item":""}">
                                ${fileName}</div>`

            })}
                    ${Array.from(_structure.folders.entries()).map((folderParts) => {
                const [folderName, folderContent] = folderParts;
                const isFolderOpen = _structure.isFolderOpen;

                return wire(folderParts)`
                            <div onclick=${() => { _structure.isFolderOpen = !_structure.isFolderOpen; this.render() }} class="item folder">
                                <folder-triangle open=${isFolderOpen}></folder-triangle>
                                <span class="folder-name">${folderName}</span>
                            </div>
                            <span style="display:block" class="folder-content">
                                ${
                    isFolderOpen ? getElementFromStructure(folderContent, joinFilePaths(prefix, folderName)) : undefined
                    }
                            </span>
                        `
            })}
                    <div onclick=${() => this.clickNewFile(prefix)} class="item" style="font-weight: bold">
                        <span style="font-size: 20px; vertical-align: middle; padding: 0px 0px 0px 0px;">
                            +
                        </span>
                        <span>
                            New file(s)
                        </span>
                    </div>
                </div>
            `
        }

        return getElementFromStructure(fileStructure, joinFilePaths(campaign, ip));
    }

    /**
     * @param {string} [containingFolder]
     */
    clickNewFile(containingFolder) {
        this.createFileWindow = wire()`
            <create-file-window
                gitlab=${this.gitlab}
                campaigns=${(async () => [...await this.campaigns]/*we need to deep copy here to prevent wire moving elements*/)()}
                onsubmit=${async event => {
                try {
                    await this.tryCopyFolder(containingFolder, event.detail.ip, event.detail.campaign, event.detail.filePaths);
                    this.refresh();
                }
                finally {
                    this.createFileWindow = undefined;
                    this.render();
                }
            }}
                oncancel=${
            () => {
                this.createFileWindow = undefined;
                this.render();
            }
            }
                oncreate-empty=${async event => {
                try {
                    await this.gitlab.createFile(joinFilePaths(containingFolder, event.detail));
                    this.refresh();
                }
                catch (error) {
                    if (error instanceof FileAlreadyExistsError) {
                        alert(`Cannot create the empty file ${event.detail}, it already exists`);
                        return;
                    }
                    else {
                        throw error;
                    }
                }
                finally {
                    this.createFileWindow = undefined;
                    this.render();
                }
            }}
            />`

        this.render();
    }

    /**
     * @param {string} fullFileName
     */
    onFileClick(fullFileName) {
        if (!this.isCommitted) {
            if (confirm(`Changes not committed. Are you sure you want to open ${fullFileName}? All current changes will be discarded.`)) {
                this.dispatchEvent(new CustomEvent('open-file', {
                    detail: fullFileName,
                }))
            }
            else {
                return;
            }
        }
        else {
            this.dispatchEvent(new CustomEvent('open-file', {
                detail: fullFileName,
            }))
        }

        this.openFile = fullFileName;
    }

    set selection(newValue) {
        if (this.ip != newValue.ip || this.campaign != newValue.campaign) {
            this.setFileStructure(newValue.ip, newValue.campaign);
        }

        this.ip = newValue.ip;
        this.campaign = newValue.campaign;

        this.render();
    }

    render() {
        hyper(this.root)`
        <style>
            ${styling}
        </style>
        <ip-campaign-selectors name="selection" allCampaigns=${this.campaigns} onchange=${this}>
        </ip-campaign-selectors>
        <hr />
        <div id="file-browser">
            ${(async () =>
                this.getFileUI(await this.fileStructure, this.ip, this.campaign)
            )()}
        </div>
        ${this.myContextMenu}
        ${this.createFileWindow}
        `
    }
}
customElements.define('file-browser', FileBrowser);