// ThreeJS and Third-party deps
import * as THREE from "three"
import * as dat from 'dat.gui'
import Stats from "three/examples/jsm/libs/stats.module"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

// Core boilerplate code deps
import { createCamera, createRenderer, runApp } from "./core-utils"
import { screenToWorldSpace } from "./common-utils"

global.THREE = THREE

/**************************************************
 * 0. Tweakable parameters for the scene
 *************************************************/
const params = {
  // general scene params
  fogColor: 0x000000,
  fogNear: 4,
  fogFar: 12,
  blobColor: 0x00FFFF,
  blobNumber: 100,
  blobInitialPosMultiplier: 10,
  lerpFactor: 0.05, // this param controls the speed of which the blobs move, also affects the eventual moving patterns of the blobs
  followMouse: false,
}


/**************************************************
 * 1. Initialize core threejs components
 *************************************************/
// Create the scene
let scene = new THREE.Scene()

// Create the renderer via 'createRenderer',
// 1st param receives additional WebGLRenderer properties
// 2nd param receives a custom callback to further configure the renderer
let renderer = createRenderer({ antialias: false, alpha: false }, (_renderer) => {
  // e.g. uncomment below if you want the output to be in sRGB color space
  // _renderer.outputEncoding = THREE.sRGBEncoding
})

// Create the camera
// Pass in fov, near, far and camera position respectively
let camera = createCamera(35, 1, 100, { x: 0, y: 0, z: 8 })


/**************************************************
 * 2. Build your scene in this threejs app
 * This app object needs to consist of at least the async initScene() function (it is async so the animate function can wait for initScene() to finish before being called)
 * initScene() is called after a basic threejs environment has been set up, you can add objects/lighting to you scene in initScene()
 * if your app needs to animate things(i.e. not static), include a updateScene(interval, elapsed) function in the app as well
 *************************************************/
let app = {
  async initScene() {
    this.firstObjOffset = {
      x: 0,
      y: 0
    }

    // OrbitControls
    this.controls = new OrbitControls(camera, renderer.domElement)
    this.controls.enableDamping = true

    // Uncomment to show grid helper for a concrete reference of the 3D space taken by the smoke
    // let gridHelper = new THREE.GridHelper(20, 20)
    // gridHelper.position.y = -1
    // scene.add(gridHelper)

    scene.fog = new THREE.Fog(params.fogNear, params.fogNear, params.fogFar)

    let geometry = new THREE.SphereGeometry(0.7, 24, 24)
    let material = new THREE.MeshBasicMaterial({
      color: params.blobColor
    })

    this.world = new THREE.Object3D();
    for (let i = 0; i < params.blobNumber; i++) {
      let blob = new THREE.Mesh(geometry, material)

      blob.position.x = -Math.random() * params.blobInitialPosMultiplier + Math.random() * params.blobInitialPosMultiplier
      blob.position.z = -Math.random() * params.blobInitialPosMultiplier + Math.random() * params.blobInitialPosMultiplier
      blob.position.y = -Math.random() * params.blobInitialPosMultiplier + Math.random() * params.blobInitialPosMultiplier
      let blob_scale = Math.random()
      blob.scale.set(blob_scale, blob_scale, blob_scale)
      if (i == 0) {
        // first blob acts as the movement guide of all subsequent blobs and it has a regular circular path
        // better to make it invisible because it's movement does not look random
        blob.visible = false
      }

      this.world.add(blob)
    }
    scene.add(this.world)

    // GUI controls
    const gui = new dat.GUI()
    gui.addColor(params, 'blobColor').onChange((val) => {
      material.color.set(val)
    })
    gui.add(params, "followMouse")

    // Stats - show fps
    this.stats1 = new Stats()
    this.stats1.showPanel(0) // Panel 0 = fps
    this.stats1.domElement.style.cssText = "position:absolute;top:0px;left:0px;"
    // this.container is the parent DOM element of the threejs canvas element
    this.container.appendChild(this.stats1.domElement)
  },
  // @param {number} interval - time elapsed between 2 frames
  // @param {number} elapsed - total time elapsed since app start
  updateScene(interval, elapsed) {
    this.controls.update()
    this.stats1.update()

    let first_obj = this.world.children[0]
    // to make the smoke follow our mouse, we need to transform the mouse's screen coordiantes into world space coordinates
    let mouseWorldSpace = screenToWorldSpace({ ...this.uniforms.u_mouse.value, z: 0 }, camera)
    let offset = {
      x: params.followMouse ? mouseWorldSpace.x : 0,
      y: params.followMouse ? mouseWorldSpace.y : 0,
    }
    // the first blob has a regular circular path (x y positions are calculated using the parametric function for a circle)
    first_obj.position.set(
      offset.x + Math.cos(elapsed * 2.0),
      offset.y + Math.sin(elapsed * 2.0),
      Math.sin(elapsed * 2.0)
    )

    for (let i = 0, l = this.world.children.length; i < l; i++) {
      var object = this.world.children[i]
      var object_left = this.world.children[i - 1]
      if (i >= 1) {
        // position of each blob is calculated by the cos/sin function of its previous blob's slightly scaled up position
        // such that each blob is has x, y and z coordinates inside -1 and 1, while a pseudo-randomness of positions is achieved
        // adding in the offset in case the 'followMouse' is toggled on (it is {x: 0, y: 0} when 'followMouse' is off)
        // here I'm using the built-in lerp function with a small enough interpolation factor which is just right to help produce the pseudo-randomness
        // it involves a bit of experimentation to get the feel right
        object.position.lerp(
          new THREE.Vector3(
            offset.x + Math.cos(object_left.position.x * 3),
            offset.y + Math.sin(object_left.position.y * 3),
            Math.cos(object_left.position.z * 3),
          ), params.lerpFactor
        )
      }
    }
  }
}

/**************************************************
 * 3. Run the app
 * 'runApp' will do most of the boilerplate setup code for you:
 * e.g. HTML container, window resize listener, mouse move/touch listener for shader uniforms, THREE.Clock() for animation
 * Executing this line puts everything together and runs the app
 * ps. if you don't use custom shaders, pass undefined to the 'uniforms'(2nd-last) param
 * ps. if you don't use post-processing, pass undefined to the 'composer'(last) param
 *************************************************/
runApp(app, scene, renderer, camera, true, undefined, undefined)
