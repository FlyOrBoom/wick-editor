/*
 * Copyright 2019 WICKLETS LLC
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

 // NOTE:
 // Why can't we only export JSON on serialize, and remove the idea of a View for a path?
 // In this way there will never be issues with "is the JSON synced with the paper.Path instance?" questions
 // This gets annoying sometimes (see what we have to do in the getters for path attributes?)
 // Please try this later -zj

 // NOTE 2:
 // I think originally the idea was that exportJSON would be called less if we cached the json.

/**
 * Represents a Wick Path.
 */
Wick.Path = class extends Wick.Base {
    /**
     * Create a Wick Path.
     * @param {array} json - Path data exported from paper.js using exportJSON({asString:false}).
     */
    constructor (args) {
        if(!args) args = {};
        super(args);

        this._fontStyle = 'normal';
        this._fontWeight = 400;

        if(args.json) {
            this.json = args.json;
        } else {
            this.json = new paper.Path({insert:false}).exportJSON({asString:false});
        }
    }

    /**
     * Create a path containing an image from an ImageAsset.
     * @param {Wick.ImageAsset} asset - The asset from which the image src will be loaded from
     * @param {Function} callback - A function that will be called when the image is done loading.
     */
    static createImagePath (asset, callback) {
        var img = new Image();
        img.src = asset.src;
        img.onload = () => {
            var raster = new paper.Raster(img);
            raster.remove();
            var path = new Wick.Path({
                json: Wick.View.Path.exportJSON(raster),
            });
            callback(path);
        }
    }

    get classname () {
        return 'Path';
    }

    serialize (args) {
        var data = super.serialize(args);

        data.json = this.json;
        delete data.json[1].data;

        data.fontStyle = this._fontStyle;
        data.fontWeight = this._fontWeight;

        return data;
    }

    deserialize (data) {
        super.deserialize(data);
        this.json = data.json;
        this._fontStyle = data.fontStyle;
        this._fontWeight = data.fontWeight;
    }

    /**
     * The type of path that this path is. Can be 'path', 'text', or 'image'
     * @returns {string}
     */
    get pathType () {
        if(this.view.item instanceof paper.TextItem) {
            return 'text';
        } else if(this.view.item instanceof paper.Raster) {
            return 'image';
        } else {
            return 'path';
        }
    }

    /**
     * Path data exported from paper.js using exportJSON({asString:false}).
     * @type {object}
     */
    get json () {
        return this._json;
    }

    set json (json) {
        this._json = json;
        this.view.render();
    }

    /**
     * The bounding box of the path.
     * @type {object}
     */
    get bounds () {
        var paperBounds = this.view.item.bounds;
        return {
            top: paperBounds.top,
            bottom: paperBounds.bottom,
            left: paperBounds.left,
            right: paperBounds.right,
            width: paperBounds.width,
            height: paperBounds.height,
        };
    }

    /**
     * The position of the path.
     * @type {number}
     */
    get x () {
        return this.view.item.position.x;
    }

    set x (x) {
        this.view.item.position.x = x;
        this.json = this.view.exportJSON();
    }

    /**
     * The position of the path.
     * @type {number}
     */
    get y () {
        return this.view.item.position.y;
    }

    set y (y) {
        this.view.item.position.y = y;
        this.json = this.view.exportJSON();
    }

    /**
     * The fill color of the path.
     * @type {paper.Color}
     */
    get fillColor () {
        return this.view.item.fillColor || new paper.Color();
    }

    set fillColor (fillColor) {
        this.view.item.fillColor = fillColor;
        this.json = this.view.exportJSON();
    }

    /**
     * The stroke color of the path.
     * @type {paper.Color}
     */
    get strokeColor () {
        return this.view.item.strokeColor || new paper.Color();
    }

    set strokeColor (strokeColor) {
        this.view.item.strokeColor = strokeColor;
        this.json = this.view.exportJSON();
    }

    /**
     * The stroke width of the path.
     * @type {number}
     */
    get strokeWidth () {
        return this.view.item.strokeWidth;
    }

    set strokeWidth (strokeWidth) {
        this.view.item.strokeWidth = strokeWidth;
        this.json = this.view.exportJSON();
    }

    /**
     * The opacity of the path.
     * @type {number}
     */
    get opacity () {
        if(this.view.item.opacity === undefined || this.view.item.opacity === null) {
            return 1.0;
        }
        return this.view.item.opacity;
    }

    set opacity (opacity) {
        this.view.item.opacity = opacity;
        this.json = this.view.exportJSON();
    }

    /**
     * The font family of the path.
     * @type {string}
     */
    get fontFamily () {
        return this.view.item.fontFamily
    }

    set fontFamily (fontFamily) {
        this.view.item.fontFamily = fontFamily;
        this.fontWeight = 400;
        this.fontStyle = 'normal';
        this.json = this.view.exportJSON();
    }

    /**
     * The font size of the path.
     * @type {number}
     */
    get fontSize () {
        return this.view.item.fontSize;
    }

    set fontSize (fontSize) {
        this.view.item.fontSize = fontSize;
        this.view.item.leading = fontSize * 1.2;
        this.json = this.view.exportJSON();
    }

    /**
     * The font weight of the path.
     * @type {number}
     */
    get fontWeight () {
        return this._fontWeight;
    }

    set fontWeight (fontWeight) {
        if(typeof fontWeight === 'string') {
            console.error('fontWeight must be a number.');
            return;
        }
        this._fontWeight = fontWeight
    }

    /**
     * The font style of the path ('italic' or 'oblique').
     * @type {string}
     */
    get fontStyle () {
        return this._fontStyle;
    }

    set fontStyle (fontStyle) {
        this._fontStyle = fontStyle;
    }

    /**
     * Removes this path from its parent frame.
     */
    remove () {
        this.parentFrame.removePath(this);
    }
}
