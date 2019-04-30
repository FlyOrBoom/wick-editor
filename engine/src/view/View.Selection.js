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

Wick.View.Selection = class extends Wick.View {
    /**
     * Create a Selection View instance.
     */
    constructor () {
        super();

        this._layer = new this.paper.Layer();

        this.paper.selection = new this.paper.Selection({
            layer: this._layer,
        });
    }

    /**
     * The layer that will be used for the selection GUI.
     */
    get layer () {
        return this._layer;
    }

    /**
     *
     */
    render () {
        var selectedItems = this._getPaperItemsOfSelectedObjects();

        if(this.model.x === null) {
            var bounds = this._boundsOfItems(selectedItems);
            this.model.x = bounds.topLeft.x;
            this.model.y = bounds.topLeft.y;
            this.model.width = bounds.width;
            this.model.height = bounds.height;
            this.model.scaleX = 1;
            this.model.scaleY = 1;
            this.model.rotation = 0;
        }

        this.paper.selection.clear();
        selectedItems.forEach(view => {
            this.paper.selection.selectItem(view);
        });

        this.paper.selection._render({
            x: this.model.x,
            y: this.model.y,
            width: this.model.width,
            height: this.model.height,
        });
    }

    applyChanges () {
        this.model.clear();
        this.paper.selection.items.forEach(item => {
            this.model.select(Wick.ObjectCache.getObjectByUUID(item.data.wickUUID));
        });
    }

    /**
     *
     */
    calcBoundsOfSelectedItems () {
        var selectedItems = this._getPaperItemsOfSelectedObjects();
        return this._boundsOfItems(selectedItems);
    }

    _getPaperItemsOfSelectedObjects () {
        var project = this.model.project;

        var items = [];
        items = items.concat(project.selection.getSelectedObjects('Path').map(path => {
            return path.view.item;
        }));
        items = items.concat(project.selection.getSelectedObjects('Clip').map(clip => {
            return clip.view.group;
        }));
        return items;
    }

    _boundsOfItems (items) {
        if(items.length === 0)
            return new paper.Rectangle();

        var bounds = null;
        items.forEach(item => {
            bounds = bounds ? bounds.unite(item.bounds) : item.bounds;
        });

        return bounds;
    }
}
