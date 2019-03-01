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

import React from 'react';
import ReactGA from 'react-ga';

import './_editor.scss';

import 'bootstrap/dist/css/bootstrap.min.css';
import HTML5Backend from 'react-dnd-html5-backend'
import { DragDropContext } from "react-dnd";
import 'react-reflex/styles.css'
import { ReflexContainer, ReflexSplitter, ReflexElement } from 'react-reflex'
import { throttle } from 'underscore';
import { HotKeys } from 'react-hotkeys';
import Dropzone from 'react-dropzone';
import localForage from 'localforage';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Slide } from 'react-toastify';

import HotKeyInterface from './hotKeyMap';
import ActionMapInterface from './actionMap';
import UndoRedo from './UndoRedo';
import EditorCore from './EditorCore';

import DockedPanel from './Panels/DockedPanel/DockedPanel';
import ModalHandler from './Modals/ModalHandler/ModalHandler';
import Canvas from './Panels/Canvas/Canvas';
import Inspector from './Panels/Inspector/Inspector';
import MenuBar from './Panels/MenuBar/MenuBar';
import Timeline from './Panels/Timeline/Timeline';
import CanvasTransforms from './Panels/CanvasTransforms/CanvasTransforms';
import Toolbox from './Panels/Toolbox/Toolbox';
import AssetLibrary from './Panels/AssetLibrary/AssetLibrary';
import PopOutCodeEditor from './PopOuts/PopOutCodeEditor/PopOutCodeEditor';

class Editor extends EditorCore {
  constructor () {
    super();

    // History (undo/redo stacks)
    this.history = new UndoRedo(this);

    // "Live" editor states
    this.project = null;
    this.paper = null;

    // GUI state
    this.state = {
      project: null,
      activeTool: 'cursor',
      toolSettings: {
        fillColor: '#000',
        strokeColor: '#000',
        strokeWidth: 1,
        brushSize: 10,
        eraserSize: 10,
        brushSmoothing: 0.9,
        brushSmoothness: 10,
        cornerRadius: 0,
        pressureEnabled: false,
        sizeJump: 5,
        pixelDropper: true,
        fontSize: 20,
        fontFamily: 'Nunito',
        selectPoints: false,
        selectCurves: false,
      },
      selectionAttributes: {},
      previewPlaying: false,
      activeModalName: null,
      activeModalQueue: [],
      codeEditorOpen: false,
      codeErrors: [],
      inspectorSize: 250,
      timelineSize: 100,
      assetLibrarySize: 150,
    };

    this.toolRestrictions = this.getToolRestrictions();

    // Set up error.
    this.error = null;

    // Init hotkeys
    this.hotKeyInterface = new HotKeyInterface(this);

    // Init actions
    this.actionMapInterface = new ActionMapInterface(this);

    // Resizable panels
    this.RESIZE_THROTTLE_AMOUNT_MS = 10;
    this.WINDOW_RESIZE_THROTTLE_AMOUNT_MS = 300;
    this.resizeProps = {
      onStopResize: throttle(this.onStopResize, this.resizeThrottleAmount),
      onStopInspectorResize: throttle(this.onStopInspectorResize, this.resizeThrottleAmount),
      onStopAssetLibraryResize: throttle(this.onStopAssetLibraryResize, this.resizeThrottleAmount),
      onStopTimelineResize: throttle(this.onStopTimelineResize, this.resizeThrottleAmount),
      onStopCodeEditorResize: throttle(this.onStopCodeEditorResize, this.resizeThrottleAmount),
      onResize: throttle(this.onResize, this.resizeThrottleAmount),
      onWindowResize: throttle(this.onWindowResize, this.windowResizeThrottleAmount),
    };
    window.addEventListener("resize", this.resizeProps.onWindowResize);

    // Save the project state before preview playing so we can retrieve it later
    this.beforePreviewPlayProjectState = null;

    // Lock state flag
    this.lockState = false;

    // Auto Save
    this.autoSaveDelay = 1000; // millisecond delay
    this.throttledAutoSaveProject = throttle(this.autoSaveProject, this.autoSaveDelay);

    this.timelineComponent = null;
  }

