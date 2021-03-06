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

Wick.GUIElement.Project = class extends Wick.GUIElement {
    /**
     *
     */
    constructor (model) {
        super(model);

        // Build canvas + canvas container
        this._canvas = document.createElement('canvas');
        this._canvas.style.width = '100%';
        this._canvas.style.height = '100%';
        this.paper.setup(this._canvas);

        this._canvasContainer = document.createElement('div');
        this._canvasContainer.appendChild(this._canvas);

        // Use this GUIElement as the root container that contains all other elements in the GUI
        this.paper.project.activeLayer.addChild(this.item);

        // Half pixel nudge for sharper 1px strokes
        // https://stackoverflow.com/questions/7530593/html5-canvas-and-line-width/7531540#7531540
        //this.paper.view.translate(0.5, 0.5);
        // (disabled for now, wasn't actually helping blurriness)

        this._attachMouseEvents();

        // Re-render canvas on changes that should happen very fast
        this.on('projectSoftModified', (e) => {
            this.model.view.render();
        });
    }

    /**
     *
     */
    get canvasContainer () {
        return this._canvasContainer;
    }

    set canvasContainer (canvasContainer) {
        this._canvasContainer = canvasContainer;

        if(this._canvas !== this._canvasContainer.children[0]) {
            this._canvasContainer.innerHTML = '';
            this._canvasContainer.appendChild(this._canvas);
        }
    }

    /**
     *
     */
    resize () {
        var containerWidth = this.canvasContainer.offsetWidth;
        var containerHeight = this.canvasContainer.offsetHeight;

        this.paper.view.viewSize.width = containerWidth;
        this.paper.view.viewSize.height = containerHeight;
    }

    /**
     *
     */
    build () {
        super.build();

        this.resize();
        this._hoverTarget = null;

        var timeline = this.model.focus.timeline;
        timeline.guiElement.build();
        this.item.addChild(timeline.guiElement.item);
    }

    /**
     *
     */
    updateMousePosition (e) {
        // This fixes the NaN errors on touch devices:
        var x = 0;
        var y = 0;
        if(e.touches) {
            var touch = e.touches[0];
            x = touch ? touch.clientX : null;
            y = touch ? touch.clientY : null;
        } else {
            x = e.clientX;
            y = e.clientY;
        }

        if(x !== null && y !== null && e.target && e.target.getBoundingClientRect) {
            var bounds = e.target.getBoundingClientRect();
            this.mousePosition = {
                x: x - bounds.left,
                y: y - bounds.top,
            };
        }
    }

    _attachMouseEvents () {
        this.paper.view.onMouseMove = (e) => {
            // don't fire mouseMove functions if we're dragging
            if(e.event.buttons) return;

            paper.view.element.style.cursor = 'default';

            this.updateMousePosition(e.event);

            var guiElement = this._getGUIElementAtPosition(e.point);
            if(guiElement && guiElement.cursor) {
                paper.view.element.style.cursor = guiElement.cursor;
            }

            if(this._hoverTarget !== guiElement && this._hoverTarget) {
                this._hoverTarget.handleMouseLeave(e);
            }
            this._hoverTarget = guiElement;
            if(this._hoverTarget) {
                this._hoverTarget.handleMouseOver(e);
            }
        }

        // Disable right click menu
        $(this.paper.view.element).on('contextmenu', (e) => { return false; });

        this.paper.view.onMouseDown = (e) => {
            if(e.touches) {
                this.paper.view.onMouseMove(e);
            }

            if(e.event.button === 2) {
              this.fire('rightClick', {});
            }

            var guiElement = this._getGUIElementAtPosition(e.point);

            if(guiElement) {
                guiElement.handleMouseDown(e);
            }
        }

        this.paper.view.onMouseUp = (e) => {
            if(this._hoverTarget) {
                this._hoverTarget.handleMouseUp(e);
            }
        }

        this.paper.view.onMouseLeave = (e) => {
            if(this._hoverTarget) {
                this._hoverTarget.handleMouseLeave(e);
            }
            this._hoverTarget = null;
        };
    }

    _getGUIElementAtPosition (point) {
        var hitResult = this.paper.project.hitTest(point);
        if(!hitResult || !hitResult.item) return;

        var guiElement = this._getGUIElementOfItem(hitResult.item);
        return guiElement;
    }

    _getGUIElementOfItem (item) {
        if(item === null || item === undefined) {
            return null;
        }

        if(!(item instanceof paper.Group)) {
            return this._getGUIElementOfItem(item.parent);
        }

        var guiElement = item.data.guiElement;
        if(!guiElement || !(guiElement instanceof Wick.GUIElement.Clickable)) {
            return this._getGUIElementOfItem(item.parent);
        } else {
            return guiElement;
        }
    }
}
