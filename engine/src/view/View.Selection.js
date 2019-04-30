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
    constructor () {
        super();

        this._layer = new this.paper.Layer();

        this.paper.selection = new this.paper.Selection({
            items: [],
            layer: this._layer,
        });
    }

    get layer () {
        return this._layer;
    }

    render () {
        var project = this.model.project;

        this.paper.selection.clear();
        this._getPaperItemsOfSelectedObjects().forEach(view => {
            this.paper.selection.selectItem(view);
        });

        this.paper.selection._render();

        /*this.paper.selection = new this.paper.Selection({
            transformation: {
                x: this.model.transformation.x,
                y: this.model.transformation.y,
                scaleX: this.model.transformation.scaleX,
                scaleY: this.model.transformation.scaleY,
                rotation: this.model.transformation.rotation,
            },
            items: this._getViewsOfSelectedObjects(),
            layer: this._layer,
        });*/
    }

    /**
     *
     */
    applyChanges () {
        this.model.clear();
        this.paper.selection.items.forEach(item => {
            console.log(item)
            if(!item.data.wickUUID) {
                console.warn('paper.selection had a non-wick object selected');
            } else {
                this.model.select(Wick.ObjectCache.getObjectByUUID(item.data.wickUUID))
            }
        });
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
}