  getToolRestrictions = () => {
    return {
      strokeWidth: {
        min: 0,
        max: 100,
        step: 1,
      },
      brushSize: {
        min: 2,
        max: 30,
        step: 1,
      },
      eraserSize: {
        min: 0,
        max: 100,
        step: 1,
      },
      brushSmoothing: {
        min: 0,
        max: 100,
        step: 1,
      },
      opacity: {
        min: 0,
        max: 1,
        step: .01,
      },
      cornerRadius: {
        min: 0,
        max: 100,
        step: 1,
      },
      fontSize: {
        min: 0,
        max: 1000,
        step: 1,
      },
      zoomPercentage: {
        min: 10,
        max: 2000,
        step: 25,
      }
    }
  }

  componentWillMount = () => {
    ReactGA.initialize('UA-88233944-1');
    ReactGA.pageview('alpha.wickeditor.com/');
    // Initialize "live" engine state
    this.project = new window.Wick.Project();
    this.paper = window.paper;
    this.history.saveState();

    // Initialize local storage
    localForage.config({
      name        : 'WickEditor',
      description : 'Live Data storage of the Wick Editor app.'
    });
    this.autoSaveKey = "wickEditorAutosave";

    // Setup the initial project state
    this.setState({
      ...this.state,
      project: this.project.serialize(),
      codeEditorWindowProperties: this.getDefaultCodeEditorProperties(),
    });

    // Leave Page warning.
    window.onbeforeunload = function(event) {
      var confirmationMessage = 'Warning: All unsaved changes will be lost!';
      (event || window.event).returnValue = confirmationMessage; //Gecko + IE
      return confirmationMessage; //Gecko + Webkit, Safari, Chrome etc.
    };
  }

  componentDidMount = () => {
    this.refocusEditor();
    this.showAutosavedProjects();
  }

  componentDidUpdate = (prevProps, prevState) => {
    if(this.state.previewPlaying && !prevState.previewPlaying) {
      this.beforePreviewPlayProjectState = this.project.serialize();
      this.project.play({
        onError: (error) => {
          this.stopPreviewPlaying(error)
        },
        onAfterTick: () => {
          this.timelineComponent.updateTimeline();
        },
        onBeforeTick: () => {

        },
      });
    }

    if(!this.state.previewPlaying && prevState.previewPlaying) {
      this.project.stop();
      this.project = window.Wick.Project.deserialize(this.beforePreviewPlayProjectState);
      this.setState({
        project: this.beforePreviewPlayProjectState,
      });
    }
  }

//

  showAutosavedProjects = () => {
    this.doesAutoSavedProjectExist(bool => { if (bool) {
      this.queueModal('AutosaveWarning');
      }
    });
  }

  /**
   * Resets the editor in preparation for a project load.
   */
  resetEditorForLoad = () => {
    this.history.clearHistory();
  }

  /**
   * Autosave the project in the state, if it exists.
   * @param {object} serializedProject - The data of the project to load into localforage.
   */
  autoSaveProject = (serializedProject) => {
    if (!serializedProject) return;
    localForage.setItem(this.autoSaveKey, serializedProject);
  }

  onWindowResize = () => {
    // Ensure that all elements resize on window resize.
    this.resizeProps.onResize();

    // reset the code window if we resize the window.
    this.setState({
      codeEditorWindowProperties: this.getDefaultCodeEditorProperties(),
    });
  }

  getDefaultCodeEditorProperties = () => {
    return (
      {
        width: 500,
        height: 250,
        x: window.innerWidth/2 - 250,
        y: window.innerHeight/2 - 125,
        minWidth: 300,
        minHeight: 250,
      }
    );
  }

  onResize = (e) => {
    this.project.view.resize();
    window.AnimationTimeline.resize();
  }

  onStopResize = ({domElement, component}) => {

  }

  getSizeHorizontal = (domElement) => {
    return domElement.offsetWidth;
  }

  getSizeVertical = (domElement) => {
    return domElement.offsetHeight;
  }

  /**
   * Updates the code editor properties in the state.
   * @param  {object} newProperties object with new code editor properties. Can include width, height, x, y.
   */
  updateCodeEditorWindowProperties = (newProperties) => {
    let finalProperties = this.state.codeEditorWindowProperties;
    Object.keys(newProperties).forEach(key => {
      finalProperties[key] = newProperties[key];
    });

    this.setState({
      codeEditorWindowProperties: finalProperties,
    });
  }

  /**
   * Removes all code errors.
   */
  removeCodeErrors = () => {
    this.setState({
      codeErrors: [],
    });
  }

  /**
   * An event called when a minor code update happens as defined by the code editor.
   */
  onMinorScriptUpdate = () => {
    if (this.state.codeErrors.length > 0) {
      this.removeCodeErrors();
    }
  }

