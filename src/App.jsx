/*
 * Copyright 2018 WICKLETS LLC
 *
 * This file is part of Wick Editor.
 *
 * Wick Editor is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Wick Editor is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Wick Editor.  If not, see <https://www.gnu.org/licenses/>.
 */

import React, { Component } from 'react';

class App extends Component {
  constructor () {
    super();

    this._wickProject = null;
    this._wickCanvas = null;
    this._canvasContainer = null;

    // State
    this.state = {
      onionSkinEnabled: false,
      onionSkinSeekForwards: 1,
      onionSkinSeekBackwards: 1,
      activeTool: 'cursor',
      toolSettings: {
        fillColor: '#ffaabb',
        strokeColor: '#000',
        strokeWidth: 1,
        brushSize: 10,
        brushSmoothing: 0.9,
        brushSmoothness: 10,
        cornerRadius: 0,
        pressureEnabled: false,
      },
      previewPlaying: false,
      selection: {
        uuids: [],
        name: '',
        filename: '',
        src: '',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        scaleW: 0,
        scaleH: 0,
        rotation: 0,
        opacity: 0,
        strokeWidth: 0,
        fillColor: '#000000',
        strokeColor: '#000000',
      },
    };
    this.setStateWrapper = this.setStateWrapper.bind(this);
  }

  componentWillMount () {
    this._wickProject = new window.Wick.Project();
    this._wickCanvas = new window.Wick.Canvas();
    this._canvasContainer = window.document.createElement('div');
    window.Wick.Canvas.setup(this._canvasContainer);
    window.Wick.Canvas.resize();

    window.paper.view.zoom = 1;
    window.paper.view.center = new window.paper.Point(
      this._wickProject.width/2,
      this._wickProject.height/2
    );
  }

  componentDidMount () {

  }

  componentDidUpdate (prevProps, prevState) {
    // Update paper.js tool and tool options

    // Update preview play tick loop

    // Update wick project based on state

    console.log(prevState);
    console.log(this.state);
  }

  setStateWrapper (state) {
    // Push project and selection to history

    // Clear selection if tool changed from cursor

    // Rerender wick canvas

    // Update paper.js selection

    this.setState(state);
  }

  render () {
    return (
      <div onClick={() => {
        this.setStateWrapper({
          ...this.state,
          selection: {
            ...this.selection,
            uuids: ['foo', 'bar']
          },
        });
      }}>wow</div>
    );
  }
}

export default App
