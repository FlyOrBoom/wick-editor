paper.Selection = class {
    static get BOX_STROKE_WIDTH () {
        return 1;
    }

    static get BOX_STROKE_COLOR () {
        return 'rgba(100,150,255,1.0)';
    }

    static get HANDLE_RADIUS () {
        return 5;
    }

    static get HANDLE_STROKE_WIDTH () {
        return paper.Selection.BOX_STROKE_WIDTH;
    }

    static get HANDLE_STROKE_COLOR () {
        return paper.Selection.BOX_STROKE_COLOR;
    }

    static get HANDLE_FILL_COLOR () {
        return 'rgba(255,255,255,0.3)';
    }

    static get PIVOT_STROKE_WIDTH () {
        return paper.Selection.BOX_STROKE_WIDTH;
    }

    static get PIVOT_FILL_COLOR () {
        return 'rgba(0,0,0,0)';
    }

    static get PIVOT_STROKE_COLOR () {
        return 'rgba(0,0,0,1)';
    }

    static get PIVOT_RADIUS () {
        return paper.Selection.HANDLE_RADIUS;
    }

    static get ROTATION_HOTSPOT_RADIUS () {
        return 20;
    }

    static get ROTATION_HOTSPOT_FILLCOLOR () {
        return 'rgba(100,150,255,0.5)';

        // don't show hotspots:
        //return 'rgba(255,0,0,0.0001)';
    }

    /**
     * Create a new selection.
     * Arguments:
     *  - layer: the layer to add the selection GUI to
     * @param {object} args - Arguments for the selection.
     */
    constructor (args) {
        args = args || {};

        this.layer = args.layer || paper.project.activeLayer;
        this.items = [];
        this.box = new paper.Group();
        this.pivotPoint = new paper.Point();

        this.width = 0;
        this.height = 0;
        this.transform = {
            x: 0,
            y: 0,
            scaleX: 1.0,
            scaleY: 1.0,
            rotation: 0,
        };
        this.handleDragMode = 'scale';
        this.lockScalingToAspectRatio = false;
    }

    /**
     * The type of transformation to use while dragging handles. Can be 'scale' or 'rotation'.
     */
    get handleDragMode () {
        return this._handleDragMode;
    }

    set handleDragMode (handleDragMode) {
        if(handleDragMode === 'scale' || handleDragMode === 'rotation') {
            this._handleDragMode = handleDragMode;
        } else {
            console.error('Paper.Selection: Invalid handleDragMode: ' + handleDragMode);
            console.error('Valid handleDragModes: "scale", "rotation"')
        }
    }

    /**
     * Toggles if scaling will preserve aspect ratio.
     * @type {boolean}
     */
    get lockScalingToAspectRatio () {
        return this._lockScalingToAspectRatio;
    }

    set lockScalingToAspectRatio (lockScalingToAspectRatio) {
        this._lockScalingToAspectRatio = lockScalingToAspectRatio;
    }

    /**
     *
     */
    clear () {
        this.items = [];
    }

    /**
     * Check if an item is selected.
     * @param {Item} item - the item to check selection of
     */
    isItemSelected (item) {
        return this.items.indexOf(item) > -1;
    }

    /**
     * Select an item.
     * @param {Item} item - the item to select
     */
    selectItem (item) {
        if(!this.isItemSelected(item)) {
            this.items.push(item);
        }
    }

    /**
     * Deselect an item.
     * @param {Item} item - the item to deselect
     */
    deselectItem (item) {
        this.items = this.items.filter(seekItem => {
            return seekItem !== item;
        });
    }

    _render (args) {
        // Recalculate bounds, we need this to generate the new box GUI
        this._bounds = new paper.Rectangle({
            x: args.x,
            y: args.y,
            width: args.width,
            height: args.height,
        });
        //this._boundsOfItems(this.items);

        /*
        // Default pivot point is the center of all items.
        this.pivotPoint = this._bounds.center;

        if(this.items.length === 1) {
            var item = this.items[0];

            // Single item: Use the origin as the pivot point if its a group.
            if(item instanceof paper.Group || item instanceof paper.Raster) {
                this.pivotPoint = item.position;
            }

            // Single item: Use that item's transformations as the selection's transformations
            // TODO
        }
        */

        // Regen box GUI
        this.box.remove();
        this.box = this._generateBox();
    }

    _generateBox () {
        var box = new paper.Group({insert:false});

        // No items - don't even put anything in the box, we don't need to
        if(this.items.length === 0) return box;

        this.layer.addChild(box);

        box.addChild(this._generateBorder());
        if(this.items.length > 1) {
            box.addChildren(this._generatePathOutlines());
            box.addChildren(this._generateGroupOutlines());
        }
        box.addChild(this._generateRotationHotspot('topLeft'));
        box.addChild(this._generateRotationHotspot('topRight'));
        box.addChild(this._generateRotationHotspot('bottomLeft'));
        box.addChild(this._generateRotationHotspot('bottomRight'));
        box.addChild(this._generateScalingHandle('topLeft'));
        box.addChild(this._generateScalingHandle('topRight'));
        box.addChild(this._generateScalingHandle('bottomLeft'));
        box.addChild(this._generateScalingHandle('bottomRight'));
        box.addChild(this._generateScalingHandle('topCenter'));
        box.addChild(this._generateScalingHandle('bottomCenter'));
        box.addChild(this._generateScalingHandle('leftCenter'));
        box.addChild(this._generateScalingHandle('rightCenter'));
        box.addChild(this._generatePivotPointHandle());

        // Set a flag just so we don't accidentily treat these GUI elements as actual paths...
        box.children.forEach(child => {
            child.data.isSelectionBoxGUI = true;
        });

        box.applyMatrix = true;

        return box;
    }

    _generateBorder () {
        var border = new paper.Path.Rectangle({
            name: 'border',
            from: this._bounds.topLeft,
            to: this._bounds.bottomRight,
            strokeWidth: paper.Selection.BOX_STROKE_WIDTH,
            strokeColor: paper.Selection.BOX_STROKE_COLOR,
            insert: false,
        });
        border.data.isBorder = true;
        return border;
    }

    _generatePathOutlines () {
        return this.items.filter(item => {
            return item instanceof paper.Path ||
                   item instanceof paper.CompoundPath;
        }).map(item => {
            var itemForBounds = item.clone({insert:false});
            itemForBounds.matrix.set(new paper.Matrix());

            var outline = new paper.Path.Rectangle(itemForBounds.bounds);
            outline.fillColor = 'rgba(0,0,0,0)';
            outline.strokeColor = paper.Selection.BOX_STROKE_COLOR;
            outline.strokeWidth = paper.Selection.BOX_STROKE_WIDTH;
            outline.data.isBorder = true;
            return outline;
        });
    }

    _generateGroupOutlines () {
        return this.items.filter(item => {
            return item instanceof paper.Group ||
                   item instanceof paper.Raster;
        }).map(item => {
            var itemForBounds = item.clone({insert:false});
            itemForBounds.matrix.set(item.data.originalMatrix);

            var outline = new paper.Path.Rectangle(itemForBounds.bounds);
            outline.fillColor = 'rgba(0,0,0,0)';
            outline.strokeColor = paper.Selection.BOX_STROKE_COLOR;
            outline.strokeWidth = paper.Selection.BOX_STROKE_WIDTH;
            outline.data.isBorder = true;
            return outline;
        });
    }

    _generateScalingHandle (edge) {
        return this._generateHandle(
            edge,
            'scale',
            this._bounds[edge],
            paper.Selection.HANDLE_FILL_COLOR,
            paper.Selection.HANDLE_STROKE_COLOR,
        );
    }

    _generatePivotPointHandle () {
        return this._generateHandle(
            'pivot',
            'pivot',
            this.pivotPoint,
            paper.Selection.PIVOT_FILL_COLOR,
            paper.Selection.PIVOT_STROKE_COLOR,
        );
    }

    _generateHandle (name, type, center, fillColor, strokeColor) {
        var circle = new paper.Path.Circle({
            center: center,
            radius: paper.Selection.HANDLE_RADIUS / paper.view.zoom,
            strokeWidth: paper.Selection.HANDLE_STROKE_WIDTH / paper.view.zoom,
            strokeColor: strokeColor,
            fillColor: fillColor,
            insert: false,
        });
        // Transform the handle a bit so it doesn't get squished when the selection box is scaled.
        circle.applyMatrix = false;
        circle.scaling.x = 1/this.transform.scaleX;
        circle.scaling.y = 1/this.transform.scaleY;
        circle.data.handleType = type;
        circle.data.handleEdge = name;
        return circle;
    }

    _generateRotationHotspot (cornerName) {
        var r = paper.Selection.ROTATION_HOTSPOT_RADIUS / paper.view.zoom;
        var hotspot = new paper.Path([
            new paper.Point(0,0),
            new paper.Point(0, r),
            new paper.Point(r, r),
            new paper.Point(r, -r),
            new paper.Point(-r, -r),
            new paper.Point(-r, 0),
        ]);
        hotspot.fillColor = paper.Selection.ROTATION_HOTSPOT_FILLCOLOR;
        hotspot.position.x = this._bounds[cornerName].x;
        hotspot.position.y = this._bounds[cornerName].y;
        hotspot.rotate({
            'topRight': 0,
            'bottomRight': 90,
            'bottomLeft': 180,
            'topLeft': 270,
        }[cornerName]);
        if(this.transform.scaleX < 0) hotspot.scaling.x = -1;
        if(this.transform.scaleY < 0) hotspot.scaling.y = -1;
        hotspot.data.handleType = 'rotation';
        hotspot.data.handleEdge = cornerName;

        // Transform the hotspots a bit so they doesn't get squished when the selection box is scaled.
        hotspot.scaling.x = 1/this.transform.scaleX;
        hotspot.scaling.y = 1/this.transform.scaleY;

        return hotspot;
    }
}

paper.PaperScope.inject({
  Selection: paper.Selection,
});