  /**
   * An event called when a major code update happens as defined by the code editor.
   * @return {[type]} [description]
   */
  onMajorScriptUpdate = () => {

  }

  /**
   * Called when the inspector is resized.
   * @param  {DomElement} domElement DOM element containing the inspector
   * @param  {React.Component} component  React component of the inspector.
   */
  onStopInspectorResize = ({domElement, component}) => {
    this.setState({
      inspectorSize: this.getSizeHorizontal(domElement)
    });
  }

  /**
   * Called when the asset library is resized.
   * @param  {DomElement} domElement DOM element containing the asset library
   * @param  {React.Component} component  React component of the asset library
   */
  onStopAssetLibraryResize = ({domElement, component}) => {
    this.setState({
      assetLibrarySize: this.getSizeVertical(domElement)
    });
  }

  /**
   * Called when the timeline is resized.
   * @param  {DomElement} domElement DOM element containing the timeline
   * @param  {React.Component} component  React component of the timeline.
   */
  onStopTimelineResize = ({domElement, component}) => {
    var size = this.getSizeVertical(domElement);

    this.setState({
      timelineSize: size
    });
  }

  /**
   * Opens the requested modal.
   * @param  {string} name name of the modal to open.
   */
  openModal = (name) => {
    this.setState({
      activeModalName: name,
    });
    this.refocusEditor();
  }

  /**
   * Queues a modal to be opened at the next opportunity.
   * @param  {string} name [description]
   */
  queueModal = (name) => {
    if (this.state.activeModalName !== name) {
      // If there is another modal up, queue the modal.
      if (this.state.activeModalName !== null && this.state.activeModalQueue.indexOf(name) === -1) {
        this.setState(prevState => {
          return {
            activeModalQueue: [name].concat(prevState.activeModalQueue),
          }
        });
      // Otherwise, just open it.
      } else {
        this.openModal(name)
      }
    }
  }

  /**
   * Closes the active modal, if there is one. Opens the next modal in the
   * if necessary.
   */
  closeActiveModal = () => {
    let oldQueue = [].concat(this.state.activeModalQueue);
    if (oldQueue.length === 0) {
      this.openModal(null);
      return;
    }
    var newModalName = oldQueue.shift();
    this.setState({
      activeModalQueue: oldQueue,
    }, () => this.openModal(newModalName));
  }

  /**
   * Opens and closes the code editor depending on the state of the codeEditor.
   */
  toggleCodeEditor = () => {
    this.setState( {
      codeEditorOpen: !this.state.codeEditorOpen,
    })
  }

  /**
   * Focus the editor DOM element.
   */
  refocusEditor = () => {
    window.document.getElementById('hotkeys-container').focus();
  }

  /**
   * Toggles the preview play between on and off states.
   */
  togglePreviewPlaying = () => {
    let nextState = !this.state.previewPlaying;
    this.setState({
      previewPlaying: nextState,
      codeErrors: [],
    });

    if(nextState) {
      // Focus canvas element here
    }
  }

  /**
   * Stops the project if it is currently preview playing and displays provided
   * errors in the code editor.
   * @param  {object[]} errors Array of error objects.
   */
  stopPreviewPlaying = (errors) => {
    this.stopTickLoop();
    this.setState({
      previewPlaying: false,
      codeErrors: errors === undefined ? [] : errors,
    });

    if (errors) {
      this.showCodeErrors(errors);
    }
  }

  /**
   * Show code errors in the code editor by pooping it up.
   * @param  {object[]} errors Array of error objects.
   */
  showCodeErrors = (errors) => {
    this.setState({
      codeEditorOpen: errors === undefined ? this.state.codeEditorOpen : true,
    });

    if (errors.length > 0) {
      let uuid = errors[0].uuid;
      this.selectObject(this.project.getChildByUUID(uuid))
    }
  }

  /**
   * Signals to React that the "live" project changed, so that all components
   * displaying info about the project will render.
   * @param {boolean} skipHistory If true, the new project state will not be
   * saved to the undo/redo stacks.
   */
  projectDidChange = (skipHistory) => {
    // Double check to see if the project was really changed
    // (This shouldn't be neccessary, but AnimationTimeline was firing multiple
    // projectDidChange calls.)
    let projectSerialized = this.project.serialize();
    if(JSON.stringify(this.state.project) !== JSON.stringify(projectSerialized)) {
      if(!skipHistory) {
        this.history.saveState();
        this.autosaveProject(projectSerialized);
      }
    }
    this.setState({
      project: projectSerialized,
      selectionAttributes: this.getAllSelectionAttributes(),
    });
  }

