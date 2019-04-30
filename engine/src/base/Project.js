/*
 * Copyright 2018 WICKLETS LLC
 *
 * This file is part of Wick Engine.
 *
 * Wick Engine is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Wick Engine is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Wick Engine.  If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * Class representing a Wick Project.
 */
Wick.Project = class extends Wick.Base {
    /**
     * Create a project.
     * @param {string} name - Project name. Default "My Project".
     * @param {number} width - Project width in pixels. Default 720.
     * @param {number} height - Project height in pixels. Default 405.
     * @param {number} framerate - Project framerate in frames-per-second. Default 12.
     * @param {string} backgroundColor - Project background color in hex. Default #ffffff.
     */
    constructor (args) {
        if(!args) args = {};
        super(args);

        this.project = this;

        this.name = args.name || 'My Project';
        this.width = args.width || 720;
        this.height = args.height || 405;
        this.framerate = args.framerate || 12;
        this.backgroundColor = args.backgroundColor || '#ffffff';

        this.pan = {x: 0, y: 0};
        this.zoom = 1.0;

        this.onionSkinEnabled = false;
        this.onionSkinSeekBackwards = 1;
        this.onionSkinSeekForwards = 1;

        this.selection = new Wick.Selection();
        this.history = new Wick.History();
        this.clipboard = new Wick.Clipboard();

        this.root = new Wick.Clip();

        this.focus = this.root;

        this._mousePosition = {x:0, y:0};
        this._isMouseDown = false;

        this._keysDown = [];
        this._keysLastDown = [];
        this._currentKey = null;

        this._tickIntervalID = null;

        this.history.pushState();
    }

    deserialize (data) {
        super.deserialize(data);

        this.name = data.name;
        this.width = data.width;
        this.height = data.height;
        this.framerate = data.framerate;
        this.backgroundColor = data.backgroundColor;

        this.pan = {
            x: data.pan.x,
            y: data.pan.y
        };
        this.zoom = data.zoom;

        this.onionSkinEnabled = data.onionSkinEnabled;
        this.onionSkinSeekForwards = data.onionSkinSeekForwards;
        this.onionSkinSeekBackwards = data.onionSkinSeekBackwards;

        this._focus = data.focus;
    }

    serialize (args) {
        var data = super.serialize(args);

        data.name = this.name;
        data.width = this.width;
        data.height = this.height;
        data.backgroundColor = this.backgroundColor;
        data.framerate = this.framerate;

        data.zoom = this.zoom;
        data.pan = {x:this.pan.x, y:this.pan.y};

        data.onionSkinEnabled = this.onionSkinEnabled
        data.onionSkinSeekForwards = this.onionSkinSeekForwards;
        data.onionSkinSeekBackwards = this.onionSkinSeekBackwards;

        data.focus = this.focus.uuid;

        return data;
    }

    /**
     * String representation of class name: "Project"
     * @return {string}
     */
    get classname () {
        return 'Project';
    }

    /**
     * The timeline of the active clip.
     * @type {Wick.Timeline}
     */
    get activeTimeline () {
        return this.focus.timeline;
    }

    /**
     * The active layer of the active timeline.
     * @type {Wick.Layer}
     */
    get activeLayer () {
        return this.activeTimeline.activeLayer;
    }

    /**
     * The active frame of the active layer.
     * @type {Wick.Frame}
     */
    get activeFrame () {
        return this.activeLayer.activeFrame;
    }

    /**
     * The active frames of the active timeline.
     * @type {Wick.Frame[]}
     */
    get activeFrames () {
        return this.focus.timeline.activeFrames;
    }

    /**
     * The active frame of the active layer.
     * @param {boolean} recursive - If set to true, will return all child frames as well.
     */
    getAllFrames (recursive) {
        return this.root.timeline.getAllFrames(recursive);
    }

    /**
     * The project selection.
     * @type {Wick.Selection}
     */
    get selection () {
        return this.children.find(child => {
            return child instanceof Wick.Selection;
        });
    }

    set selection (selection) {
        if(this.selection) {
            this.removeChild(this.selection);
        }
        this.addChild(selection);
    }

    /**
     * An instance of the Wick.History utility class for undo/redo functionality.
     * @type {Wick.History}
     */
    get history () {
        return this._history;
    }

    set history (history) {
        this._history = history;
    }

    /**
     *
     */
    undo () {
        this.selection.clear();
        var success = this.project.history.popState();
        this.view.render();

        return success;
    }

    /**
     *
     */
    redo () {
        this.selection.clear();
        var success = this.project.history.recoverState();
        this.view.render();

        return success;
    }

    /**
     * The assets belonging to the project.
     * @type {Wick.Asset[]}
     */
    get assets () {
        return this.children.filter(child => {
            return child instanceof Wick.Asset;
        });
    }

    /**
     * Adds an asset to the project.
     * @param {Wick.Asset} asset - The asset to add to the project.
     */
    addAsset (asset) {
        this.addChild(asset);
    }

    /**
     * Removes an asset from the project. Also removes all instances of that asset from the project.
     * @param {Wick.Asset} asset - The asset to remove from the project.
     */
    removeAsset (asset) {
        asset.removeAllInstances();
        this.removeChild(asset);
    }

    /**
     * Retrieve an asset from the project by its UUID.
     * @param {string} uuid - The UUID of the asset to get.
     * @return {Wick.Asset} The asset
     */
    getAssetByUUID (uuid) {
        return this.getAssets().find(asset => {
            return asset.uuid === uuid;
        });
    }

    /**
     * Retrieve an asset from the project by its name.
     * @param {string} name - The name of the asset to get.
     * @return {Wick.Asset} The asset
     */
    getAssetByName (name) {
        return this.getAssets().find(asset => {
            return asset.name === name;
        });
    }

    /**
     * The assets belonging to the project.
     * @param {string} type - Optional, filter assets by type ("Sound"/"Image"/"Clip"/"Button")
     * @returns {Wick.Asset[]} The assets in the project
     */
    getAssets (type) {
        if(!type) {
            return this.assets;
        } else {
            return this.assets.filter(asset => {
                return asset instanceof Wick[type+'Asset'];
            });
        }
    }

    /**
     * The root clip.
     * @type {Wick.Clip}
     */
    get root () {
        var root = this.children.find(child => {
            return child instanceof Wick.Clip;
        });

        // Force the root clip to have the identifier "Project".
        if(root) root.identifier = 'Project';

        return root;
    }

    set root (root) {
        if(this.root) {
            this.removeChild(this.root);
        }
        this.addChild(root);
    }

    /**
     * The currently focused clip.
     * @type {Wick.Clip}
     */
    get focus () {
        return this._focus && Wick.ObjectCache.getObjectByUUID(this._focus);
    }

    set focus (focus) {
        var focusChanged = this.focus !== null && this.focus !== focus;

        this._focus = focus.uuid;

        // Reset timelines of subclips of the newly focused clip
        focus.timeline.clips.forEach(subclip => {
            subclip.timeline.playheadPosition = 1;
        });

        // Always reset pan and zoom and clear selection on focus change
        if(focusChanged) {
            this.recenter();
            this.selection.clear();
        }
    }

    /**
     * The position of the mouse
     * @type {object}
     */
    get mousePosition () {
        return this._mousePosition;
    }

    set mousePosition (mousePosition) {
        this._mousePosition = mousePosition;
    }

    /**
     * Determine if the mouse is down.
     * @type {boolean}
     */
    get isMouseDown () {
        return this._isMouseDown;
    }

    set isMouseDown (isMouseDown) {
        this._isMouseDown = isMouseDown;
    }

    /**
     * The keys that are currenty held down.
     * @type {string[]}
     */
    get keysDown () {
        return this._keysDown;
    }

    set keysDown (keysDown) {
        this._keysDown = keysDown;
    }

    /**
     * The keys were just pressed (i.e., are currently held down, but were not last tick).
     * @type {string[]}
     */
    get keysJustPressed () {
        // keys that are in _keysDown, but not in _keysLastDown
        return this._keysDown.filter(key => {
            return this._keysLastDown.indexOf(key) === -1;
        });
    }

    /**
     * The keys that were just released (i.e. were down last tick back are no longer down.)
     * @return {string[]}
     */
    get keysJustReleased () {
        return this._keysLastDown.filter(key => {
            return this._keysDown.indexOf(key) === -1;
        });
    }

    /**
     * Check if a key is being pressed.
     * @param {string} key - The name of the key to check
     */
    isKeyDown (key) {
        return this.keysDown.indexOf(key) !== -1;
    }

    /**
     * Check if a key was just pressed.
     * @param {string} key - The name of the key to check
     */
    isKeyJustPressed (key) {
        return this.keysJustPressed.indexOf(key) !== -1;
    }

    /**
     * The key to be used in the global 'key' variable in the scripting API. Update currentKey before you run any key script.
     * @type {string[]}
     */
    get currentKey () {
        return this._currentKey;
    }

    set currentKey (currentKey) {
        this._currentKey = currentKey;
    }

    /**
     * Creates an asset from a File object and adds that asset to the project.
     * @param {File} file File object to be read and converted into an asset.
     * @param {function} callback Function with the created Wick Asset. Can be passed undefined on improper file input.
     */
    importFile (file, callback) {
        var self = this;

        let imageTypes = Wick.ImageAsset.getValidMIMETypes();
        let soundTypes = Wick.SoundAsset.getValidMIMETypes();

        let asset = undefined;
        if (imageTypes.indexOf(file.type) !== -1) {
            asset = new Wick.ImageAsset();
        } else if (soundTypes.indexOf(file.type) !== -1) {
            asset = new Wick.SoundAsset();
        }

        if (asset === undefined) {
            console.warn('importFile(): Could not import file ' + file.name + ', ' + file.type + ' is not supported.');
            console.warn('supported image file types:');
            console.log(imageTypes)
            console.warn('supported sound file types:');
            console.log(soundTypes)
            callback(null);
            return;
        }

        let reader = new FileReader();

        reader.onload = function () {
            let dataURL = reader.result;
            asset.src = dataURL;
            asset.filename = file.name;
            asset.name = file.name;
            self.addAsset(asset);
            callback(asset);
        }

        reader.readAsDataURL(file);
    }

    /**
     * Deletes all objects in the selection.
     */
    deleteSelectedObjects () {
        var objects = this.selection.getSelectedObjects();
        this.selection.clear();
        objects.forEach(object => {
            object.remove && object.remove();
        });
    }

    /**
     * Copy the contents of the selection to the clipboard.
     * @returns {boolean} True if there was something to copy, false otherwise
     */
    copySelectionToClipboard () {
        var objects = this.selection.getSelectedObjects();
        if(objects.length === 0) {
            return false;
        } else {
            this.clipboard.copyObjectsToClipboard(objects);
            return true;
        }
    }

    /**
     * Paste the contents of the clipboard into the project.
     * @returns {boolean} True if there was something to paste in the clipboard, false otherwise.
     */
    pasteClipboardContents () {
        return this.clipboard.pasteObjectsFromClipboard(this);
    }

    /**
     * Selects all objects that are visible on the canvas (excluding locked layers and onion skinned objects)
     */
    selectAll () {
        this.selection.clear();
        this.activeFrames.forEach(frame => {
            frame.paths.forEach(path => {
                this.selection.select(path);
            });
            frame.clips.forEach(clip => {
                this.selection.select(clip);
            });
        });
    }

    /**
     * Adds an image path to the active frame using a given asset as its image src.
     * @param {Wick.Asset} asset - the asset to use for the image src
     * @param {number} x - the x position to create the image path at
     * @param {number} y - the y position to create the image path at
     * @param {function} callback - the function to call after the path is created.
     */
    createImagePathFromAsset (asset, x, y, callback) {
        asset.createInstance(path => {
            // TODO set position of path
            this.activeFrame.addPath(path);
            callback(path);
        });
    }

    /**
     * Creates a symbol from the objects currently selected.
     * @param {string} identifier - the identifier to give the new symbol
     * @param {string} type - "Clip" or "Button"
     */
    createClipFromSelection (args) {
        if(!args) {
            args = {};
        };

        if(args.type !== 'Clip' && args.type !== 'Button') {
            console.error('createClipFromSelection: invalid type: ' + args.type);
            return;
        }

        var transformation = new Wick.Transformation();
        transformation.x = this.selection.center.x;
        transformation.y = this.selection.center.y;
        var clip = new Wick[args.type]({
            identifier: args.identifier,
            objects: this.selection.getSelectedObjects('Canvas'),
            transformation: transformation
        });
        this.activeFrame.addClip(clip);
        // TODO add to asset library
        this.selection.clear();
        this.selection.select(clip);
    }

    /**
     * Breaks selected clips into their children clips and paths.
     */
    breakApartSelection () {
        var leftovers = [];
        var clips = this.selection.getSelectedObjects('Clip');

        this.selection.clear();

        clips.forEach(clip => {
            leftovers = leftovers.concat(clip.breakApart());
        });

        leftovers.forEach(object => {
            this.selection.select(object);
        });
    }

    /**
     * Sets the project focus to the timeline of the selected clip.
     */
    focusTimelineOfSelectedClip () {
        if(this.selection.getSelectedObject() instanceof Wick.Clip) {
            this.focus = this.selection.getSelectedObject();
        }
    }

    /**
     * Sets the project focus to the parent timeline of the currently focused clip.
     */
    focusTimelineOfParentClip () {
        if(!this.focus.isRoot) {
            this.focus = this.focus.parentClip;
        }
    }

    /**
     * Plays the sound in the asset library with the given name.
     * @param {string} assetName - Name of the sound asset to play
     */
    playSound (assetName) {
        var asset = this.getAssetByName(assetName);
        if(!asset) {
            console.warn('playSound(): No asset with name: "' + assetName + '"');
        } else if (!(asset instanceof Wick.SoundAsset)) {
            console.warn('playSound(): Asset is not a sound: "' + assetName + '"');
        } else {
            asset.play();
        }
    }

    /**
     * Stops all sounds playing from frames and sounds played using playSound().
     */
    stopAllSounds () {
        // TODO: Stop all sounds started with Wick.Project.playSound();

        this.getAllFrames().forEach(frame => {
            frame.stopSound();
        });
    }

    /**
     * Ticks the project.
     */
    tick () {
        this.view.processInput();

        var error = this.focus.tick();

        this.view.render();
        this.activeTimeline.guiElement.numberLine.playhead.build();

        this._keysLastDown = [].concat(this._keysDown);

        return error;
    }

    /**
     * Start playing the project.
     * Arguments: onError: Called when a script error occurs during a tick.
     *            onBeforeTick: Called before every tick
     *            onAfterTick: Called after every tick
     * @param {object} args - Optional arguments
     */
    play (args) {
        if(!args) args = {};
        if(!args.onError) args.onError = () => {};
        if(!args.onBeforeTick) args.onBeforeTick = () => {};
        if(!args.onAfterTick) args.onAfterTick = () => {};

        if(this._tickIntervalID) {
            this.stop();
        }

        this.history.saveSnapshot('state-before-play');

        this.selection.clear();

        this.view.renderMode = 'webgl';

        // Start tick loop
        this._tickIntervalID = setInterval(() => {
            args.onBeforeTick();

            var error = this.tick();
            if(error) {
                args.onError(error);
                this.stop();
                return;
            }

            args.onAfterTick();
        }, 1000 / this.framerate);
    }

    /**
     * Stop playing the project.
     */
    stop () {
        this.stopAllSounds();

        this.view.renderMode = 'svg';

        clearInterval(this._tickIntervalID);
        this._tickIntervalID = null;

        this.history.loadSnapshot('state-before-play');
        this.view.render();
    }

    /**
     * Resets zoom and pan.
     */
    recenter () {
        this.pan = {x: 0, y: 0};
        this.zoom = 1;
    }

    /**
     * Adds an object to the project.
     * @param {Wick.Base} object
     * @return {boolean} returns true if successful and false otherwise.
     */
    addObject (object) {
        if (object instanceof Wick.Path) {
            this.activeFrame.addPath(object);
        } else if (object instanceof Wick.Clip) {
            this.activeFrame.addClip(object);
        } else if (object instanceof Wick.Frame) {
            this.activeLayer.addFrame(object);
        } else if (object instanceof Wick.Asset) {
            this.addAsset(object);
        } else if (object instanceof Wick.Layer) {
            this.activeTimeline.addLayer(object);
        } else if (object instanceof Wick.Tween) {
            this.activeFrame.addTween(object);
        } else {
            return false;
        }
        return true;
    }

    /**
     * Create a sequence of images from every frame in the project.
     * @param {object} args - Options for generating the image sequence
     * @param {function} done - Function to call when the images are all loaded.
     */
    generateImageSequence (args, callback) {
        var oldCanvasContainer = this.canvasContainer;

        // Put the project canvas inside a div that's the same size as the project so the frames render at the correct resolution.
        let container = window.document.createElement('div');
        container.style.width = (this.width/window.devicePixelRatio)+'px';
        container.style.height = (this.height/window.devicePixelRatio)+'px';
        window.document.body.appendChild(container);
        this.view.canvasContainer = container;
        this.view.resize();

        // Set the initial state of the project.
        this.focus = this.root;
        this.focus.timeline.playheadPosition = 1;
        this.onionSkinEnabled = false;
        this.zoom = 1 / window.devicePixelRatio;
        this.pan = {x: 0, y: 0};

        // We need full control over when paper.js renders, if we leave autoUpdate on, it's possible to lose frames if paper.js doesnt automatically render as fast as we are generating the images.
        // (See paper.js docs for info about autoUpdate)
        paper.view.autoUpdate = false;

        var frameImages = [];
        var renderFrame = () => {
            var frameImage = new Image();

            frameImage.onload = () => {
                frameImages.push(frameImage);
                if(this.focus.timeline.playheadPosition >= this.focus.timeline.length) {
                    // reset autoUpdate back to normal
                    paper.view.autoUpdate = true;

                    // reset canvas container back to normal
                    this.view.canvasContainer = oldCanvasContainer;
                    this.view.resize();

                    callback(frameImages);
                } else {
                    this.focus.timeline.playheadPosition++;
                    renderFrame();
                }
            }

            this.view.render();
            paper.view.update();
            frameImage.src = this.view.canvas.toDataURL();
        }

        renderFrame();
    }

    /**
     * Create a sequence of images from every frame in the project.
     * Format:
     *   start: The amount of time in milliseconds to cut from the beginning of the sound.
     *   end: The amount of time that the sound will play before stopping.
     *   uuid: The UUID of the asset that the sound corresponds to.
     * @param {object} args - Options for generating the audio sequence
     * @returns {object[]} - Array of objects containing info about the sounds in the project.
     */
    generateAudioSequence (args) {
        return this.root.timeline.frames.filter(frame => {
            return frame.sound !== null;
        }).map(frame => {
            return {
                start: 0,
                end: frame.soundStartOffsetMS,
                uuid: frame.sound.uuid,
            }
        });
    }
}