  /**
   * Create a toast notification.
   * @param {string} message - the message to display inside the toast.
   * @param {string} type - the type of the toast. ("info", "success", "warning", or "error". See react-toastify docs for more info)
   * @param {object} options - the options for the toast notification. For all options, see the demo for react-toastify: https://fkhadra.github.io/react-toastify/
   */
  toast = (message, type, options) => {
    if(!message) {
      console.error("toast() requires a message.");
      return;
    }

    // If no type is given, default to "info"
    if(!type) type = "info";

    if(["info", "success", "warning", "error"].indexOf(type) === -1) {
      console.error("toast(): Invalid type: " + type);
      return;
    }

    // If no options are given, set the options param to an empty object so only the default options are used.
    if(!options) options = {};

    // Default options for the toast:
    let defaultOptions = {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    };

    // Mix default options and options param:
    let mixOptions = Object.assign(defaultOptions, options);

    toast[type](message, mixOptions);
  }

  render = () => {
    // Create some references to the project and editor to make debugging in the console easier:
    window.project = this.project;
    window.editor = this;

    return (
    <Dropzone
      accept={window.Wick.Asset.getValidExtensions()}
      onDrop={(accepted, rejected) => this.createAssets(accepted, rejected)}
      disableClick
    >
    {/*TODO: Check the onClick event */}
      {({getRootProps, getInputProps, open}) => (
        <div {...getRootProps()}>
          <ToastContainer
           transition={Slide}
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnVisibilityChange
            draggable
            pauseOnHover
          />
          <input {...getInputProps()} />
            <HotKeys
              keyMap={this.state.previewPlaying ? this.hotKeyInterface.getEssentialKeyMap() : this.hotKeyInterface.getKeyMap()}
              handlers={this.state.previewPlaying ? this.hotKeyInterface.getEssentialKeyHandlers() : this.hotKeyInterface.getHandlers()}
              style={{width:"100%", height:"100%"}}
              id='hotkeys-container'>
              <div id="editor">
                <div id="menu-bar-container">
                  <ModalHandler
                    activeModalName={this.state.activeModalName}
                    openModal={this.openModal}
                    closeActiveModal={this.closeActiveModal}
                    project={this.project}
                    createSymbolFromSelection={this.createSymbolFromSelection}
                    updateProjectSettings={this.updateProjectSettings}
                    loadAutosavedProject={this.attemptAutoLoad}
                  />
                  {/* Header */}
                  <DockedPanel showOverlay={this.state.previewPlaying}>
                    <MenuBar
                      openModal={this.openModal}
                      projectName={this.project.name}
                      exportProjectAsWickFile={this.exportProjectAsWickFile}
                      importProjectAsWickFile={this.importProjectAsWickFile}
                      exportProjectAsAnimatedGIF={this.exportProjectAsAnimatedGIF}
                      exportProjectAsStandaloneZIP={this.exportProjectAsStandaloneZIP}
                    />
                  </DockedPanel>
                </div>
                <div id="editor-body">
                  <div id="flexible-container">
                    {/*App*/}
                    <ReflexContainer windowResizeAware={true} orientation="vertical">
                      {/* Middle Panel */}
                      <ReflexElement {...this.resizeProps}>
                        <ReflexContainer windowResizeAware={true} orientation="horizontal">
                          {/*Toolbox*/}
                          <ReflexElement
                            size={40}
                            minSize={40}>
                            <DockedPanel showOverlay={this.state.previewPlaying}>
                              <Toolbox
                                activeTool={this.state.activeTool}
                                setActiveTool={this.setActiveTool}
                                toolSettings={this.state.toolSettings}
                                setToolSettings={this.setToolSettings}
                                toolRestrictions={this.toolRestrictions}
                                previewPlaying={this.state.previewPlaying}
                                undoAction={this.undoAction}
                                redoAction={this.redoAction}
                                copyAction={this.copySelectionToClipboard}
                                pasteAction={this.pasteFromClipboard}
                                deleteAction={this.deleteSelectedObjects}
                              />

                            </DockedPanel>
                          </ReflexElement>
                          {/*Canvas*/}
                          <ReflexElement {...this.resizeProps}>
                            <DockedPanel>
                              <Canvas
                                project={this.project}
                                projectDidChange={this.projectDidChange}
                                projectData={this.state.project}
                                paper={this.paper}
                                activeTool={this.state.activeTool}
                                toolSettings={this.state.toolSettings}
                                previewPlaying={this.state.previewPlaying}
                                createImageFromAsset={this.createImageFromAsset}
                                toast={this.toast}
                              />
                              <CanvasTransforms
                                onionSkinEnabled={this.project.onionSkinEnabled}
                                toggleOnionSkin={this.toggleOnionSkin}
                                zoomIn={this.zoomIn}
                                zoomOut={this.zoomOut}
                                recenterCanvas={this.recenterCanvas}
                                activeTool={this.state.activeTool}
                                setActiveTool={this.setActiveTool}
                                previewPlaying={this.state.previewPlaying}
                                togglePreviewPlaying={this.togglePreviewPlaying}
                              />
                            </DockedPanel>
                          </ReflexElement>
                          <ReflexSplitter {...this.resizeProps}/>
                          {/*Timeline*/}
                          <ReflexElement
                            minSize={100}
                            size={this.state.timelineSize}
                            onResize={this.resizeProps.onResize}
                            onStopResize={this.resizeProps.onStopTimelineResize}>
                            <DockedPanel  showOverlay={this.state.previewPlaying}>
                              <Timeline
                                project={this.project}
                                projectDidChange={this.projectDidChange}
                                projectData={this.state.project}
                                getSelectedTimelineObjects={this.getSelectedTimelineObjects}
                                selectObjects={this.selectObjects}
                                setOnionSkinOptions={this.setOnionSkinOptions}
                                getOnionSkinOptions={this.getOnionSkinOptions}
                                setFocusObject={this.setFocusObject}
                                onRef={ref => this.timelineComponent = ref}
                              />
                            </DockedPanel>
                          </ReflexElement>
                        </ReflexContainer>
                      </ReflexElement>

                      <ReflexSplitter {...this.resizeProps}/>

                      {/* Right Sidebar */}
                      <ReflexElement
                        size={250}
                        maxSize={300} minSize={200}
                        onResize={this.resizeProps.onResize}
                        onStopResize={this.resizeProps.onStopInspectorResize}>
                        <ReflexContainer windowResizeAware={true} orientation="horizontal">
                          {/* Inspector */}
                          <ReflexElement {...this.resizeProps}>
                            <DockedPanel showOverlay={this.state.previewPlaying}>
                              <Inspector
                                toolRestrictions={this.toolRestrictions}
                                getToolSettings={this.getToolSettings}
                                setToolSettings={this.setToolSettings}
                                getSelectionType={this.getSelectionType}
                                getAllSoundAssets={this.getAllSoundAssets}
                                selectionAttributes={this.state.selectionAttributes}
                                setSelectionAttribute={this.setSelectionAttribute}
                                editorActions={this.actionMapInterface.editorActions}
                              />
                            </DockedPanel>
                          </ReflexElement>

                          <ReflexSplitter {...this.resizeProps}/>

                          {/* Asset Library */}
                          <ReflexElement
                            minSize={100}
                            size={this.state.assetLibrarySize}
                            onResize={this.resizeProps.onResize}
                            onStopResize={this.resizeProps.onStopAssetLibraryResize}>
                            <DockedPanel showOverlay={this.state.previewPlaying}>
                              <AssetLibrary
                                projectData={this.state.project}
                                assets={this.project.getAssets()}
                                openFileDialog={() => open()}
                                selectObjects={this.selectObjects}
                                isObjectSelected={this.isObjectSelected}
                              />
                            </DockedPanel>
                          </ReflexElement>
                        </ReflexContainer>
                      </ReflexElement>
                    </ReflexContainer>
                  </div>
                </div>
              </div>
            </HotKeys>
          {this.state.codeEditorOpen &&
            <PopOutCodeEditor
              codeEditorWindowProperties={this.state.codeEditorWindowProperties}
              updateCodeEditorWindowProperties={this.updateCodeEditorWindowProperties}
              selectionIsScriptable={this.selectionIsScriptable}
              getSelectionType={this.getSelectionType}
              script={this.getSelectedObjectScript()}
              toggleCodeEditor={this.toggleCodeEditor}
              errors={this.state.codeErrors}
              onMinorScriptUpdate={this.onMinorScriptUpdate}
              onMajorScriptUpdate={this.onMajorScriptUpdate}/>}
        </div>
      )}
      </Dropzone>
      )
  }
}

export default DragDropContext(HTML5Backend)(Editor)
